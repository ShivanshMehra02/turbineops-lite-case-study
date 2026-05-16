import type { AuthUser } from './auth';

declare global {
  namespace Express {
    interface Request {
      /** Set by `authenticate` middleware when a valid Bearer token is supplied. */
      authUser?: AuthUser;
    }
  }
}

export {};
