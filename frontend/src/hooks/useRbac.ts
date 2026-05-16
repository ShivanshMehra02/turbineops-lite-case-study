import { useAuthContext } from '../auth/AuthContext'
import { rbac } from '../auth/rbac'

/** RBAC helpers bound to the current user (null-safe when logged out). */
export function useRbac() {
  const { user } = useAuthContext()
  const role = user?.role ?? null

  return {
    role,
    canWrite: role ? rbac.canWrite(role) : false,
    canAdmin: role ? rbac.canAdmin(role) : false,
  }
}
