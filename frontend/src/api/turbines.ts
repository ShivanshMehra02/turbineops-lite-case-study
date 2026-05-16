import { apiClient } from './client'
import type { Paginated, Turbine } from '../types/domain'

export type TurbineListParams = {
  page?: number
  limit?: number
  name?: string
}

export async function fetchTurbines(params: TurbineListParams): Promise<Paginated<Turbine>> {
  const { data } = await apiClient.get<Paginated<Turbine>>('/api/turbines', { params })
  return data
}

export type TurbineCreateBody = {
  name: string
  manufacturer?: string | null
  mwRating?: number | null
  lat?: number | null
  lng?: number | null
}

export async function createTurbine(body: TurbineCreateBody): Promise<Turbine> {
  const { data } = await apiClient.post<Turbine>('/api/turbines', body)
  return data
}

export async function updateTurbine(id: string, body: Partial<TurbineCreateBody>): Promise<Turbine> {
  const { data } = await apiClient.patch<Turbine>(`/api/turbines/${encodeURIComponent(id)}`, body)
  return data
}

export async function deleteTurbine(id: string): Promise<void> {
  await apiClient.delete(`/api/turbines/${encodeURIComponent(id)}`)
}

export async function fetchTurbine(id: string): Promise<Turbine> {
  const { data } = await apiClient.get<Turbine>(`/api/turbines/${encodeURIComponent(id)}`)
  return data
}
