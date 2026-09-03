import type { SessionThread, VoloSession } from '@/api/volo'

export const voloCoachHomeQueryKey = ['volo-coach-home'] as const

export function voloSessionQueryKey(sessionId: string) {
  return ['volo-session', sessionId] as const
}

export type ResumedCoachSession = Pick<
  VoloSession,
  'id' | 'status' | 'related_move_id' | 'related_local_date' | 'ended_at'
>

export function overlayResumedCoachSession(
  current: SessionThread | undefined,
  session: ResumedCoachSession,
): SessionThread | undefined {
  if (!current || current.session.id !== session.id) return current
  return {
    ...current,
    session: {
      ...current.session,
      status: session.status,
      related_move_id: session.related_move_id,
      related_local_date: session.related_local_date,
      ended_at: session.ended_at,
    },
  }
}
