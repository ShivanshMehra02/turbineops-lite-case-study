import { GraphQLError } from 'graphql';
import { isHttpError } from '../utils/errors';
/**
 * Maps REST-oriented `HttpError` instances thrown by shared services into GraphQL errors.
 */
export async function gqlFromService(fn) {
    try {
        return await fn();
    }
    catch (e) {
        if (isHttpError(e)) {
            throw httpErrorToGraphQL(e);
        }
        throw e;
    }
}
export function httpErrorToGraphQL(err) {
    return new GraphQLError(err.message, {
        extensions: {
            code: err.code ?? `HTTP_${err.statusCode}`,
            httpStatus: err.statusCode,
            ...(process.env.NODE_ENV === 'development' && err.details !== undefined
                ? { details: err.details }
                : {}),
        },
    });
}
