import { apiFetch } from '@/api/client'
import { streamPost, type SseEvent } from '@/api/sse'

export type VoloMessage = {
  id: string
  role: 'user' | 'assistant'
  body: string
  sequence: number
  client_temp_id: string | null
  created_at: string
}

export type VoloCard = {
  id: string
  type: 'move_create' | 'move_revision' | 'session_end_offer' | 'session_end'
  status: 'pending' | 'confirmed' | 'rejected' | 'expired'
  payload: {
    description?: string
    topic_to_explore?: string
    takeaway?: string
  }
  related_move_id: string | null
  created_at: string
}

export type VoloSession = {
  id: string
  kind: 'volo_coach'
  title: string
  topic: string | null
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled'
  related_move_id: string | null
  related_local_date: string | null
  scheduled_at: string | null
  schedule_timezone: string | null
  schedule_state: 'upcoming' | 'expired' | null
  activated_at: string | null
  last_active_at: string
  ended_at: string | null
}

export type SessionThread = {
  session: VoloSession
  messages: VoloMessage[]
  cards: VoloCard[]
}

export type DailyCheck = {
  schedule_time_id: string
  local_date: string
  local_time: string
  status: 'progressing' | 'stuck' | 'needs_adjustment' | null
  checked_at: string | null
  is_overdue: boolean
}

export type PeriodMove = {
  id: string
  description: string
  revision: number
  source_session_id: string | null
  schedule: {
    id: string
    rule:
      | { frequency: 'daily' }
      | { frequency: 'weekly'; weekdays: number[] }
      | { frequency: 'monthly'; day: number }
      | { frequency: 'monthly'; monthEnd: true }
    start_local_date: string
    time_zone_identifier: string
    times: Array<{ id: string; local_time: string }>
  }
  checks: DailyCheck[]
}

export type VoloMove = {
  id: string
  description: string
  revision: number
  source_session_id: string | null
  schedule: PeriodMove['schedule'] | null
}

export type DailyResponse = {
  date: string
  time_zone_identifier: string
  echo: {
    schedule: {
      enabled: boolean
      local_time: string
      time_zone_identifier: string
    } | null
    status: 'not_started' | 'in_progress' | 'completed'
    echo_session_id: string | null
    conversation_id: string | null
    can_start: boolean
    can_continue: boolean
    summary: string | null
    takeaways: string[] | null
    generated_at: string | null
  }
  period_moves: PeriodMove[]
  traces: []
}

export type EchoMessage = {
  id: string
  role: 'user' | 'assistant'
  body: string
  sequence: number
  created_at: string
}

export type DailyEchoThread = {
  echo_session: {
    id: string
    status: 'not_started' | 'in_progress' | 'completed'
    local_date: string
    conversation_id: string
    completed_at: string | null
    summary: string | null
    takeaways: string[] | null
    generated_at: string | null
  }
  conversation: { id: string; title: string; status: string }
  messages: EchoMessage[]
}

export type ReviewItem = {
  id: string
  type: 'coach' | 'echo' | 'move'
  title: string
  summary: string
  completed_at: string
  date: string
  move_count: number | null
  related_move_id: string | null
}

export type ReviewDetail = {
  id: string
  type: 'coach' | 'echo' | 'move'
  title: string
  completed_at: string
  pause: { topic_to_explore?: string; takeaway?: string } | null
  summary: string | null
  takeaways: string[] | null
  related_move_id: string | null
  moves: VoloMove[]
  messages: EchoMessage[]
}

const timezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone

