import { Router } from 'express';
import { prisma } from '../../db/prisma';
import { requirePermission } from '../../middleware/require-permission';
import {
  createTurbine,
  deleteTurbine,
  getTurbineById,
  listTurbines,
  updateTurbine,
} from '../../services/turbine.service';
import { asyncHandler } from '../../utils/async-handler';
import { DEFAULT_LIMIT, DEFAULT_PAGE } from '../../utils/pagination';
import { parseBody, parseParams, parseQuery } from '../../validators/helpers';
import {
  turbineCreateBodySchema,
  turbineIdParamsSchema,
  turbineListQuerySchema,
  turbineUpdateBodySchema,
} from '../../validators/turbines.validator';

export const turbinesRouter = Router();

turbinesRouter.get(
  '/',
  requirePermission('read'),
  asyncHandler(async (req, res) => {
    const query = parseQuery(turbineListQuerySchema, req.query);
    const result = await listTurbines(prisma, {
      page: query.page ?? DEFAULT_PAGE,
      limit: query.limit ?? DEFAULT_LIMIT,
      name: query.name,
    });
    res.json(result);
  }),
);

turbinesRouter.get(
  '/:id',
  requirePermission('read'),
  asyncHandler(async (req, res) => {
    const { id } = parseParams(turbineIdParamsSchema, req.params);
    const row = await getTurbineById(prisma, id);
    res.json(row);
  }),
);

turbinesRouter.post(
  '/',
  requirePermission('write'),
  asyncHandler(async (req, res) => {
    const body = parseBody(turbineCreateBodySchema, req.body);
    const row = await createTurbine(prisma, body);
    res.status(201).json(row);
  }),
);

turbinesRouter.patch(
  '/:id',
  requirePermission('write'),
  asyncHandler(async (req, res) => {
    const { id } = parseParams(turbineIdParamsSchema, req.params);
    const body = parseBody(turbineUpdateBodySchema, req.body);
    const row = await updateTurbine(prisma, id, body);
    res.json(row);
  }),
);

turbinesRouter.delete(
  '/:id',
  requirePermission('admin'),
  asyncHandler(async (req, res) => {
    const { id } = parseParams(turbineIdParamsSchema, req.params);
    await deleteTurbine(prisma, id);
    res.status(204).send();
  }),
);
