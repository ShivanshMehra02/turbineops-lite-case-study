import { z } from 'zod';
import { MAX_LIMIT } from '../utils/pagination';

const turbineFields = {
  name: z.string().min(1).max(256),
  manufacturer: z.union([z.string().max(256), z.null()]).optional(),
  mwRating: z.union([z.number().finite(), z.null()]).optional(),
  lat: z.union([z.number().finite().gte(-90).lte(90), z.null()]).optional(),
  lng: z.union([z.number().finite().gte(-180).lte(180), z.null()]).optional(),
};

/** Create turbine (REST body / GraphQL input mapping). */
export const turbineCreateBodySchema = z.object({
  name: turbineFields.name,
  manufacturer: turbineFields.manufacturer,
  mwRating: turbineFields.mwRating,
  lat: turbineFields.lat,
  lng: turbineFields.lng,
});

/** Partial update — at least one field required. */
export const turbineUpdateBodySchema = z
  .object({
    name: z.string().min(1).max(256).optional(),
    manufacturer: z.union([z.string().max(256), z.null()]).optional(),
    mwRating: z.union([z.number().finite(), z.null()]).optional(),
    lat: z.union([z.number().finite().gte(-90).lte(90), z.null()]).optional(),
    lng: z.union([z.number().finite().gte(-180).lte(180), z.null()]).optional(),
  })
  .strict()
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: 'At least one field is required',
  });

export const turbineListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(MAX_LIMIT).default(20),
  /** Case-insensitive substring match on `Turbine.name` */
  name: z.string().trim().min(1).max(200).optional(),
});

export const turbineIdParamsSchema = z.object({
  id: z.string().min(1),
});

/** Backwards-compatible export name used by older imports */
export const createTurbineBodySchema = turbineCreateBodySchema;

export type TurbineCreateInput = z.infer<typeof turbineCreateBodySchema>;
export type TurbineUpdateInput = z.infer<typeof turbineUpdateBodySchema>;
export type TurbineListQuery = z.infer<typeof turbineListQuerySchema>;
