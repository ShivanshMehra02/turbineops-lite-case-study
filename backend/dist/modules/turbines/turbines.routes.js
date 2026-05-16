import { Router } from 'express';
import { prisma } from '../../db/prisma';
import { asyncHandler } from '../../utils/async-handler';
import { parseBody } from '../../validators/helpers';
import { createTurbineBodySchema } from '../../validators/turbines.validator';
export const turbinesRouter = Router();
turbinesRouter.get('/', asyncHandler(async (_req, res) => {
    const data = await prisma.turbine.findMany({ take: 50 });
    res.json(data);
}));
turbinesRouter.post('/', asyncHandler(async (req, res) => {
    const body = parseBody(createTurbineBodySchema, req.body);
    const t = await prisma.turbine.create({
        data: {
            name: body.name,
            manufacturer: body.manufacturer,
            mwRating: body.mwRating,
            lat: body.lat,
            lng: body.lng,
        },
    });
    res.status(201).json(t);
}));
