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
export function parseQuery(schema, query) {
    const result = schema.safeParse(query ?? {});
    if (!result.success) {
        throw new HttpError(400, 'Invalid query parameters', 'VALIDATION_ERROR', result.error.flatten());
    }
    return result.data;
}
export function parseParams(schema, params) {
    const result = schema.safeParse(params ?? {});
    if (!result.success) {
        throw new HttpError(400, 'Invalid route parameters', 'VALIDATION_ERROR', result.error.flatten());
    }
    return result.data;
}
