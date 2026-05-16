import { Prisma } from '@prisma/client';
import { HttpError } from '../utils/errors';
import { buildRepairPlanSnapshotV1, parseRepairPlanSnapshot, priorityFromMaxSeverity, } from '../utils/repair-plan-logic';
const MONGO_AUDIT_COLLECTION = 'repair_plan_audit';
async function appendRepairPlanMongoAudit(deps, doc) {
    try {
        if (!deps.mongoClient)
            return;
        await deps.mongoClient.db(deps.mongoDbName).collection(MONGO_AUDIT_COLLECTION).insertOne({
            ...doc,
            recordedAt: new Date(),
        });
    }
    catch {
        // Mongo is non-authoritative — never fail PostgreSQL workflow
    }
}
export async function findRepairPlanByInspectionId(db, inspectionId) {
    return db.repairPlan.findUnique({ where: { inspectionId } });
}
export async function getRepairPlanByInspectionId(db, inspectionId) {
    const row = await findRepairPlanByInspectionId(db, inspectionId);
    if (!row)
        throw new HttpError(404, 'Repair plan not found for this inspection', 'NOT_FOUND');
    return row;
}
/** Extracts summary helpers for REST/GraphQL presentation layers. */
export function repairPlanPresentation(plan) {
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
export async function generateRepairPlanForInspection(db, inspectionId, deps) {
    const inspection = await db.inspection.findUnique({
        where: { id: inspectionId },
        include: { findings: true },
    });
    if (!inspection)
        throw new HttpError(404, 'Inspection not found', 'NOT_FOUND');
    const snapshot = buildRepairPlanSnapshotV1(inspection.findings);
    const priority = priorityFromMaxSeverity(snapshot.summary.maxSeverity);
    const totalEstimatedCost = snapshot.summary.totalEstimatedCost;
    const jsonSnapshot = snapshot;
    let plan;
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
    }
    catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
            plan = await db.repairPlan.update({
                where: { inspectionId },
                data: {
                    priority,
                    totalEstimatedCost,
                    snapshotJson: jsonSnapshot,
                },
            });
        }
        else {
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
