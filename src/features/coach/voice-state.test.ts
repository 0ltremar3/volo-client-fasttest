import { describe, expect, it } from 'vitest'

import {
  canStartVoice,
  createVoiceTranscriptState,
  isPendingMoveNoticeExpanded,
  reduceVoiceTranscript,
  retryVoiceSession,
  voicePhaseLabel,
  visibleVoiceUserText,
} from './voice-state'
import { findPendingMoveCard } from './coach-conversation-state'

describe('voice state', () => {
  it('keeps the latest pending Move discoverable and resurfaces replacements', () => {
    const first = {
      id: 'move-card-1',
      type: 'move_create' as const,
      status: 'pending' as const,
      created_at: '2026-09-03T01:00:00.000Z',
    }
    const second = {
      id: 'move-card-2',
      type: 'move_create' as const,
      status: 'pending' as const,
      created_at: '2026-09-03T02:00:00.000Z',
    }

    expect(
      findPendingMoveCard([first, { ...first, id: 'ignored', status: 'rejected' }, second]),
    ).toMatchObject({ id: 'move-card-2' })
    expect(isPendingMoveNoticeExpanded(second.id, second.id)).toBe(false)
    expect(isPendingMoveNoticeExpanded('move-card-3', second.id)).toBe(true)
  })

  it('enables voice only for an idle ongoing Coach session', () => {
    expect(
      canStartVoice({
        sessionStatus: 'ongoing',
        sending: false,
        pauseBlocked: false,
        ending: false,
        voiceOpen: false,
      }),
    ).toBe(true)

    for (const blocked of [
      { sending: true },
      { pauseBlocked: true },
      { ending: true },
      { voiceOpen: true },
      { sessionStatus: 'completed' as const },
    ]) {
      expect(
        canStartVoice({
          sessionStatus: 'ongoing',
          sending: false,
          pauseBlocked: false,
          ending: false,
          voiceOpen: false,
          ...blocked,
        }),
      ).toBe(false)
    }
  })

  it('keeps interim local and replaces it with the final user transcript', () => {
    const empty = createVoiceTranscriptState()
    const interim = reduceVoiceTranscript(empty, {
      speaker: 'user',
      segmentId: 'segment-1',
      text: '我想聊',
      final: false,
    })
    expect(interim.interimUser).toBe('我想聊')
    const final = reduceVoiceTranscript(interim, {
      speaker: 'user',
      segmentId: 'segment-1',
      text: '我想聊职业选择',
      final: true,
    })
    expect(final.interimUser).toBe('')
    expect(final.finalUser).toBe('我想聊职业选择')
  })

  it('keeps assistant transcription separate from user state', () => {
    const state = reduceVoiceTranscript(createVoiceTranscriptState(), {
      speaker: 'user',
      segmentId: 'user-1',
      text: 'user',
      final: true,
    })
    const assistant = reduceVoiceTranscript(state, {
      speaker: 'assistant',
      segmentId: 'assistant-1',
      text: 'What feels most important?',
      final: true,
    })
    expect(assistant.assistant).toBe('What feels most important?')
    expect(voicePhaseLabel('reconnecting')).toBe('Reconnecting')
  })

  it('keeps final text from distinct transcription segments in order', () => {
    const empty = createVoiceTranscriptState()
    const first = reduceVoiceTranscript(empty, {
      speaker: 'user',
      segmentId: 'segment-1',
      text: '第一段',
      final: true,
    })
    const second = reduceVoiceTranscript(first, {
      speaker: 'user',
      segmentId: 'segment-2',
      text: '第二段',
      final: true,
    })

    expect(second.finalUser).toBe('第一段 第二段')
    expect(visibleVoiceUserText(second)).toBe('第一段 第二段')
  })

  it('does not append a duplicate final segment twice', () => {
    const first = reduceVoiceTranscript(createVoiceTranscriptState(), {
      speaker: 'user',
      segmentId: 'same-segment',
      text: 'only once',
      final: true,
    })
    const duplicate = reduceVoiceTranscript(first, {
      speaker: 'user',
      segmentId: 'same-segment',
      text: 'only once',
      final: true,
    })

    expect(duplicate.finalUser).toBe('only once')
  })

  it('clears the previous user buffer when speech starts after an assistant reply', () => {
    const first = reduceVoiceTranscript(createVoiceTranscriptState(), {
      speaker: 'user',
      segmentId: 'user-1',
      text: 'previous turn',
      final: true,
    })
    const assistant = reduceVoiceTranscript(first, {
      speaker: 'assistant',
      segmentId: 'assistant-1',
      text: 'reply',
      final: true,
    })
    const next = reduceVoiceTranscript(assistant, {
      speaker: 'user',
      segmentId: 'user-2',
      text: 'next turn',
      final: false,
    })

    expect(next.finalUser).toBe('')
    expect(next.interimUser).toBe('next turn')
  })

  it('resets and starts a fresh voice-session request on every retry', () => {
    const calls: string[] = []
    const mutation = {
      reset: () => calls.push('reset'),
      mutate: () => calls.push('mutate'),
    }

    retryVoiceSession(mutation)
    retryVoiceSession(mutation)

    expect(calls).toEqual(['reset', 'mutate', 'reset', 'mutate'])
  })
})
