import { describe, expect, it } from 'vitest'

import {
  buildMoveScheduleRule,
  parseMockCoachHomeState,
  resolveMoveScheduleDraft,
} from './coach-model'
import {
  canRequestCoachEnd,
  findPendingSessionEnd,
  isEmptyCoachConversation,
  resolveCoachEndMode,
  resolveCoachLanding,
} from './coach-conversation-state'

const pendingSummary = { type: 'session_end', status: 'pending' }
const pendingOffer = { type: 'session_end_offer', status: 'pending' }

describe('Coach conversation end state', () => {
  it('treats an assistant-only thread as empty until the user speaks', () => {
    expect(isEmptyCoachConversation([{ role: 'assistant' }])).toBe(true)
    expect(isEmptyCoachConversation([{ role: 'assistant' }, { role: 'user' }])).toBe(false)
  })

  it('restores a pending summary and keeps an AI offer distinct', () => {
    expect(resolveCoachEndMode('ongoing', [pendingSummary])).toBe('summary')
    expect(findPendingSessionEnd([pendingOffer, pendingSummary])).toBe(pendingSummary)
    expect(resolveCoachEndMode('ongoing', [pendingOffer])).toBe('offer')
  })

  it('returns to conversation after rejecting an end card and marks completed sessions read-only', () => {
    expect(resolveCoachEndMode('ongoing', [{ ...pendingSummary, status: 'rejected' }])).toBe(
      'conversation',
    )
    expect(resolveCoachEndMode('completed', [])).toBe('completed')
  })

  it('prevents duplicate Done requests while sending, preparing, or handling an end card', () => {
    expect(
      canRequestCoachEnd({
        sessionStatus: 'ongoing',
        cards: [],
        sending: false,
        preparing: false,
      }),
    ).toBe(true)
    expect(
      canRequestCoachEnd({
        sessionStatus: 'ongoing',
        cards: [pendingSummary],
        sending: false,
        preparing: false,
      }),
    ).toBe(false)
    expect(
      canRequestCoachEnd({
        sessionStatus: 'ongoing',
        cards: [],
        sending: true,
        preparing: false,
      }),
    ).toBe(false)
    expect(
      canRequestCoachEnd({
        sessionStatus: 'ongoing',
        cards: [],
        sending: false,
        preparing: true,
      }),
    ).toBe(false)
  })
})

describe('Coach landing selection', () => {
  it('prefers an ongoing session, then appointments, then the welcome state', () => {
    expect(resolveCoachLanding(true, 2)).toBe('session')
    expect(resolveCoachLanding(false, 2)).toBe('scheduled')
    expect(resolveCoachLanding(false, 0)).toBe('welcome')
  })

  it('parses valid mock home state and rejects malformed dev state', () => {
    expect(
      parseMockCoachHomeState(
        JSON.stringify({ hasCurrentSession: false, hasScheduledSession: false }),
      ),
    ).toEqual({ hasCurrentSession: false, hasScheduledSession: false })
    expect(parseMockCoachHomeState('{bad json')).toEqual({
      hasCurrentSession: true,
      hasScheduledSession: true,
    })
  })
})

describe('Move check plan', () => {
  const date = new Date(2026, 7, 31)

  it('builds the backend rule for each visible frequency', () => {
    expect(buildMoveScheduleRule('daily', date)).toEqual({ frequency: 'daily' })
    expect(buildMoveScheduleRule('weekly', date)).toEqual({
      frequency: 'weekly',
      weekdays: [1],
    })
    expect(buildMoveScheduleRule('monthly', date)).toEqual({ frequency: 'monthly', day: 28 })
  })

  it('prefills an explicit daily suggestion and otherwise keeps the 21:00 default', () => {
    expect(resolveMoveScheduleDraft({ frequency: 'daily', local_time: '12:00' })).toEqual({
      frequency: 'daily',
      time: '12:00',
    })
    expect(resolveMoveScheduleDraft()).toEqual({ frequency: 'daily', time: '21:00' })
  })
})
