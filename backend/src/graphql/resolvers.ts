import type { MongoClient } from 'mongodb';
import { prisma } from '../db/prisma';
import { generateRepairPlanForInspection } from '../services/repair-plan.service';

export function buildResolvers(deps: {
  mongoClient: MongoClient | null;
  mongoDbName: string;
  notifyPlan: (inspectionId: string) => void;
}) {
  return {
    Query: {
      inspection: async (_: unknown, { id }: { id: string }) =>
        prisma.inspection.findUnique({
          where: { id },
          include: { turbine: true, findings: true, repairPlan: true },
        }),
      repairPlan: async (_: unknown, { inspectionId }: { inspectionId: string }) =>
        prisma.repairPlan.findUnique({ where: { inspectionId } }),
    },
    Mutation: {
      generateRepairPlan: async (_: unknown, { inspectionId }: { inspectionId: string }) =>
        generateRepairPlanForInspection(prisma, inspectionId, {
          mongoClient: deps.mongoClient,
          mongoDbName: deps.mongoDbName,
          notifyPlan: deps.notifyPlan,
        }),
    },
  };
}
