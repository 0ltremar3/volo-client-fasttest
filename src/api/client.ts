import { clearAccessToken, getAccessToken } from '@/api/auth-session'

function getApiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''
}

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
  return `${getApiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`
}

export function getWebSocketUrl(path: string) {
  const url = new URL(getRequestUrl(path), window.location.href)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return url.toString()
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

// Provider requests must not inherit app authentication, cookies or the session URL.
export async function bailianAsrFetch(
  token: string,
  body: string,
  signal: AbortSignal,
): Promise<unknown> {
  const response = await fetch(
    'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
    {
      method: 'POST',
      credentials: 'omit',
      mode: 'cors',
      redirect: 'error',
      referrerPolicy: 'no-referrer',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-DashScope-SSE': 'disable',
      },
      body,
      signal,
    },
  )
  if (!response.ok) {
    await response.body?.cancel()
    // A provider 401 is not an expired app session. Never clear the user's login here.
    throw new ApiError(response.status, { error: 'Speech recognition request failed' })
  }
  return response.json() as Promise<unknown>
}
