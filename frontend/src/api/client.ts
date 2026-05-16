import axios, { type AxiosError } from 'axios'
import type { ApiErrorBody } from '../types/domain'

let getAccessToken: () => string | null = () => null
let onUnauthorized: () => void = () => {}

export function configureApiClient(opts: {
  getToken: () => string | null
  onUnauthorized?: () => void
}): void {
  getAccessToken = opts.getToken
  onUnauthorized = opts.onUnauthorized ?? (() => {})
}

function getBaseURL(): string {
  const base = import.meta.env.VITE_API_BASE as string | undefined
  return base?.replace(/\/$/, '') ?? ''
}

export const apiClient = axios.create({
  baseURL: getBaseURL(),
  timeout: 45_000,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (r) => r,
  (error: AxiosError<ApiErrorBody>) => {
    if (error.response?.status === 401) {
      onUnauthorized()
    }
    return Promise.reject(error)
  },
)

export function getAxiosMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const d = error.response?.data
    if (d && typeof d === 'object' && 'error' in d && typeof (d as ApiErrorBody).error === 'string') {
      return (d as ApiErrorBody).error!
    }
    return error.message || 'Request failed'
  }
  if (error instanceof Error) return error.message
  return 'Unexpected error'
}
