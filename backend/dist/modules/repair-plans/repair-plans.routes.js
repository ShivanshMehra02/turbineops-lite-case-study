import { Router } from 'express';
import { prisma } from '../../db/prisma';
import { requirePermission } from '../../middleware/require-permission';
import { generateRepairPlanForInspection, getRepairPlanByInspectionId, } from '../../services/repair-plan.service';
import { notifyRepairPlanGenerated } from '../events/sse.routes';
import { asyncHandler } from '../../utils/async-handler';
import { parseBody, parseParams } from '../../validators/helpers';
import { repairPlanGenerateRestSchema, repairPlanInspectionParamsSchema, } from '../../validators/repair-plan.validator';
export function createRepairPlansRouter(mongoClient, mongoDbName) {
    const router = Router();
    router.get('/by-inspection/:inspectionId', requirePermission('read'), asyncHandler(async (req, res) => {
        const { inspectionId } = parseParams(repairPlanInspectionParamsSchema, req.params);
        const row = await getRepairPlanByInspectionId(prisma, inspectionId);
        res.json(row);
    }));
    router.post('/generate', requirePermission('write'), asyncHandler(async (req, res) => {
        const body = parseBody(repairPlanGenerateRestSchema, req.body);
        const plan = await generateRepairPlanForInspection(prisma, body.inspectionId, {
            mongoClient,
            mongoDbName,
            notifyRepairPlanGenerated,
        });
        res.status(201).json(plan);
    }));
    return router;
}
