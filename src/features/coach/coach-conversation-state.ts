export type CoachEndCardLike = {
  type: string
  status: string
}

export type CoachMoveCardLike = CoachEndCardLike & {
  id: string
  created_at?: string
}

export type CoachEndMode = 'conversation' | 'offer' | 'summary' | 'completed'

export function isEmptyCoachConversation(messages: Array<{ role: string }>) {
  return !messages.some((message) => message.role === 'user')
}

export function findPendingSessionEnd<T extends CoachEndCardLike>(cards: T[]) {
  return cards.find((card) => card.type === 'session_end' && card.status === 'pending') ?? null
}

export function findPendingMoveCard<T extends CoachMoveCardLike>(cards: T[]) {
  return (
    cards.reduce<T | null>((latest, card) => {
      if (
        card.status !== 'pending' ||
        (card.type !== 'move_create' && card.type !== 'move_revision')
      ) {
        return latest
      }
      if (!latest || (card.created_at ?? '') >= (latest.created_at ?? '')) return card
      return latest
    }, null) ?? null
  )
}

export function resolveCoachEndAction<T extends CoachMoveCardLike>(cards: T[]) {
  const pendingMove = findPendingMoveCard(cards)
  return pendingMove
    ? ({ kind: 'review_move', cardId: pendingMove.id } as const)
    : ({ kind: 'prepare_end' } as const)
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
export type CoachStartView = 'home' | 'new' | 'schedule'

export function resolveCoachLanding(
  hasCurrentSession: boolean,
  scheduledCount: number,
): CoachLanding {
  if (hasCurrentSession) return 'session'
  return scheduledCount > 0 ? 'scheduled' : 'welcome'
}

export function resolveCoachStartView(
  entry: CoachStartView,
  scheduledCount: number,
): CoachStartView {
  if (entry === 'schedule') return 'schedule'
  if (scheduledCount > 0 && entry === 'home') return 'home'
  return 'new'
}