export const authApi = {
  me: () => apiFetch<{ profile: { display_name: string } }>('/v1/me'),
  sendOtp: (email: string) =>
    apiFetch('/v1/auth/email-otp/send-verification-otp', {
      method: 'POST',
      body: JSON.stringify({ email, type: 'sign-in' }),
    }),
  signIn: (email: string, otp: string) =>
    apiFetch('/v1/auth/sign-in/email-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    }),
  signOut: () => apiFetch('/v1/auth/sign-out', { method: 'POST' }),
}

export const coachApi = {
  home: () =>
    apiFetch<{ current_session: VoloSession | null; scheduled_sessions: VoloSession[] }>(
      '/v2/coach/home',
    ),
  list: () => apiFetch<{ items: VoloSession[]; next_cursor: string | null }>('/v2/coach/sessions'),
  get: (id: string) => apiFetch<SessionThread>(`/v2/coach/sessions/${id}`),
  create: (input: { startType: 'instant' | 'scheduled'; topic?: string; scheduledAt?: string }) =>
    apiFetch<{ session: VoloSession; opening_message: VoloMessage | null }>('/v2/coach/sessions', {
      method: 'POST',
      body: JSON.stringify({
        start_type: input.startType,
        topic: input.topic || null,
        scheduled_at: input.scheduledAt || null,
        time_zone_identifier: timezone(),
      }),
    }),
  start: (id: string) =>
    apiFetch<{ session: VoloSession; opening_message: VoloMessage }>(
      `/v2/coach/sessions/${id}/start`,
      { method: 'POST' },
    ),
  cancel: (id: string) => apiFetch(`/v2/coach/sessions/${id}/cancel`, { method: 'POST' }),
  endSuggestion: (id: string) =>
    apiFetch<{ card: VoloCard }>(`/v2/coach/sessions/${id}/end-suggestion`, {
      method: 'POST',
    }),
  confirmCard: (
    id: string,
    finalPayload: { description: string } | { topic_to_explore: string; takeaway: string },
  ) =>
    apiFetch<{ card: VoloCard; move: VoloMove | null; session: VoloSession }>(
      `/v2/coach/cards/${id}/confirm`,
      {
        method: 'POST',
        body: JSON.stringify({ final_payload: finalPayload }),
      },
    ),
  rejectCard: (id: string) =>
    apiFetch<{ card: VoloCard }>(`/v2/coach/cards/${id}/reject`, { method: 'POST' }),
  acceptEndOffer: (id: string) =>
    apiFetch<{ card: VoloCard }>(`/v2/coach/cards/${id}/accept-end`, { method: 'POST' }),
  stream: (
    id: string,
    input: { body: string; clientTempId: string },
    onEvent: (event: SseEvent) => void,
    signal?: AbortSignal,
  ) =>
    streamPost(
      `/v2/coach/sessions/${id}/messages/stream`,
      { body: input.body, client_temp_id: input.clientTempId },
      onEvent,
      signal,
    ),
}

export const dailyApi = {
  get: (date: string) => apiFetch<DailyResponse>(`/v2/daily?date=${encodeURIComponent(date)}`),
  saveEchoSchedule: (enabled: boolean, localTime: string) =>
    apiFetch('/v2/daily/echo/schedule', {
      method: 'PUT',
      body: JSON.stringify({
        enabled,
        local_time: localTime,
        time_zone_identifier: timezone(),
      }),
    }),
  startEcho: (date: string) =>
    apiFetch<{
      echo_session: { id: string; status: string; conversation_id: string }
      opening_message: EchoMessage
    }>('/v2/daily/echo/sessions', {
      method: 'POST',
      body: JSON.stringify({ local_date: date, time_zone_identifier: timezone() }),
    }),
  getEchoThread: (id: string) =>
    apiFetch<DailyEchoThread>(`/v2/daily/echo/sessions/${encodeURIComponent(id)}`),
  streamEcho: (
    id: string,
    input: { body: string; clientTempId: string },
    onEvent: (event: SseEvent) => void,
    signal?: AbortSignal,
  ) =>
    streamPost(
      `/v2/daily/echo/sessions/${encodeURIComponent(id)}/messages/stream`,
      { body: input.body, client_temp_id: input.clientTempId },
      onEvent,
      signal,
    ),
  completeEcho: (id: string) =>
    apiFetch(`/v2/daily/echo/sessions/${encodeURIComponent(id)}/complete`, {
      method: 'POST',
    }),
  updateCheck: (
    moveId: string,
    timeId: string,
    localDate: string,
    status: Exclude<DailyCheck['status'], null>,
  ) =>
    apiFetch(`/v2/moves/${moveId}/checks/${timeId}`, {
      method: 'PATCH',
      body: JSON.stringify({ local_date: localDate, status }),
    }),
  adjustmentSession: (moveId: string, timeId: string, localDate: string) =>
    apiFetch<{ session: VoloSession }>(`/v2/moves/${moveId}/adjustment-session`, {
      method: 'POST',
      body: JSON.stringify({
        schedule_time_id: timeId,
        local_date: localDate,
        time_zone_identifier: timezone(),
      }),
    }),
  deleteMove: (moveId: string) => apiFetch(`/v2/moves/${moveId}`, { method: 'DELETE' }),
  listMoves: () => apiFetch<{ items: VoloMove[] }>('/v2/moves'),
  scheduleMove: (
    moveId: string,
    input: {
      rule:
        | { frequency: 'daily' }
        | { frequency: 'weekly'; weekdays: number[] }
        | { frequency: 'monthly'; day: number }
        | { frequency: 'monthly'; month_end: true }
      startLocalDate: string
      times: string[]
    },
  ) =>
    apiFetch(`/v2/moves/${moveId}/schedule`, {
      method: 'PUT',
      body: JSON.stringify({
        rule: input.rule,
        start_local_date: input.startLocalDate,
        time_zone_identifier: timezone(),
        times: input.times,
      }),
    }),
}

export const reviewApi = {
  activity: (month: string) =>
    apiFetch<{ month: string; dates: string[] }>(
      `/v2/review/activity?month=${encodeURIComponent(month)}`,
    ),
  day: (date: string) =>
    apiFetch<{
      date: string
      groups: Array<{ type: 'coach' | 'echo' | 'move'; items: ReviewItem[] }>
    }>(`/v2/review?date=${encodeURIComponent(date)}`),
  detail: (id: string) => apiFetch<ReviewDetail>(`/v2/review/${encodeURIComponent(id)}`),
  continue: (id: string) =>
    apiFetch<{ session: VoloSession }>(`/v2/review/${encodeURIComponent(id)}/continue`, {
      method: 'POST',
    }),
}
