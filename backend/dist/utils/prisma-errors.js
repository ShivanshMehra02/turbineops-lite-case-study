import { Prisma } from '@prisma/client';
import { HttpError } from './errors';
function isInspectionDayUniqueViolation(meta) {
    const target = meta?.target;
    const fields = Array.isArray(target) ? target.map(String) : [];
    return fields.includes('inspectionDay') && fields.includes('turbineId');
}
/**
 * Maps Prisma failures from inspection writes to HTTP-safe errors (including concurrent overlap races).
 */
export function handleInspectionWriteError(e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
        throw new HttpError(404, 'Inspection not found', 'NOT_FOUND');
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        if (isInspectionDayUniqueViolation(e.meta)) {
            throw new HttpError(409, 'An inspection already exists for this turbine on the same UTC calendar day.', 'INSPECTION_OVERLAP');
        }
        throw new HttpError(409, 'Conflict with existing data', 'CONFLICT');
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
        throw new HttpError(409, 'Related turbine record conflict', 'CONFLICT');
    }
    throw e;
}
