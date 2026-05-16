import { GraphQLError } from 'graphql';
import type { Permission } from '../modules/auth/rbac';
import { roleAllowsPermission } from '../modules/auth/rbac';
import type { AuthUser } from '../types/auth';
import type { GraphQLContext } from './context';

export function ensurePermission(ctx: GraphQLContext, permission: Permission): AuthUser {
  if (!ctx.authUser) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
  if (!roleAllowsPermission(ctx.authUser.role, permission)) {
    throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
  }
  return ctx.authUser;
}
