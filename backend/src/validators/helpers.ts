import type { ZodSchema } from 'zod';
import { HttpError } from '../utils/errors';

/**
 * Shared body/query parsing with consistent 400 responses for REST routes.
 */
export function parseBody<T>(schema: ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body ?? {});
  if (!result.success) {
    throw new HttpError(400, 'Invalid request body', 'VALIDATION_ERROR', result.error.flatten());
  }
  return result.data;
}
