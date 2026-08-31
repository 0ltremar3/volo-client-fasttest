export type ScheduledSessionDestination = 'start' | 'preview'

export function resolveScheduledSessionDestination(
  scheduledAt: string | null,
  now = Date.now(),
): ScheduledSessionDestination {
  if (!scheduledAt) return 'preview'
  const timestamp = Date.parse(scheduledAt)
  return Number.isFinite(timestamp) && now >= timestamp ? 'start' : 'preview'
}

export function sortScheduledSessionsByTime<T extends { scheduled_at: string | null }>(
  sessions: T[],
): T[] {
  return [...sessions].sort((left, right) => {
    const leftTime = appointmentTime(left.scheduled_at)
    const rightTime = appointmentTime(right.scheduled_at)
    return leftTime - rightTime
  })
}

function appointmentTime(scheduledAt: string | null) {
  if (!scheduledAt) return Number.POSITIVE_INFINITY
  const timestamp = Date.parse(scheduledAt)
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY
}

export function singleFlight<T>(task: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | null = null
  return () => {
    pending ??= task().finally(() => {
      pending = null
    })
    return pending
  }
}
