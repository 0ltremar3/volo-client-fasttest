export type CoachEndCardLike = {
  type: string
  status: string
}

export type CoachEndMode = 'conversation' | 'offer' | 'summary' | 'completed'

export function findPendingSessionEnd<T extends CoachEndCardLike>(cards: T[]) {
  return cards.find((card) => card.type === 'session_end' && card.status === 'pending') ?? null
}

export function resolveCoachEndMode(
  sessionStatus: string,
  cards: CoachEndCardLike[],
): CoachEndMode {
  if (sessionStatus === 'completed') return 'completed'
  if (findPendingSessionEnd(cards)) return 'summary'
  if (cards.some((card) => card.type === 'session_end_offer' && card.status === 'pending')) {
    return 'offer'
  }
  return 'conversation'
}

export function canRequestCoachEnd({
  sessionStatus,
  cards,
  sending,
  preparing,
}: {
  sessionStatus: string
  cards: CoachEndCardLike[]
  sending: boolean
  preparing: boolean
}) {
  return (
    sessionStatus === 'ongoing' &&
    !sending &&
    !preparing &&
    resolveCoachEndMode(sessionStatus, cards) === 'conversation'
  )
}

export type CoachLanding = 'session' | 'scheduled' | 'welcome'

export function resolveCoachLanding(
  hasCurrentSession: boolean,
  scheduledCount: number,
): CoachLanding {
  if (hasCurrentSession) return 'session'
  return scheduledCount > 0 ? 'scheduled' : 'welcome'
}
