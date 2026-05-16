import type { Role } from '@prisma/client';

/** Safe user projection for JWT payloads and `req.authUser` — never includes password hash. */
export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};
