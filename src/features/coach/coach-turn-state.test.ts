import { describe, expect, it } from 'vitest'

import type { VoloCoachStreamEvent } from '@/api/sse'
import type { VoloCard, VoloMessage } from '@/api/volo'
import {
  buildCoachTimeline,
  coachTurnReducer,
  createCoachTurnState,
  getCoachCardPresentation,
} from '@/features/coach/coach-turn-state'

const assistant: VoloMessage = {
  id: 'assistant-1',
  role: 'assistant',
  body: 'The complete response.',
  sequence: 3,
  client_temp_id: null,
  created_at: '2026-08-30T12:00:02.000Z',
}

const card: VoloCard = {
  id: 'card-1',
  message_id: assistant.id,
  type: 'move_create',
  status: 'pending',
  payload: { description: 'Take one clear step' },
  related_move_id: null,
  created_at: '2026-08-30T12:00:03.000Z',
  decided_at: null,
}

function event(event: VoloCoachStreamEvent) {
  return { type: 'event' as const, event }
}

describe('Coach turn state', () => {
  it('keeps confirmed Move cards read-only and hides rejected or expired cards', () => {
    expect(getCoachCardPresentation(card, false)).toBe('interactive')
    expect(getCoachCardPresentation({ ...card, status: 'confirmed' }, false)).toBe('confirmed')
    expect(getCoachCardPresentation({ ...card, status: 'rejected' }, false)).toBeNull()
    expect(getCoachCardPresentation({ ...card, status: 'expired' }, false)).toBeNull()
    expect(getCoachCardPresentation({ ...card, status: 'confirmed' }, true)).toBe('confirmed')
    expect(getCoachCardPresentation(card, true)).toBeNull()
    expect(
      getCoachCardPresentation({ ...card, type: 'move_revision', status: 'pending' }, true),
    ).toBe('interactive')
  })

  it('replaces the draft and anchors a card after its assistant message', () => {
    let state = createCoachTurnState()
    state = coachTurnReducer(state, {
      type: 'start',
      body: 'I will take a step',
      clientTempId: 'turn-1',
      createdAt: '2026-08-30T12:00:00.000Z',
    })
    state = coachTurnReducer(
      state,
      event({
        event: 'user_message_stored',
        data: { message_id: 'user-1', sequence: 2 },
      }),
    )
    state = coachTurnReducer(state, event({ event: 'assistant_delta', data: { text: 'Partial' } }))
    expect(state.draft?.text).toBe('Partial')
    expect(state.draft?.tail).toBe('Partial')
    state = coachTurnReducer(
      state,
      event({
        event: 'assistant_message_done',
        data: { ...assistant, model_provider: null, model_name: null },
      }),
    )
    state = coachTurnReducer(state, event({ event: 'card_created', data: card }))

    expect(state.draft).toBeNull()
    expect(buildCoachTimeline(state).map((item) => `${item.kind}:${item.id}`)).toEqual([
      'message:user-1',
      'message:assistant-1',
      'card:card-1',
    ])
  })

  it('upserts completed replay messages and cards', () => {
    let state = createCoachTurnState()
    state = coachTurnReducer(state, {
      type: 'start',
      body: 'I will take a step',
      clientTempId: 'turn-1',
      createdAt: '2026-08-30T12:00:00.000Z',
    })
    const assistantEvent = event({
      event: 'assistant_message_done',
      data: { ...assistant, model_provider: null, model_name: null },
    })
    const cardEvent = event({ event: 'card_created', data: card })

    for (let replay = 0; replay < 2; replay += 1) {
      state = coachTurnReducer(state, assistantEvent)
      state = coachTurnReducer(state, cardEvent)
    }

    expect(state.messages.filter((message) => message.id === assistant.id)).toHaveLength(1)
    expect(state.cards.filter((item) => item.id === card.id)).toHaveLength(1)
  })

  it('keeps the original client temp id available after failure', () => {
    let state = coachTurnReducer(createCoachTurnState(), {
      type: 'start',
      body: 'Please help',
      clientTempId: 'stable-turn',
      createdAt: '2026-08-30T12:00:00.000Z',
    })
    state = coachTurnReducer(state, {
      type: 'fail',
      code: 'STREAM_INCOMPLETE',
      message: 'Connection ended',
    })

    expect(state.failed).toMatchObject({
      body: 'Please help',
      clientTempId: 'stable-turn',
      code: 'STREAM_INCOMPLETE',
    })
    expect(state.draft?.status).toBe('failed')
  })
})
