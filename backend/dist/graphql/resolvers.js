import { prisma } from '../db/prisma';
import { gqlFromService } from './http-mapper';
import { parseGraphQLInput } from './parse-graphql-input';
import { ensurePermission } from './guards';
import { generateRepairPlanForInspection } from '../services/repair-plan.service';
import { createInspection, deleteInspection, findInspectionById, listInspections, updateInspection, } from '../services/inspection.service';
import { createFinding, deleteFinding, findFindingById, listFindings, updateFinding, } from '../services/finding.service';
import { createTurbine, deleteTurbine, findTurbineById, listTurbines, updateTurbine, } from '../services/turbine.service';
import { findingCreateBodySchema, findingListGraphQLArgsSchema, findingUpdateBodySchema, } from '../validators/finding.validator';
import { inspectionCreateBodySchema, inspectionListGraphQLArgsSchema, inspectionUpdateBodySchema, } from '../validators/inspection.validator';
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
            inspections: async (_, args, ctx) => {
                ensurePermission(ctx, 'read');
                const parsed = parseGraphQLInput(inspectionListGraphQLArgsSchema, args);
                const page = Math.max(1, parsed.page ?? DEFAULT_PAGE);
                const limit = Math.min(MAX_LIMIT, Math.max(1, parsed.limit ?? DEFAULT_LIMIT));
                return listInspections(prisma, {
                    page,
                    limit,
                    turbineId: parsed.turbineId,
                    dateFrom: parsed.dateFrom,
                    dateTo: parsed.dateTo,
                    dataSource: parsed.dataSource,
                });
            },
            inspection: async (_, args, ctx) => {
                ensurePermission(ctx, 'read');
                return findInspectionById(prisma, args.id);
            },
            findings: async (_, args, ctx) => {
                ensurePermission(ctx, 'read');
                const parsed = parseGraphQLInput(findingListGraphQLArgsSchema, args);
                const page = Math.max(1, parsed.page ?? DEFAULT_PAGE);
                const limit = Math.min(MAX_LIMIT, Math.max(1, parsed.limit ?? DEFAULT_LIMIT));
                return listFindings(prisma, {
                    page,
                    limit,
                    inspectionId: parsed.inspectionId,
                    category: parsed.category,
                    severity: parsed.severity,
                    notesContains: parsed.notesContains,
                });
            },
            finding: async (_, args, ctx) => {
                ensurePermission(ctx, 'read');
                return findFindingById(prisma, args.id);
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
            createInspection: async (_, args, ctx) => {
                ensurePermission(ctx, 'write');
                const input = parseGraphQLInput(inspectionCreateBodySchema, args.input);
                return gqlFromService(() => createInspection(prisma, input));
            },
            updateInspection: async (_, args, ctx) => {
                ensurePermission(ctx, 'write');
                const input = parseGraphQLInput(inspectionUpdateBodySchema, args.input);
                return gqlFromService(() => updateInspection(prisma, args.id, input));
            },
            deleteInspection: async (_, args, ctx) => {
                ensurePermission(ctx, 'admin');
                await gqlFromService(() => deleteInspection(prisma, args.id));
                return true;
            },
            createFinding: async (_, args, ctx) => {
                ensurePermission(ctx, 'write');
                const input = parseGraphQLInput(findingCreateBodySchema, args.input);
                return gqlFromService(() => createFinding(prisma, input));
            },
            updateFinding: async (_, args, ctx) => {
                ensurePermission(ctx, 'write');
                const input = parseGraphQLInput(findingUpdateBodySchema, args.input);
                return gqlFromService(() => updateFinding(prisma, args.id, input));
            },
            deleteFinding: async (_, args, ctx) => {
                ensurePermission(ctx, 'admin');
                await gqlFromService(() => deleteFinding(prisma, args.id));
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
            inspectionDay: (parent) => parent.inspectionDay.toISOString().slice(0, 10),
            turbine: async (parent, _args, ctx) => {
                ensurePermission(ctx, 'read');
                if (parent.turbine)
                    return parent.turbine;
                const row = await prisma.turbine.findUnique({ where: { id: parent.turbineId } });
                return row;
            },
            findings: async (parent, _args, ctx) => {
                ensurePermission(ctx, 'read');
                if ('findings' in parent && Array.isArray(parent.findings)) {
                    return parent.findings;
                }
                return prisma.finding.findMany({
                    where: { inspectionId: parent.id },
                    orderBy: { id: 'asc' },
                    include: { inspection: true },
                });
            },
            repairPlan: async (parent, _args, ctx) => {
                ensurePermission(ctx, 'read');
                if ('repairPlan' in parent) {
                    return parent.repairPlan;
                }
                return prisma.repairPlan.findUnique({ where: { inspectionId: parent.id } });
            },
        },
        Finding: {
            inspection: async (parent, _args, ctx) => {
                ensurePermission(ctx, 'read');
                if (parent.inspection)
                    return parent.inspection;
                const row = await prisma.inspection.findUnique({ where: { id: parent.inspectionId } });
                return row;
            },
        },
        RepairPlan: {
            createdAt: (parent) => parent.createdAt.toISOString(),
        },
    };
}
