import { roleAllowsPermission } from '../modules/auth/rbac';
import { HttpError } from '../utils/errors';
/**
 * Single RBAC gate for REST (mirrors `ensurePermission` for GraphQL).
 * Combine with `authenticate` on the route stack (and optionally `requireAuth` for clarity).
 */
export function requirePermission(permission) {
    return (req, _res, next) => {
        if (!req.authUser) {
            next(new HttpError(401, 'Authentication required', 'UNAUTHENTICATED'));
            return;
        }
        if (!roleAllowsPermission(req.authUser.role, permission)) {
            next(new HttpError(403, 'Insufficient permissions', 'FORBIDDEN'));
            return;
        }
        next();
    };
}
