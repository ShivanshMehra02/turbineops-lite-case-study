import { useEffect } from 'react'
import type { QueryClient } from '@tanstack/react-query'

export type RepairPlanSsePayload = {
  type?: string
  inspectionId?: string
  repairPlanId?: string
  priority?: string
  totalEstimatedCost?: number
  generatedAt?: string
  summaryText?: string
  findingCount?: number
}

function sseUrl(apiBase: string, accessToken: string): string {
  const base = apiBase.replace(/\/$/, '')
  return `${base}/api/events?access_token=${encodeURIComponent(accessToken)}`
}

/**
 * Subscribes to repair-plan SSE events and targets TanStack Query invalidation.
 * Browser EventSource cannot send Authorization — uses query token bridge supported by the backend.
 */
export function useRepairPlanSse(queryClient: QueryClient, accessToken: string | null, enabled: boolean): void {
  useEffect(() => {
    if (!enabled || !accessToken) return
    const apiBase = import.meta.env.VITE_API_BASE as string | undefined
    if (!apiBase) return

    const es = new EventSource(sseUrl(apiBase, accessToken))

    const onGenerated = (ev: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(ev.data) as RepairPlanSsePayload
        const inspectionId = payload.inspectionId
        if (inspectionId) {
          void queryClient.invalidateQueries({ queryKey: ['repairPlan', inspectionId] })
          void queryClient.invalidateQueries({ queryKey: ['inspection', inspectionId] })
        }
        void queryClient.invalidateQueries({ queryKey: ['inspections'] })
      } catch {
        /* ignore malformed */
      }
    }

    es.addEventListener('repair_plan_generated', onGenerated as EventListener)
    return () => {
      es.removeEventListener('repair_plan_generated', onGenerated as EventListener)
      es.close()
    }
  }, [queryClient, accessToken, enabled])
}
