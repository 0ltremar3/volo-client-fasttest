export type VoicePhase =
  'connecting' | 'listening' | 'thinking' | 'speaking' | 'reconnecting' | 'failed'

export type VoiceTranscriptState = {
  interimUser: string
  finalUser: string
  assistant: string
}

export function canStartVoice(input: {
  sessionStatus: 'scheduled' | 'ongoing' | 'completed' | 'cancelled'
  sending: boolean
  pauseBlocked: boolean
  ending: boolean
  voiceOpen: boolean
}) {
  return (
    input.sessionStatus === 'ongoing' &&
    !input.sending &&
    !input.pauseBlocked &&
    !input.ending &&
    !input.voiceOpen
  )
}

export function reduceVoiceTranscript(
  state: VoiceTranscriptState,
  input: { speaker: 'user' | 'assistant'; text: string; final: boolean },
): VoiceTranscriptState {
  if (input.speaker === 'assistant') {
    return { ...state, assistant: input.text }
  }
  return input.final
    ? { ...state, interimUser: '', finalUser: input.text }
    : { ...state, interimUser: input.text }
}

export function voicePhaseLabel(phase: VoicePhase) {
  switch (phase) {
    case 'connecting':
      return 'Connecting'
    case 'listening':
      return 'Listening'
    case 'thinking':
      return 'Reflecting'
    case 'speaking':
      return 'Speaking'
    case 'reconnecting':
      return 'Reconnecting'
    case 'failed':
      return 'Voice unavailable'
  }
}

export async function finishVoiceCall(
  room: Pick<Room, 'disconnect'>,
  onCanonicalChange: () => void,
  onClose: () => void,
) {
  await room.disconnect(true)
  onCanonicalChange()
  onClose()
}

export function deferVoiceRoomDisconnect(
  room: Pick<Room, 'disconnect'>,
  generationRef: { current: number },
  generation: number,
) {
  queueMicrotask(() => {
    if (generationRef.current === generation) void room.disconnect(true)
  })
}
import type { Room } from 'livekit-client'
