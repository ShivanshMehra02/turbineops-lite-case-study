import type { Role } from '@prisma/client';

/**
 * Coarse permissions shared by REST and GraphQL.
 * - `read`: VIEWER, ENGINEER, ADMIN
 * - `write`: ENGINEER, ADMIN (create/update workflows)
 * - `admin`: ADMIN only (destructive / tenant-wide operations)
 */
export type Permission = 'read' | 'write' | 'admin';

export function roleAllowsPermission(role: Role, permission: Permission): boolean {
  switch (permission) {
    case 'read':
      return role === 'VIEWER' || role === 'ENGINEER' || role === 'ADMIN';
    case 'write':
      return role === 'ENGINEER' || role === 'ADMIN';
    case 'admin':
      return role === 'ADMIN';
    default:
      return false;
  }
}
