import type { VoloCoachStreamEvent } from '@/api/sse'
import type { VoloCard, VoloMessage } from '@/api/volo'

type ActiveTurn = { body: string; clientTempId: string }

export type CoachTurnState = {
  messages: VoloMessage[]
  cards: VoloCard[]
  draft: {
    id: string
    text: string
    status: 'streaming' | 'failed'
    clientTempId: string
  } | null
  active: ActiveTurn | null
  failed: (ActiveTurn & { code: string; message: string }) | null
}

export type CoachTurnAction =
  | { type: 'hydrate'; messages: VoloMessage[]; cards: VoloCard[] }
  | { type: 'reset'; messages?: VoloMessage[]; cards?: VoloCard[] }
  | { type: 'start'; body: string; clientTempId: string; createdAt: string }
  | { type: 'event'; event: VoloCoachStreamEvent }
  | { type: 'card_changed'; card: VoloCard }
  | { type: 'fail'; code: string; message: string }
  | { type: 'success' }
  | { type: 'cancel' }

export type CoachTimelineItem =
  | { kind: 'message'; id: string; message: VoloMessage }
  | { kind: 'card'; id: string; card: VoloCard }
  | { kind: 'draft'; id: string; draft: NonNullable<CoachTurnState['draft']> }

export function createCoachTurnState(
  messages: VoloMessage[] = [],
  cards: VoloCard[] = [],
): CoachTurnState {
  return { messages, cards, draft: null, active: null, failed: null }
}

export function coachTurnReducer(state: CoachTurnState, action: CoachTurnAction): CoachTurnState {
  switch (action.type) {
    case 'hydrate':
      return {
        ...state,
        messages: upsertMessages(state.messages, action.messages),
        cards: upsertCards(state.cards, action.cards),
      }
    case 'reset':
      return createCoachTurnState(action.messages, action.cards)
    case 'start': {
      const active = { body: action.body, clientTempId: action.clientTempId }
      const hasUser = state.messages.some(
        (message) => message.client_temp_id === action.clientTempId,
      )
      const optimistic: VoloMessage = {
        id: `local-${action.clientTempId}`,
        role: 'user',
        body: action.body,
        sequence: Math.max(0, ...state.messages.map((message) => message.sequence)) + 1,
        client_temp_id: action.clientTempId,
        created_at: action.createdAt,
      }
      return {
        ...state,
        messages: hasUser ? state.messages : upsertMessages(state.messages, [optimistic]),
        draft: {
          id: `draft-${action.clientTempId}`,
          text: '',
          status: 'streaming',
          clientTempId: action.clientTempId,
        },
        active,
        failed: null,
      }
    }
    case 'event':
      return reduceStreamEvent(state, action.event)
    case 'card_changed':
      return { ...state, cards: upsertCards(state.cards, [action.card]) }
    case 'fail':
      return {
        ...state,
        draft: state.draft ? { ...state.draft, status: 'failed' } : null,
        active: null,
        failed: state.active
          ? { ...state.active, code: action.code, message: action.message }
          : null,
      }
    case 'success':
      return { ...state, draft: null, active: null, failed: null }
    case 'cancel':
      return { ...state, draft: null, active: null, failed: null }
  }
}

export function buildCoachTimeline(state: CoachTurnState): CoachTimelineItem[] {
  const cards = [...state.cards].sort((a, b) => a.created_at.localeCompare(b.created_at))
  const anchoredCardIds = new Set<string>()
  const items: CoachTimelineItem[] = []

  for (const message of [...state.messages].sort((a, b) => a.sequence - b.sequence)) {
    items.push({ kind: 'message', id: message.id, message })
    for (const card of cards) {
      if (card.message_id !== message.id) continue
      anchoredCardIds.add(card.id)
      items.push({ kind: 'card', id: card.id, card })
    }
  }
  for (const card of cards) {
    if (!anchoredCardIds.has(card.id)) items.push({ kind: 'card', id: card.id, card })
  }
  if (state.draft) items.push({ kind: 'draft', id: state.draft.id, draft: state.draft })
  return items
}

function reduceStreamEvent(state: CoachTurnState, event: VoloCoachStreamEvent): CoachTurnState {
  switch (event.event) {
    case 'user_message_stored': {
      if (!state.active) return state
      const optimistic = state.messages.find(
        (message) => message.client_temp_id === state.active?.clientTempId,
      )
      const stored: VoloMessage = {
        id: event.data.message_id,
        role: 'user',
        body: state.active.body,
        sequence: event.data.sequence,
        client_temp_id: state.active.clientTempId,
        created_at: optimistic?.created_at ?? new Date().toISOString(),
      }
      return { ...state, messages: upsertMessages(state.messages, [stored]) }
    }
    case 'assistant_delta':
      return state.draft
        ? { ...state, draft: { ...state.draft, text: state.draft.text + event.data.text } }
        : state
    case 'assistant_message_done':
      return {
        ...state,
        messages: upsertMessages(state.messages, [event.data]),
        draft: null,
      }
    case 'card_created':
      return { ...state, cards: upsertCards(state.cards, [event.data]) }
    case 'error':
      return state.active
        ? {
            ...state,
            draft: state.draft ? { ...state.draft, status: 'failed' } : null,
            active: null,
            failed: { ...state.active, code: event.data.code, message: event.data.message },
          }
        : state
    case 'done':
      return state
  }
}

function upsertMessages(current: VoloMessage[], incoming: VoloMessage[]) {
  const next = [...current]
  for (const message of incoming) {
    const index = next.findIndex(
      (candidate) =>
        candidate.id === message.id ||
        (message.client_temp_id !== null && candidate.client_temp_id === message.client_temp_id),
    )
    if (index >= 0) next[index] = message
    else next.push(message)
  }
  return next
}

function upsertCards(current: VoloCard[], incoming: VoloCard[]) {
  const next = [...current]
  for (const card of incoming) {
    const index = next.findIndex((candidate) => candidate.id === card.id)
    if (index >= 0) next[index] = card
    else next.push(card)
  }
  return next
}
