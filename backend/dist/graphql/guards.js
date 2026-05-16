import { GraphQLError } from 'graphql';
import { roleAllowsPermission } from '../modules/auth/rbac';
export function ensurePermission(ctx, permission) {
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
