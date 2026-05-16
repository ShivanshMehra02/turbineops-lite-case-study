import { apiClient } from './client'
import type { Finding, FindingCategory, Paginated } from '../types/domain'

export type FindingListParams = {
  page?: number
  limit?: number
  inspection_id?: string
  category?: FindingCategory
  severity?: number
  notes_contains?: string
}

export async function fetchFindings(params: FindingListParams): Promise<Paginated<Finding>> {
  const { data } = await apiClient.get<Paginated<Finding>>('/api/findings', { params })
  return data
}

export async function fetchFinding(id: string): Promise<Finding> {
  const { data } = await apiClient.get<Finding>(`/api/findings/${encodeURIComponent(id)}`)
  return data
}

export type FindingCreateRest = {
  inspection_id: string
  category: FindingCategory
  severity: number
  estimated_cost: number
  notes?: string | null
}

export async function createFinding(body: FindingCreateRest): Promise<Finding> {
  const { data } = await apiClient.post<Finding>('/api/findings', body)
  return data
}

export type FindingPatchRest = Partial<{
  category: FindingCategory
  severity: number
  estimated_cost: number
  notes: string | null
}>

export async function updateFinding(id: string, body: FindingPatchRest): Promise<Finding> {
  const { data } = await apiClient.patch<Finding>(`/api/findings/${encodeURIComponent(id)}`, body)
  return data
}

export async function deleteFinding(id: string): Promise<void> {
  await apiClient.delete(`/api/findings/${encodeURIComponent(id)}`)
}
