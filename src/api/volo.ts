import { clearAccessToken, setAccessToken } from '@/api/auth-session'
import { apiFetch } from '@/api/client'
import {
  streamPost,
  streamVoloCoachPost,
  type SseEvent,
  type VoloCoachCard,
  type VoloCoachMessage,
  type VoloCoachStreamEvent,
} from '@/api/sse'

export type VoloMessage = Omit<VoloCoachMessage, 'model_provider' | 'model_name'>

export type VoloCard = VoloCoachCard

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

export type VoiceConnectionDetails = {
  voice_session_id: string
  coach_session_id: string
  server_url: string
  participant_token: string
  room_name: string
  participant_name: string
  expires_at: string
}

export type VoloCheck = {
  id: string
  move_id: string
  local_date: string
  status: 'progressing' | 'stuck'
  checked_at: string
}

export type RepeatRule =
  | { frequency: 'none' }
  | { frequency: 'daily' }
  | { frequency: 'weekly'; weekdays: number[] }
  | { frequency: 'monthly'; day: number }

export type MoveSchedule = {
  rule: RepeatRule
  start_local_date: string
  local_time: string
  alarm_enabled: boolean
  status: 'active' | 'ended'
}

export type VoloMove = {
  id: string
  description: string
  revision: number
  source_session_id: string | null
}

export type PeriodMove = VoloMove & {
  schedule: MoveSchedule
  next_check_time: {
    at: string
    local_date: string
    local_time: string
  } | null
  check: VoloCheck | null
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
  signIn: async (email: string, otp: string) => {
    const result = await apiFetch<{ token: string }>('/v1/auth/sign-in/email-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    })
    if (!result?.token) throw new Error('Sign-in response did not include a session token')
    setAccessToken(result.token)
    return result
  },
  signOut: async () => {
    try {
      await apiFetch('/v1/auth/sign-out', { method: 'POST' })
    } finally {
      clearAccessToken()
    }
  },
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
      body: JSON.stringify(
        input.startType === 'instant'
          ? { start_type: 'instant' }
          : {
              start_type: 'scheduled',
              topic: input.topic,
              scheduled_at: input.scheduledAt,
              time_zone_identifier: timezone(),
            },
      ),
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
    onEvent: (event: VoloCoachStreamEvent) => void,
    signal?: AbortSignal,
  ) =>
    streamVoloCoachPost(
      `/v2/coach/sessions/${id}/messages/stream`,
      { body: input.body, client_temp_id: input.clientTempId },
      onEvent,
      signal,
    ),
}

export const voiceApi = {
  create: (coachSessionId: string) =>
    apiFetch<VoiceConnectionDetails>('/v2/voice/sessions', {
      method: 'POST',
      body: JSON.stringify({ coach_session_id: coachSessionId }),
    }),
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
  updateCheck: (moveId: string, status: VoloCheck['status']) =>
    apiFetch(`/v2/moves/${moveId}/check`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  adjustmentSession: (moveId: string) =>
    apiFetch<{ session: VoloSession }>(`/v2/moves/${moveId}/adjustment-session`, {
      method: 'POST',
    }),
  deleteMove: (moveId: string) => apiFetch(`/v2/moves/${moveId}`, { method: 'DELETE' }),
  listMoves: () => apiFetch<{ items: PeriodMove[] }>('/v2/moves'),
  scheduleMove: (
    moveId: string,
    input: {
      rule: RepeatRule
      startLocalDate: string
      localTime: string
      alarmEnabled: boolean
    },
  ) =>
    apiFetch(`/v2/moves/${moveId}/schedule`, {
      method: 'PUT',
      body: JSON.stringify({
        rule: input.rule,
        start_local_date: input.startLocalDate,
        local_time: input.localTime,
        alarm_enabled: input.alarmEnabled,
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
  delete: (id: string) =>
    apiFetch<{ id: string; status: 'deleted' }>(`/v2/review/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
  continue: (id: string) =>
    apiFetch<{ session: VoloSession }>(`/v2/review/${encodeURIComponent(id)}/continue`, {
      method: 'POST',
    }),
}
