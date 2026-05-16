import type { AuthUser } from '../types/auth';

export type GraphQLContext = {
  authUser: AuthUser | null;
};
