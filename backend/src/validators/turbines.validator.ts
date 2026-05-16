import { z } from 'zod';

/** Matches current turbine create behavior; numeric fields optional like Prisma input. */
export const createTurbineBodySchema = z.object({
  name: z.string().min(1, 'name required'),
  manufacturer: z.string().nullable().optional(),
  mwRating: z.number().nullable().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
});
