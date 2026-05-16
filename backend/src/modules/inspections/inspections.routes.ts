import { Router } from 'express';
import { prisma } from '../../db/prisma';
import { requirePermission } from '../../middleware/require-permission';
import {
  createInspection,
  deleteInspection,
  getInspectionById,
  listInspections,
  updateInspection,
} from '../../services/inspection.service';
import { asyncHandler } from '../../utils/async-handler';
import { DEFAULT_LIMIT, DEFAULT_PAGE } from '../../utils/pagination';
import { parseBody, parseParams, parseQuery } from '../../validators/helpers';
import {
  inspectionCreateRestSchema,
  inspectionIdParamsSchema,
  inspectionListRestQuerySchema,
  inspectionUpdateRestSchema,
} from '../../validators/inspection.validator';

export const inspectionsRouter = Router();

inspectionsRouter.get(
  '/',
  requirePermission('read'),
  asyncHandler(async (req, res) => {
    const query = parseQuery(inspectionListRestQuerySchema, req.query);
    const result = await listInspections(prisma, {
      page: query.page ?? DEFAULT_PAGE,
      limit: query.limit ?? DEFAULT_LIMIT,
      turbineId: query.turbineId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      dataSource: query.dataSource,
    });
    res.json(result);
  }),
);

inspectionsRouter.get(
  '/:id',
  requirePermission('read'),
  asyncHandler(async (req, res) => {
    const { id } = parseParams(inspectionIdParamsSchema, req.params);
    const row = await getInspectionById(prisma, id);
    res.json(row);
  }),
);

inspectionsRouter.post(
  '/',
  requirePermission('write'),
  asyncHandler(async (req, res) => {
    const body = parseBody(inspectionCreateRestSchema, req.body);
    const row = await createInspection(prisma, body);
    res.status(201).json(row);
  }),
);

inspectionsRouter.patch(
  '/:id',
  requirePermission('write'),
  asyncHandler(async (req, res) => {
    const { id } = parseParams(inspectionIdParamsSchema, req.params);
    const body = parseBody(inspectionUpdateRestSchema, req.body);
    const row = await updateInspection(prisma, id, body);
    res.json(row);
  }),
);

inspectionsRouter.delete(
  '/:id',
  requirePermission('admin'),
  asyncHandler(async (req, res) => {
    const { id } = parseParams(inspectionIdParamsSchema, req.params);
    await deleteInspection(prisma, id);
    res.status(204).send();
  }),
);
