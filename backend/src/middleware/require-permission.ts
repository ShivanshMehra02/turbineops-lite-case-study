import type { NextFunction, Request, Response } from 'express';
import type { Permission } from '../modules/auth/rbac';
import { roleAllowsPermission } from '../modules/auth/rbac';
import { HttpError } from '../utils/errors';

/**
 * Single RBAC gate for REST (mirrors `ensurePermission` for GraphQL).
 * Combine with `authenticate` on the route stack (and optionally `requireAuth` for clarity).
 */
export function requirePermission(permission: Permission) {
  return (req: Request, _res: Response, next: NextFunction): void => {
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
