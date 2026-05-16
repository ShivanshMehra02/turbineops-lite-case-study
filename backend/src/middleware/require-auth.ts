import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../utils/errors';

/** Ensures `authenticate` ran first and produced `req.authUser`. */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.authUser) {
    next(new HttpError(401, 'Authentication required', 'UNAUTHENTICATED'));
    return;
  }
  next();
}
