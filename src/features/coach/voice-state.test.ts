import { describe, expect, it } from 'vitest'

import { canStartVoice, reduceVoiceTranscript, voicePhaseLabel } from './voice-state'

describe('voice state', () => {
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
    const empty = { interimUser: '', finalUser: '', assistant: '' }
    const interim = reduceVoiceTranscript(empty, {
      speaker: 'user',
      text: '我想聊',
      final: false,
    })
    expect(interim).toEqual({ interimUser: '我想聊', finalUser: '', assistant: '' })
    expect(
      reduceVoiceTranscript(interim, {
        speaker: 'user',
        text: '我想聊职业选择',
        final: true,
      }),
    ).toEqual({ interimUser: '', finalUser: '我想聊职业选择', assistant: '' })
  })

  it('keeps assistant transcription separate from user state', () => {
    const state = { interimUser: '', finalUser: 'user', assistant: '' }
    expect(
      reduceVoiceTranscript(state, {
        speaker: 'assistant',
        text: 'What feels most important?',
        final: true,
      }),
    ).toEqual({ ...state, assistant: 'What feels most important?' })
    expect(voicePhaseLabel('reconnecting')).toBe('Reconnecting')
  })
})
