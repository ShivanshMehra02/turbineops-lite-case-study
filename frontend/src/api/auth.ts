import { apiClient } from './client'
import type { LoginResponse } from '../types/domain'

export async function loginRequest(email: string, password: string): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/api/auth/login', { email, password })
  return data
}
