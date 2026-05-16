import { DataSource } from '@prisma/client';
import { z } from 'zod';
import { MAX_LIMIT } from '../utils/pagination';
const optionalUrl = z.union([z.string().url().max(2048), z.literal(''), z.null()]);
function normalizedRawPackageUrl(value) {
    if (value === undefined)
        return undefined;
    if (value === '' || value === null)
        return null;
    return value;
}
const inspectionCoreCreate = {
    turbineId: z.string().min(1),
    date: z.coerce.date(),
    inspectorName: z.union([z.string().max(256), z.null()]).optional(),
    dataSource: z.nativeEnum(DataSource),
    rawPackageUrl: optionalUrl.optional(),
};
/** GraphQL `createInspection` input — camelCase, shared with service layer. */
export const inspectionCreateBodySchema = z
    .object(inspectionCoreCreate)
    .strict()
    .transform((v) => {
    const out = {
        turbineId: v.turbineId,
        date: v.date,
        dataSource: v.dataSource,
    };
    if (v.inspectorName !== undefined)
        out.inspectorName = v.inspectorName;
    const url = normalizedRawPackageUrl(v.rawPackageUrl);
    if (url !== undefined)
        out.rawPackageUrl = url;
    return out;
});
/** REST create body — snake_case fields per API convention. */
export const inspectionCreateRestSchema = z
    .object({
    turbine_id: z.string().min(1),
    date: z.coerce.date(),
    inspector_name: z.union([z.string().max(256), z.null()]).optional(),
    data_source: z.nativeEnum(DataSource),
    raw_package_url: optionalUrl.optional(),
})
    .strict()
    .transform((v) => {
    const out = {
        turbineId: v.turbine_id,
        date: v.date,
        dataSource: v.data_source,
    };
    if (v.inspector_name !== undefined)
        out.inspectorName = v.inspector_name;
    const url = normalizedRawPackageUrl(v.raw_package_url);
    if (url !== undefined)
        out.rawPackageUrl = url;
    return out;
});
export const inspectionUpdateBodySchema = z
    .object({
    turbineId: z.string().min(1).optional(),
    date: z.coerce.date().optional(),
    inspectorName: z.union([z.string().max(256), z.null()]).optional(),
    dataSource: z.nativeEnum(DataSource).optional(),
    rawPackageUrl: optionalUrl.optional(),
})
    .strict()
    .transform((v) => {
    const out = {};
    if (v.turbineId !== undefined)
        out.turbineId = v.turbineId;
    if (v.date !== undefined)
        out.date = v.date;
    if (v.inspectorName !== undefined)
        out.inspectorName = v.inspectorName;
    if (v.dataSource !== undefined)
        out.dataSource = v.dataSource;
    const url = normalizedRawPackageUrl(v.rawPackageUrl);
    if (url !== undefined)
        out.rawPackageUrl = url;
    return out;
})
    .refine((v) => Object.keys(v).length > 0, {
    message: 'At least one field is required',
});
export const inspectionUpdateRestSchema = z
    .object({
    turbine_id: z.string().min(1).optional(),
    date: z.coerce.date().optional(),
    inspector_name: z.union([z.string().max(256), z.null()]).optional(),
    data_source: z.nativeEnum(DataSource).optional(),
    raw_package_url: optionalUrl.optional(),
})
    .strict()
    .transform((v) => {
    const out = {};
    if (v.turbine_id !== undefined)
        out.turbineId = v.turbine_id;
    if (v.date !== undefined)
        out.date = v.date;
    if (v.inspector_name !== undefined)
        out.inspectorName = v.inspector_name;
    if (v.data_source !== undefined)
        out.dataSource = v.data_source;
    const url = normalizedRawPackageUrl(v.raw_package_url);
    if (url !== undefined)
        out.rawPackageUrl = url;
    return out;
})
    .refine((v) => Object.keys(v).length > 0, {
    message: 'At least one field is required',
});
/** Normalized list args for GraphQL resolver after trimming/coercion. */
export const inspectionListGraphQLArgsSchema = z
    .object({
    page: z.number().int().positive().optional().nullable(),
    limit: z.number().int().positive().max(MAX_LIMIT).optional().nullable(),
    turbineId: z.preprocess((v) => (v === null || v === '' ? undefined : v), z.string().min(1).optional()),
    dateFrom: z.preprocess((v) => (v === null || v === '' ? undefined : v), z.coerce.date().optional()),
    dateTo: z.preprocess((v) => (v === null || v === '' ? undefined : v), z.coerce.date().optional()),
    dataSource: z.preprocess((v) => (v === null ? undefined : v), z.nativeEnum(DataSource).optional()),
})
    .strict()
    .transform((a) => ({
    page: a.page ?? undefined,
    limit: a.limit ?? undefined,
    turbineId: a.turbineId?.trim() || undefined,
    dateFrom: a.dateFrom,
    dateTo: a.dateTo,
    dataSource: a.dataSource,
}))
    .superRefine((q, ctx) => {
    if (q.dateFrom && q.dateTo && q.dateFrom > q.dateTo) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'dateFrom must be <= dateTo', path: ['dateTo'] });
    }
});
export const inspectionListRestQuerySchema = z
    .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(MAX_LIMIT).default(20),
    turbine_id: z.string().min(1).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    data_source: z.nativeEnum(DataSource).optional(),
})
    .refine((q) => !q.from || !q.to || q.from <= q.to, {
    message: 'from must be <= to',
    path: ['to'],
})
    .transform((q) => ({
    page: q.page,
    limit: q.limit,
    turbineId: q.turbine_id?.trim(),
    dateFrom: q.from,
    dateTo: q.to,
    dataSource: q.data_source,
}));
export const inspectionIdParamsSchema = z.object({
    id: z.string().min(1),
});
