import { Router } from 'express';
import { prisma } from '../../db/prisma';
import { requirePermission } from '../../middleware/require-permission';
import {
  createFinding,
  deleteFinding,
  getFindingById,
  listFindings,
  updateFinding,
} from '../../services/finding.service';
import { asyncHandler } from '../../utils/async-handler';
import { DEFAULT_LIMIT, DEFAULT_PAGE } from '../../utils/pagination';
import { parseBody, parseParams, parseQuery } from '../../validators/helpers';
import {
  findingCreateRestSchema,
  findingIdParamsSchema,
  findingListRestQuerySchema,
  findingUpdateRestSchema,
} from '../../validators/finding.validator';

export const findingsRouter = Router();

findingsRouter.get(
  '/',
  requirePermission('read'),
  asyncHandler(async (req, res) => {
    const query = parseQuery(findingListRestQuerySchema, req.query);
    const result = await listFindings(prisma, {
      page: query.page ?? DEFAULT_PAGE,
      limit: query.limit ?? DEFAULT_LIMIT,
      inspectionId: query.inspectionId,
      category: query.category,
      severity: query.severity,
      notesContains: query.notesContains,
    });
    res.json(result);
  }),
);

findingsRouter.get(
  '/:id',
  requirePermission('read'),
  asyncHandler(async (req, res) => {
    const { id } = parseParams(findingIdParamsSchema, req.params);
    const row = await getFindingById(prisma, id);
    res.json(row);
  }),
);

findingsRouter.post(
  '/',
  requirePermission('write'),
  asyncHandler(async (req, res) => {
    const body = parseBody(findingCreateRestSchema, req.body);
    const row = await createFinding(prisma, body);
    res.status(201).json(row);
  }),
);

findingsRouter.patch(
  '/:id',
  requirePermission('write'),
  asyncHandler(async (req, res) => {
    const { id } = parseParams(findingIdParamsSchema, req.params);
    const body = parseBody(findingUpdateRestSchema, req.body);
    const row = await updateFinding(prisma, id, body);
    res.json(row);
  }),
);

findingsRouter.delete(
  '/:id',
  requirePermission('admin'),
  asyncHandler(async (req, res) => {
    const { id } = parseParams(findingIdParamsSchema, req.params);
    await deleteFinding(prisma, id);
    res.status(204).send();
  }),
);
