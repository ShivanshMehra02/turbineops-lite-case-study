import { FindingCategory } from '@prisma/client';
import { z } from 'zod';
import { MAX_LIMIT } from '../utils/pagination';
const severitySchema = z.number().int().gte(1).lte(5);
const notesSchema = z.union([z.string().max(8000), z.null()]).optional();
/** GraphQL / shared service shape — camelCase. Business rules run in `finding.service` after merge. */
export const findingCreateBodySchema = z
    .object({
    inspectionId: z.string().min(1),
    category: z.nativeEnum(FindingCategory),
    severity: severitySchema,
    estimatedCost: z.number().finite().gte(0),
    notes: notesSchema,
})
    .strict();
export const findingCreateRestSchema = z
    .object({
    inspection_id: z.string().min(1),
    category: z.nativeEnum(FindingCategory),
    severity: severitySchema,
    estimated_cost: z.number().finite().gte(0),
    notes: notesSchema,
})
    .strict()
    .transform((v) => ({
    inspectionId: v.inspection_id,
    category: v.category,
    severity: v.severity,
    estimatedCost: v.estimated_cost,
    notes: v.notes,
}));
export const findingUpdateBodySchema = z
    .object({
    category: z.nativeEnum(FindingCategory).optional(),
    severity: severitySchema.optional(),
    estimatedCost: z.number().finite().gte(0).optional(),
    notes: notesSchema,
})
    .strict()
    .refine((v) => Object.keys(v).length > 0, { message: 'At least one field is required' });
export const findingUpdateRestSchema = z
    .object({
    category: z.nativeEnum(FindingCategory).optional(),
    severity: severitySchema.optional(),
    estimated_cost: z.number().finite().gte(0).optional(),
    notes: notesSchema,
})
    .strict()
    .transform((v) => {
    const out = {};
    if (v.category !== undefined)
        out.category = v.category;
    if (v.severity !== undefined)
        out.severity = v.severity;
    if (v.estimated_cost !== undefined)
        out.estimatedCost = v.estimated_cost;
    if (v.notes !== undefined)
        out.notes = v.notes;
    return out;
})
    .refine((v) => Object.keys(v).length > 0, { message: 'At least one field is required' });
export const findingListRestQuerySchema = z
    .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(MAX_LIMIT).default(20),
    inspection_id: z.string().min(1).optional(),
    category: z.nativeEnum(FindingCategory).optional(),
    severity: z.coerce.number().int().gte(1).lte(5).optional(),
    notes_contains: z.string().trim().max(500).optional(),
})
    .transform((q) => ({
    page: q.page,
    limit: q.limit,
    inspectionId: q.inspection_id?.trim(),
    category: q.category,
    severity: q.severity,
    notesContains: q.notes_contains?.trim() || undefined,
}));
export const findingListGraphQLArgsSchema = z
    .object({
    page: z.number().int().positive().optional().nullable(),
    limit: z.number().int().positive().max(MAX_LIMIT).optional().nullable(),
    inspectionId: z.preprocess((v) => (v === null || v === '' ? undefined : v), z.string().min(1).optional()),
    category: z.preprocess((v) => (v === null ? undefined : v), z.nativeEnum(FindingCategory).optional()),
    severity: z.preprocess((v) => (v === null || v === undefined ? undefined : v), z.coerce.number().int().gte(1).lte(5).optional()),
    notesContains: z.preprocess((v) => (v === null || v === '' ? undefined : v), z.string().trim().max(500).optional()),
})
    .strict()
    .transform((a) => ({
    page: a.page ?? undefined,
    limit: a.limit ?? undefined,
    inspectionId: a.inspectionId?.trim(),
    category: a.category,
    severity: a.severity,
    notesContains: a.notesContains?.trim() || undefined,
}));
export const findingIdParamsSchema = z.object({
    id: z.string().min(1),
});
