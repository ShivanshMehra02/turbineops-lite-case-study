import { prisma } from '../db/prisma';
import { generateRepairPlanForInspection } from '../services/repair-plan.service';
export function buildResolvers(deps) {
    return {
        Query: {
            inspection: async (_, { id }) => prisma.inspection.findUnique({
                where: { id },
                include: { turbine: true, findings: true, repairPlan: true },
            }),
            repairPlan: async (_, { inspectionId }) => prisma.repairPlan.findUnique({ where: { inspectionId } }),
        },
        Mutation: {
            generateRepairPlan: async (_, { inspectionId }) => generateRepairPlanForInspection(prisma, inspectionId, {
                mongoClient: deps.mongoClient,
                mongoDbName: deps.mongoDbName,
                notifyPlan: deps.notifyPlan,
            }),
        },
    };
}
