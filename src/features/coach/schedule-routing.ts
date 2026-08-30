export type ScheduledSessionDestination = 'start' | 'preview'

export function resolveScheduledSessionDestination(
  scheduledAt: string | null,
  now = Date.now(),
): ScheduledSessionDestination {
  if (!scheduledAt) return 'preview'
  const timestamp = Date.parse(scheduledAt)
  return Number.isFinite(timestamp) && now >= timestamp ? 'start' : 'preview'
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
