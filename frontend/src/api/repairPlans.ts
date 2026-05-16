import axios from 'axios'
import { apiClient } from './client'
import type { RepairPlan } from '../types/domain'

export async function fetchRepairPlanByInspection(inspectionId: string): Promise<RepairPlan> {
  const { data } = await apiClient.get<RepairPlan>(
    `/api/repair-plans/by-inspection/${encodeURIComponent(inspectionId)}`,
  )
  return data
}

/** Returns null when no plan exists (404). */
export async function fetchRepairPlanByInspectionMaybe(inspectionId: string): Promise<RepairPlan | null> {
  try {
    return await fetchRepairPlanByInspection(inspectionId)
  } catch (e) {
    if (axios.isAxiosError(e) && e.response?.status === 404) return null
    throw e
  }
}

export async function generateRepairPlan(inspectionId: string): Promise<RepairPlan> {
  const { data } = await apiClient.post<RepairPlan>('/api/repair-plans/generate', {
    inspection_id: inspectionId,
  })
  return data
}
