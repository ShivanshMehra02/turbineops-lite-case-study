import { prisma } from '../db/prisma';
import { gqlFromService } from './http-mapper';
import { parseGraphQLInput } from './parse-graphql-input';
import { ensurePermission } from './guards';
import { generateRepairPlanForInspection } from '../services/repair-plan.service';
import { createTurbine, deleteTurbine, findTurbineById, listTurbines, updateTurbine, } from '../services/turbine.service';
import { turbineCreateBodySchema, turbineUpdateBodySchema, } from '../validators/turbines.validator';
import { MAX_LIMIT, DEFAULT_LIMIT, DEFAULT_PAGE } from '../utils/pagination';
export function buildResolvers(deps) {
    return {
        Query: {
            turbines: async (_, args, ctx) => {
                ensurePermission(ctx, 'read');
                const page = Math.max(1, args.page ?? DEFAULT_PAGE);
                const limit = Math.min(MAX_LIMIT, Math.max(1, args.limit ?? DEFAULT_LIMIT));
                const name = args.nameContains?.trim() || undefined;
                return listTurbines(prisma, { page, limit, name });
            },
            turbine: async (_, args, ctx) => {
                ensurePermission(ctx, 'read');
                return findTurbineById(prisma, args.id);
            },
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
            createTurbine: async (_, args, ctx) => {
                ensurePermission(ctx, 'write');
                const input = parseGraphQLInput(turbineCreateBodySchema, args.input);
                return gqlFromService(() => createTurbine(prisma, input));
            },
            updateTurbine: async (_, args, ctx) => {
                ensurePermission(ctx, 'write');
                const input = parseGraphQLInput(turbineUpdateBodySchema, args.input);
                return gqlFromService(() => updateTurbine(prisma, args.id, input));
            },
            deleteTurbine: async (_, args, ctx) => {
                ensurePermission(ctx, 'admin');
                await gqlFromService(() => deleteTurbine(prisma, args.id));
                return true;
            },
            generateRepairPlan: async (_, args, ctx) => {
                ensurePermission(ctx, 'write');
                return generateRepairPlanForInspection(prisma, args.inspectionId, {
                    mongoClient: deps.mongoClient,
                    mongoDbName: deps.mongoDbName,
                    notifyPlan: deps.notifyPlan,
                });
            },
        },
        Turbine: {
            createdAt: (parent) => parent.createdAt.toISOString(),
            updatedAt: (parent) => parent.updatedAt.toISOString(),
            inspections: async (parent, _args, ctx) => {
                ensurePermission(ctx, 'read');
                return prisma.inspection.findMany({
                    where: { turbineId: parent.id },
                    orderBy: { date: 'desc' },
                });
            },
        },
        Inspection: {
            date: (parent) => parent.date.toISOString(),
        },
        RepairPlan: {
            createdAt: (parent) => parent.createdAt.toISOString(),
        },
    };
}
