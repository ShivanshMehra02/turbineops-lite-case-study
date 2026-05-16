import { apiClient } from './client'
import type { DataSource, Inspection, Paginated } from '../types/domain'

export type InspectionListParams = {
  page?: number
  limit?: number
  turbine_id?: string
  from?: string
  to?: string
  data_source?: DataSource
}

export async function fetchInspections(params: InspectionListParams): Promise<Paginated<Inspection>> {
  const { data } = await apiClient.get<Paginated<Inspection>>('/api/inspections', { params })
  return data
}

export async function fetchInspection(id: string): Promise<Inspection> {
  const { data } = await apiClient.get<Inspection>(`/api/inspections/${encodeURIComponent(id)}`)
  return data
}

export type InspectionCreateRest = {
  turbine_id: string
  date: string
  data_source: DataSource
  inspector_name?: string | null
  raw_package_url?: string | null
}

export async function createInspection(body: InspectionCreateRest): Promise<Inspection> {
  const { data } = await apiClient.post<Inspection>('/api/inspections', body)
  return data
}

export type InspectionPatchRest = Partial<{
  turbine_id: string
  date: string
  data_source: DataSource
  inspector_name: string | null
  raw_package_url: string | null
}>

export async function updateInspection(id: string, body: InspectionPatchRest): Promise<Inspection> {
  const { data } = await apiClient.patch<Inspection>(`/api/inspections/${encodeURIComponent(id)}`, body)
  return data
}

export async function deleteInspection(id: string): Promise<void> {
  await apiClient.delete(`/api/inspections/${encodeURIComponent(id)}`)
}
