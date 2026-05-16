import type { MongoClient } from 'mongodb';
import { prisma } from '../db/prisma';
import type { GraphQLContext } from './context';
import { ensurePermission } from './guards';
import { generateRepairPlanForInspection } from '../services/repair-plan.service';

export function buildResolvers(deps: {
  mongoClient: MongoClient | null;
  mongoDbName: string;
  notifyPlan: (inspectionId: string) => void;
}) {
  return {
    Query: {
      inspection: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
        ensurePermission(ctx, 'read');
        return prisma.inspection.findUnique({
          where: { id: args.id },
          include: { turbine: true, findings: true, repairPlan: true },
        });
      },
      repairPlan: async (_: unknown, args: { inspectionId: string }, ctx: GraphQLContext) => {
        ensurePermission(ctx, 'read');
        return prisma.repairPlan.findUnique({ where: { inspectionId: args.inspectionId } });
      },
    },
    Mutation: {
      generateRepairPlan: async (_: unknown, args: { inspectionId: string }, ctx: GraphQLContext) => {
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
