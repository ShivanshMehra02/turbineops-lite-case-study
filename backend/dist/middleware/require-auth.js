import { HttpError } from '../utils/errors';
/** Ensures `authenticate` ran first and produced `req.authUser`. */
export function requireAuth(req, _res, next) {
    if (!req.authUser) {
        next(new HttpError(401, 'Authentication required', 'UNAUTHENTICATED'));
        return;
    }
    next();
}
