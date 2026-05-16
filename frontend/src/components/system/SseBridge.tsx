import React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthContext } from '../../auth/AuthContext'
import { useRepairPlanSse } from '../../hooks/useRepairPlanSse'

/** Connects SSE stream → TanStack Query invalidation for repair-plan realtime UX. */
export function SseBridge(): React.ReactElement | null {
  const qc = useQueryClient()
  const { token, isAuthenticated } = useAuthContext()
  useRepairPlanSse(qc, token, isAuthenticated)
  return null
}
