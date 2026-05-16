import { prisma } from '../db/prisma';
import { resolveAuthUserFromAccessToken } from '../services/auth.service';
import { HttpError } from '../utils/errors';
import { asyncHandler } from '../utils/async-handler';
/**
 * Parses `Authorization: Bearer <jwt>` when present.
 * - Missing header → continues without `req.authUser`.
 * - Malformed / invalid token → 401 (fail closed when a token is attempted).
 */
export function createAuthenticateMiddleware(env) {
    return asyncHandler(async (req, _res, next) => {
        const header = req.headers.authorization;
        if (!header?.startsWith('Bearer ')) {
            req.authUser = undefined;
            next();
            return;
        }
        const raw = header.slice('Bearer '.length).trim();
        if (!raw) {
            throw new HttpError(401, 'Invalid or expired token', 'INVALID_TOKEN');
        }
        try {
            req.authUser = await resolveAuthUserFromAccessToken(prisma, env, raw);
            next();
        }
        catch (e) {
            next(e instanceof HttpError ? e : new HttpError(401, 'Invalid or expired token', 'INVALID_TOKEN'));
        }
    });
}
