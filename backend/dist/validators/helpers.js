import { HttpError } from '../utils/errors';
/**
 * Shared body/query parsing with consistent 400 responses for REST routes.
 */
export function parseBody(schema, body) {
    const result = schema.safeParse(body ?? {});
    if (!result.success) {
        throw new HttpError(400, 'Invalid request body', 'VALIDATION_ERROR', result.error.flatten());
    }
    return result.data;
}
