import { ApiError, createApiHeaders } from '@/api/client'

export type SseEvent<T = unknown> = { event: string; data: T }

export type VoloCoachMessage = {
  id: string
  role: 'user' | 'assistant'
  body: string
  sequence: number
  client_temp_id: string | null
  model_provider: string | null
  model_name: string | null
  created_at: string
}

export type VoloCoachCard = {
  id: string
  message_id: string | null
  type: 'move_create' | 'move_revision' | 'session_end_offer' | 'session_end'
  status: 'pending' | 'confirmed' | 'rejected' | 'expired'
  payload: {
    description?: string
    suggested_schedule?: {
      frequency: 'none' | 'daily' | 'weekly' | 'monthly'
      local_time: string
      weekdays?: number[]
      day?: number
    }
    topic_to_explore?: string
    takeaway?: string
  }
  related_move_id: string | null
  created_at: string
  decided_at: string | null
}

export type VoloCoachStreamEvent =
  | { event: 'user_message_stored'; data: { message_id: string; sequence: number } }
  | { event: 'assistant_delta'; data: { text: string } }
  | { event: 'assistant_message_done'; data: VoloCoachMessage }
  | { event: 'card_created'; data: VoloCoachCard }
  | { event: 'error'; data: { code: string; message: string } }
  | { event: 'done'; data: Record<string, never> }

export class VoloCoachStreamError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'VoloCoachStreamError'
  }
}

export async function streamVoloCoachPost(
  path: string,
  body: unknown,
  onEvent: (event: VoloCoachStreamEvent) => void,
  signal?: AbortSignal,
) {
  const response = await postEventStream(path, body, signal)
  let receivedDone = false
  let receivedAssistantMessage = false

  for await (const rawEvent of readSseEvents(response.body!)) {
    const event = parseVoloCoachEvent(rawEvent)
    if (event.event === 'error') {
      throw new VoloCoachStreamError(event.data.code, event.data.message)
    }
    if (event.event === 'assistant_message_done') receivedAssistantMessage = true
    if (event.event === 'done') receivedDone = true
    onEvent(event)
  }

  if (!receivedDone) {
    throw new VoloCoachStreamError('STREAM_INCOMPLETE', 'Coach stream ended before done')
  }
  if (!receivedAssistantMessage) {
    throw new VoloCoachStreamError(
      'ASSISTANT_MESSAGE_MISSING',
      'Coach stream completed without an assistant message',
    )
  }
}

export async function streamPost(
  path: string,
  body: unknown,
  onEvent: (event: SseEvent) => void,
  signal?: AbortSignal,
) {
  const response = await postEventStream(path, body, signal)
  for await (const event of readSseEvents(response.body!)) onEvent(event)
}

async function postEventStream(path: string, body: unknown, signal?: AbortSignal) {
  const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: createApiHeaders({
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      'X-Time-Zone': Intl.DateTimeFormat().resolvedOptions().timeZone,
    }),
    body: JSON.stringify(body),
    signal,
  })
  if (!response.ok || !response.body) {
    const payload = await response.text()
    throw new ApiError(response.status, payload)
  }
  if (
    response.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase() !==
    'text/event-stream'
  ) {
    throw new VoloCoachStreamError('INVALID_CONTENT_TYPE', 'Expected a text/event-stream response')
  }
  return response
}

async function* readSseEvents(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let completed = false
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) {
        completed = true
        break
      }
      buffer += decoder.decode(value, { stream: true })
      let boundary = findEventBoundary(buffer)
      while (boundary) {
        const event = parseBlock(buffer.slice(0, boundary.index))
        buffer = buffer.slice(boundary.index + boundary.length)
        if (event) yield event
        boundary = findEventBoundary(buffer)
      }
    }
    buffer += decoder.decode()
    const trailing = parseBlock(buffer)
    if (trailing) yield trailing
  } finally {
    if (!completed) await reader.cancel().catch(() => undefined)
    reader.releaseLock()
  }
}

function findEventBoundary(buffer: string) {
  const match = /\r\n\r\n|\n\n|\r\r/.exec(buffer)
  return match ? { index: match.index, length: match[0].length } : null
}

function parseBlock(block: string): SseEvent | null {
  let name = 'message'
  const data: string[] = []
  for (const line of block.split(/\r\n|\r|\n/)) {
    if (line.startsWith('event:')) name = fieldValue(line.slice(6))
    if (line.startsWith('data:')) data.push(fieldValue(line.slice(5)))
  }
  if (!data.length) return null
  const raw = data.join('\n')
  try {
    return { event: name, data: JSON.parse(raw) }
  } catch {
    return { event: name, data: raw }
  }
}

