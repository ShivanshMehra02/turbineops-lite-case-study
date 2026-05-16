import { computeSkip } from '../utils/pagination';
import { HttpError } from '../utils/errors';
import { toUtcInspectionCalendarDate } from '../utils/inspection-day';
import { buildInspectionWhere } from '../utils/inspection-filter';
import { handleInspectionWriteError } from '../utils/prisma-errors';
async function ensureTurbineExists(db, turbineId) {
    const row = await db.turbine.findUnique({ where: { id: turbineId }, select: { id: true } });
    if (!row)
        throw new HttpError(404, 'Turbine not found', 'NOT_FOUND');
}
/**
 * Service-layer overlap guard (fast fail + friendly errors). Under concurrency, DB unique index is authoritative.
 */
async function assertNoOverlappingInspection(db, turbineId, inspectionDay, excludeInspectionId) {
    const existing = await db.inspection.findFirst({
        where: {
            turbineId,
            inspectionDay,
            ...(excludeInspectionId ? { NOT: { id: excludeInspectionId } } : {}),
        },
        select: { id: true },
    });
    if (existing) {
        throw new HttpError(409, 'An inspection already exists for this turbine on the same UTC calendar day.', 'INSPECTION_OVERLAP');
    }
}
function movesToDifferentTurbineOrCalendarDay(existing, nextTurbineId, nextInstant) {
    const nextDay = toUtcInspectionCalendarDate(nextInstant);
    return existing.turbineId !== nextTurbineId || existing.inspectionDay.getTime() !== nextDay.getTime();
}
export async function listInspections(db, params) {
    const where = buildInspectionWhere(params);
    const skip = computeSkip(params.page, params.limit);
    const [items, totalCount] = await Promise.all([
        db.inspection.findMany({
            where,
            orderBy: [{ date: 'desc' }, { id: 'asc' }],
            skip,
            take: params.limit,
            include: { turbine: true },
        }),
        db.inspection.count({ where }),
    ]);
    return {
        items,
        totalCount,
        page: params.page,
        limit: params.limit,
    };
}
export async function findInspectionById(db, id) {
    return db.inspection.findUnique({
        where: { id },
        include: { turbine: true, findings: true, repairPlan: true },
    });
}
export async function getInspectionById(db, id) {
    const row = await findInspectionById(db, id);
    if (!row)
        throw new HttpError(404, 'Inspection not found', 'NOT_FOUND');
    return row;
}
export async function createInspection(db, input) {
    await ensureTurbineExists(db, input.turbineId);
    const inspectionDay = toUtcInspectionCalendarDate(input.date);
    await assertNoOverlappingInspection(db, input.turbineId, inspectionDay);
    try {
        return await db.inspection.create({
            data: {
                turbineId: input.turbineId,
                date: input.date,
                inspectionDay,
                dataSource: input.dataSource,
                ...(input.inspectorName !== undefined ? { inspectorName: input.inspectorName } : {}),
                ...(input.rawPackageUrl !== undefined ? { rawPackageUrl: input.rawPackageUrl } : {}),
            },
            include: { turbine: true },
        });
    }
    catch (e) {
        handleInspectionWriteError(e);
    }
}
export async function updateInspection(db, id, input) {
    const existing = await db.inspection.findUnique({ where: { id } });
    if (!existing)
        throw new HttpError(404, 'Inspection not found', 'NOT_FOUND');
    const nextTurbineId = input.turbineId ?? existing.turbineId;
    const nextDate = input.date ?? existing.date;
    if (input.turbineId !== undefined && input.turbineId !== existing.turbineId) {
        await ensureTurbineExists(db, nextTurbineId);
    }
    if (movesToDifferentTurbineOrCalendarDay(existing, nextTurbineId, nextDate)) {
        await assertNoOverlappingInspection(db, nextTurbineId, toUtcInspectionCalendarDate(nextDate), id);
    }
    try {
        return await db.inspection.update({
            where: { id },
            data: {
                ...(input.turbineId !== undefined ? { turbineId: input.turbineId } : {}),
                ...(input.date !== undefined
                    ? { date: input.date, inspectionDay: toUtcInspectionCalendarDate(input.date) }
                    : {}),
                ...(input.inspectorName !== undefined ? { inspectorName: input.inspectorName } : {}),
                ...(input.dataSource !== undefined ? { dataSource: input.dataSource } : {}),
                ...(input.rawPackageUrl !== undefined ? { rawPackageUrl: input.rawPackageUrl } : {}),
            },
            include: { turbine: true },
        });
    }
    catch (e) {
        handleInspectionWriteError(e);
    }
}
export async function deleteInspection(db, id) {
    try {
        await db.inspection.delete({ where: { id } });
    }
    catch (e) {
        handleInspectionWriteError(e);
    }
}
