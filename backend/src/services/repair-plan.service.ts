import { Prisma, type PrismaClient, type RepairPlan } from '@prisma/client';
import type { MongoClient } from 'mongodb';
import { HttpError } from '../utils/errors';
import {
  buildRepairPlanSnapshotV1,
  parseRepairPlanSnapshot,
  priorityFromMaxSeverity,
} from '../utils/repair-plan-logic';

export type RepairPlanGeneratedSsePayload = {
  inspectionId: string;
  repairPlanId: string;
  priority: string;
  totalEstimatedCost: number;
  generatedAt: string;
  summaryText: string;
  findingCount: number;
};

export type RepairPlanGenerationDeps = {
  mongoClient: MongoClient | null;
  mongoDbName: string;
  notifyRepairPlanGenerated: (payload: RepairPlanGeneratedSsePayload) => void;
};

const MONGO_AUDIT_COLLECTION = 'repair_plan_audit';

async function appendRepairPlanMongoAudit(
  deps: Pick<RepairPlanGenerationDeps, 'mongoClient' | 'mongoDbName'>,
  doc: Record<string, unknown>,
): Promise<void> {
  try {
    if (!deps.mongoClient) return;
    await deps.mongoClient.db(deps.mongoDbName).collection(MONGO_AUDIT_COLLECTION).insertOne({
      ...doc,
      recordedAt: new Date(),
    });
  } catch {
    // Mongo is non-authoritative — never fail PostgreSQL workflow
  }
}

export async function findRepairPlanByInspectionId(
  db: PrismaClient,
  inspectionId: string,
): Promise<RepairPlan | null> {
  return db.repairPlan.findUnique({ where: { inspectionId } });
}

export async function getRepairPlanByInspectionId(db: PrismaClient, inspectionId: string): Promise<RepairPlan> {
  const row = await findRepairPlanByInspectionId(db, inspectionId);
  if (!row) throw new HttpError(404, 'Repair plan not found for this inspection', 'NOT_FOUND');
  return row;
}

/** Extracts summary helpers for REST/GraphQL presentation layers. */
export function repairPlanPresentation(plan: RepairPlan): {
  summaryText: string;
  findingCount: number | null;
  maxSeverity: number | null;
} {
  const parsed = parseRepairPlanSnapshot(plan.snapshotJson);
  if (!parsed) {
    return {
      summaryText: 'Legacy repair plan snapshot (pre-versioned format).',
      findingCount: null,
      maxSeverity: null,
    };
  }
  return {
    summaryText: parsed.summary.text,
    findingCount: parsed.summary.findingCount,
    maxSeverity: parsed.summary.maxSeverity,
  };
}

/**
 * Builds or refreshes the single repair plan row for an inspection (`inspectionId` is unique).
 * Emits SSE + best-effort Mongo audit after PostgreSQL commit.
 */
export async function generateRepairPlanForInspection(
  db: PrismaClient,
  inspectionId: string,
  deps: RepairPlanGenerationDeps,
): Promise<RepairPlan> {
  const inspection = await db.inspection.findUnique({
    where: { id: inspectionId },
    include: { findings: true },
  });
  if (!inspection) throw new HttpError(404, 'Inspection not found', 'NOT_FOUND');

  const snapshot = buildRepairPlanSnapshotV1(inspection.findings);
  const priority = priorityFromMaxSeverity(snapshot.summary.maxSeverity);
  const totalEstimatedCost = snapshot.summary.totalEstimatedCost;

  const jsonSnapshot = snapshot as unknown as Prisma.InputJsonValue;

  let plan: RepairPlan;
  try {
    plan = await db.repairPlan.upsert({
      where: { inspectionId },
      create: {
        inspectionId,
        priority,
        totalEstimatedCost,
        snapshotJson: jsonSnapshot,
      },
      update: {
        priority,
        totalEstimatedCost,
        snapshotJson: jsonSnapshot,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      plan = await db.repairPlan.update({
        where: { inspectionId },
        data: {
          priority,
          totalEstimatedCost,
          snapshotJson: jsonSnapshot,
        },
      });
    } else {
      throw e;
    }
  }

  const generatedAt = new Date().toISOString();
  deps.notifyRepairPlanGenerated({
    inspectionId,
    repairPlanId: plan.id,
    priority,
    totalEstimatedCost,
    generatedAt,
    summaryText: snapshot.summary.text,
    findingCount: snapshot.summary.findingCount,
  });

  await appendRepairPlanMongoAudit(deps, {
    kind: 'REPAIR_PLAN_GENERATED',
    inspectionId,
    repairPlanId: plan.id,
    priority,
    totalEstimatedCost,
    findingCount: snapshot.summary.findingCount,
    maxSeverity: snapshot.summary.maxSeverity,
    summaryText: snapshot.summary.text,
    source: 'postgres',
  });

  return plan;
}