function fieldValue(value: string) {
  return value.startsWith(' ') ? value.slice(1) : value
}

function parseVoloCoachEvent(raw: SseEvent): VoloCoachStreamEvent {
  const data = objectData(raw)
  switch (raw.event) {
    case 'user_message_stored':
      if (isString(data.message_id) && isNumber(data.sequence)) {
        return { event: raw.event, data: { message_id: data.message_id, sequence: data.sequence } }
      }
      break
    case 'assistant_delta':
      if (isString(data.text)) return { event: raw.event, data: { text: data.text } }
      break
    case 'assistant_message_done':
      if (isVoloCoachMessage(data)) return { event: raw.event, data }
      break
    case 'card_created':
      if (isVoloCoachCard(data)) return { event: raw.event, data }
      break
    case 'error':
      if (isString(data.code) && isString(data.message)) {
        return { event: raw.event, data: { code: data.code, message: data.message } }
      }
      break
    case 'done':
      return { event: raw.event, data: {} }
  }
  throw new VoloCoachStreamError('INVALID_STREAM_EVENT', `Invalid ${raw.event} event`)
}

function objectData(event: SseEvent): Record<string, unknown> {
  if (typeof event.data === 'object' && event.data !== null && !Array.isArray(event.data)) {
    return event.data as Record<string, unknown>
  }
  throw new VoloCoachStreamError('INVALID_STREAM_EVENT', `Invalid ${event.event} data`)
}

function isVoloCoachMessage(value: Record<string, unknown>): value is VoloCoachMessage {
  return (
    isString(value.id) &&
    (value.role === 'user' || value.role === 'assistant') &&
    isString(value.body) &&
    isNumber(value.sequence) &&
    isNullableString(value.client_temp_id) &&
    isNullableString(value.model_provider) &&
    isNullableString(value.model_name) &&
    isString(value.created_at)
  )
}

function isVoloCoachCard(value: Record<string, unknown>): value is VoloCoachCard {
  const payload = isCardPayload(value.payload) ? value.payload : null
  return (
    isString(value.id) &&
    isNullableString(value.message_id) &&
    ['move_create', 'move_revision', 'session_end_offer', 'session_end'].includes(
      String(value.type),
    ) &&
    ['pending', 'confirmed', 'rejected', 'expired'].includes(String(value.status)) &&
    payload !== null &&
    (value.type === 'move_create' || payload.suggested_schedule === undefined) &&
    isNullableString(value.related_move_id) &&
    isString(value.created_at) &&
    isNullableString(value.decided_at)
  )
}

function isCardPayload(value: unknown): value is VoloCoachCard['payload'] {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const payload = value as Record<string, unknown>
  const allowedKeys = ['description', 'suggested_schedule', 'topic_to_explore', 'takeaway']
  return (
    Object.keys(payload).every((key) => allowedKeys.includes(key)) &&
    ['description', 'topic_to_explore', 'takeaway'].every(
      (key) => payload[key] === undefined || isString(payload[key]),
    ) &&
    (payload.suggested_schedule === undefined || isSuggestedSchedule(payload.suggested_schedule))
  )
}

function isSuggestedSchedule(
  value: unknown,
): value is NonNullable<VoloCoachCard['payload']['suggested_schedule']> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const schedule = value as Record<string, unknown>
  if (!isString(schedule.local_time) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(schedule.local_time)) {
    return false
  }
  if (schedule.frequency === 'none' || schedule.frequency === 'daily') {
    return Object.keys(schedule).length === 2
  }
  if (schedule.frequency === 'weekly') {
    return (
      Object.keys(schedule).length === 3 &&
      Array.isArray(schedule.weekdays) &&
      schedule.weekdays.length > 0 &&
      schedule.weekdays.length <= 7 &&
      schedule.weekdays.every(
        (day) => typeof day === 'number' && Number.isInteger(day) && day >= 1 && day <= 7,
      )
    )
  }
  return (
    schedule.frequency === 'monthly' &&
    Object.keys(schedule).length === 3 &&
    typeof schedule.day === 'number' &&
    Number.isInteger(schedule.day) &&
    schedule.day >= 1 &&
    schedule.day <= 31
  )
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isNullableString(value: unknown): value is string | null {
  return value === null || isString(value)
}
