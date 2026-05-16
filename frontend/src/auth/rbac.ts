import type { Role } from '../types/domain'

export const rbac = {
  canRead: (_role: Role) => true,
  canWrite: (role: Role) => role === 'ENGINEER' || role === 'ADMIN',
  canAdmin: (role: Role) => role === 'ADMIN',
}
