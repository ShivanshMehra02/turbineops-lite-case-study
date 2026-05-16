import type { PrismaClient, Priority } from '@prisma/client';
import type { MongoClient } from 'mongodb';

export type RepairPlanDeps = {
  mongoClient: MongoClient | null;
  mongoDbName: string;
  notifyPlan: (inspectionId: string) => void;
};

/**
 * Encapsulates repair plan generation so REST (future) and GraphQL share one implementation.
 */
export async function generateRepairPlanForInspection(
  db: PrismaClient,
  inspectionId: string,
  deps: RepairPlanDeps,
) {
  const inspection = await db.inspection.findUnique({
    where: { id: inspectionId },
    include: { findings: true },
  });
  if (!inspection) throw new Error('Inspection not found');

  const adjusted = inspection.findings.map((f) => {
    const hasCrack = (f.notes || '').toLowerCase().includes('crack');
    const severity =
      f.category === 'BLADE_DAMAGE' && hasCrack ? Math.max(4, f.severity) : f.severity;
    return { ...f, severity };
  });

  const total = adjusted.reduce((s, f) => s + Number(f.estimatedCost || 0), 0);
  const maxSeverity = Math.max(0, ...adjusted.map((f) => f.severity));
  const priority: Priority =
    maxSeverity >= 5 ? 'HIGH' : maxSeverity >= 3 ? 'MEDIUM' : 'LOW';

  const plan = await db.repairPlan.upsert({
    where: { inspectionId },
    update: {
      priority,
      totalEstimatedCost: total,
      snapshotJson: adjusted,
    },
    create: {
      inspectionId,
      priority,
      totalEstimatedCost: total,
      snapshotJson: adjusted,
    },
  });

  deps.notifyPlan(inspectionId);

  try {
    if (deps.mongoClient) {
      const mongoDb = deps.mongoClient.db(deps.mongoDbName);
      await mongoDb.collection('ingestion_logs').insertOne({
        kind: 'PLAN_GENERATED',
        inspectionId,
        at: new Date(),
        total,
        priority,
      });
    }
  } catch {
    // best-effort logging only
  }

  return plan;
}
