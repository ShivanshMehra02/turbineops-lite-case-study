import type { NextFunction, Request, Response } from 'express';
import { HttpError, isHttpError } from '../utils/errors';

/**
 * Last middleware: maps known errors to JSON; hides internals in production.
 */
export function errorHandler(err: unknown, _req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (isHttpError(err)) {
    const payload: Record<string, unknown> = {
      error: err.message,
      ...(err.code ? { code: err.code } : {}),
    };
    if (process.env.NODE_ENV === 'development' && err.details !== undefined) {
      payload.details = err.details;
    }
    res.status(err.statusCode).json(payload);
    return;
  }

  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}
