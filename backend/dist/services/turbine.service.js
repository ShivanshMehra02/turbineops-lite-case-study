import { Prisma } from '@prisma/client';
import { computeSkip } from '../utils/pagination';
import { HttpError } from '../utils/errors';
function buildWhere(params) {
    if (!params.name)
        return {};
    return {
        name: { contains: params.name, mode: 'insensitive' },
    };
}
export async function listTurbines(db, params) {
    const where = buildWhere(params);
    const skip = computeSkip(params.page, params.limit);
    const [items, totalCount] = await Promise.all([
        db.turbine.findMany({
            where,
            orderBy: [{ name: 'asc' }, { id: 'asc' }],
            skip,
            take: params.limit,
        }),
        db.turbine.count({ where }),
    ]);
    return {
        items,
        totalCount,
        page: params.page,
        limit: params.limit,
    };
}
/** GraphQL-friendly nullable lookup (REST uses `getTurbineById` + 404). */
export async function findTurbineById(db, id) {
    return db.turbine.findUnique({ where: { id } });
}
export async function getTurbineById(db, id) {
    const row = await findTurbineById(db, id);
    if (!row)
        throw new HttpError(404, 'Turbine not found', 'NOT_FOUND');
    return row;
}
export async function createTurbine(db, input) {
    return db.turbine.create({
        data: {
            name: input.name,
            ...(input.manufacturer !== undefined ? { manufacturer: input.manufacturer } : {}),
            ...(input.mwRating !== undefined ? { mwRating: input.mwRating } : {}),
            ...(input.lat !== undefined ? { lat: input.lat } : {}),
            ...(input.lng !== undefined ? { lng: input.lng } : {}),
        },
    });
}
export async function updateTurbine(db, id, input) {
    try {
        return await db.turbine.update({
            where: { id },
            data: {
                ...(input.name !== undefined ? { name: input.name } : {}),
                ...(input.manufacturer !== undefined ? { manufacturer: input.manufacturer } : {}),
                ...(input.mwRating !== undefined ? { mwRating: input.mwRating } : {}),
                ...(input.lat !== undefined ? { lat: input.lat } : {}),
                ...(input.lng !== undefined ? { lng: input.lng } : {}),
            },
        });
    }
    catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
            throw new HttpError(404, 'Turbine not found', 'NOT_FOUND');
        }
        throw e;
    }
}
export async function deleteTurbine(db, id) {
    try {
        await db.turbine.delete({ where: { id } });
    }
    catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError) {
            if (e.code === 'P2025')
                throw new HttpError(404, 'Turbine not found', 'NOT_FOUND');
            if (e.code === 'P2003')
                throw new HttpError(409, 'Cannot delete turbine while inspections reference it', 'CONFLICT');
        }
        throw e;
    }
}
