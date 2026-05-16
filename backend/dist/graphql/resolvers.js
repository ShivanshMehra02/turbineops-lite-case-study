import { prisma } from '../db/prisma';
import { ensurePermission } from './guards';
import { generateRepairPlanForInspection } from '../services/repair-plan.service';
export function buildResolvers(deps) {
    return {
        Query: {
            inspection: async (_, args, ctx) => {
                ensurePermission(ctx, 'read');
                return prisma.inspection.findUnique({
                    where: { id: args.id },
                    include: { turbine: true, findings: true, repairPlan: true },
                });
            },
            repairPlan: async (_, args, ctx) => {
                ensurePermission(ctx, 'read');
                return prisma.repairPlan.findUnique({ where: { inspectionId: args.inspectionId } });
            },
        },
        Mutation: {
            generateRepairPlan: async (_, args, ctx) => {
                ensurePermission(ctx, 'write');
                return generateRepairPlanForInspection(prisma, args.inspectionId, {
                    mongoClient: deps.mongoClient,
                    mongoDbName: deps.mongoDbName,
                    notifyPlan: deps.notifyPlan,
                });
            },
        },
    };
}
