import { ApiError } from '@/api/client'

export type SseEvent<T = unknown> = { event: string; data: T }

export async function streamPost(
  path: string,
  body: unknown,
  onEvent: (event: SseEvent) => void,
  signal?: AbortSignal,
) {
  const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      'X-Time-Zone': Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    body: JSON.stringify(body),
    signal,
  })
  if (!response.ok || !response.body) {
    const payload = await response.text()
    throw new ApiError(response.status, payload)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')
    let boundary = buffer.indexOf('\n\n')
    while (boundary >= 0) {
      const block = buffer.slice(0, boundary)
      buffer = buffer.slice(boundary + 2)
      const event = parseBlock(block)
      if (event) onEvent(event)
      boundary = buffer.indexOf('\n\n')
    }
  }
  const trailing = parseBlock(buffer.trim())
  if (trailing) onEvent(trailing)
}

function parseBlock(block: string): SseEvent | null {
  let name = 'message'
  const data: string[] = []
  for (const line of block.split('\n')) {
    if (line.startsWith('event:')) name = line.slice(6).trim()
    if (line.startsWith('data:')) data.push(line.slice(5).trimStart())
  }
  if (!data.length) return null
  const raw = data.join('\n')
  try {
    return { event: name, data: JSON.parse(raw) }
  } catch {
    return { event: name, data: raw }
  }
}
