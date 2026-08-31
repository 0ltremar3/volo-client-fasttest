import { clearAccessToken, getAccessToken } from '@/api/auth-session'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''

export class ApiError extends Error {
  readonly status: number
  readonly payload: unknown

  constructor(status: number, payload: unknown) {
    super(`API request failed with status ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

export function createApiHeaders(init?: HeadersInit) {
  const headers = new Headers(init)
  const token = getAccessToken()
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  return headers
}

function getRequestUrl(path: string) {
  if (/^https?:\/\//u.test(path)) return path
  return `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`
}

async function parseResponse(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined

  const contentType = response.headers.get('content-type')
  if (contentType?.includes('application/json')) return response.json()
  return response.text()
}

export async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = createApiHeaders(options.headers)
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(getRequestUrl(url), {
    ...options,
    headers,
    credentials: options.credentials ?? 'include',
  })
  const payload = await parseResponse(response)

  if (!response.ok) {
    if (response.status === 401) clearAccessToken()
    throw new ApiError(response.status, payload)
  }
  return payload as T
}
