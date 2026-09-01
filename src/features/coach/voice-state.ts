export type VoicePhase =
  'connecting' | 'listening' | 'thinking' | 'speaking' | 'reconnecting' | 'failed'

export type VoiceTranscriptState = {
  interimUser: string
  finalUser: string
  assistant: string
  userSegmentOrder: string[]
  userSegments: Record<string, { text: string; final: boolean }>
  clearUserOnNextSegment: boolean
}

export type VoiceFailure = 'permission' | 'worker_start' | 'worker_disconnect' | 'connection'

export function createVoiceTranscriptState(): VoiceTranscriptState {
  return {
    interimUser: '',
    finalUser: '',
    assistant: '',
    userSegmentOrder: [],
    userSegments: {},
    clearUserOnNextSegment: false,
  }
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
  input: { speaker: 'user' | 'assistant'; segmentId: string; text: string; final: boolean },
): VoiceTranscriptState {
  if (input.speaker === 'assistant') {
    return { ...state, assistant: input.text, clearUserOnNextSegment: true }
  }

  const existingSegment = state.userSegments[input.segmentId]
  const reset = state.clearUserOnNextSegment && !existingSegment
  const userSegments = reset ? {} : state.userSegments
  const userSegmentOrder = reset ? [] : state.userSegmentOrder
  const nextSegments = {
    ...userSegments,
    [input.segmentId]: { text: input.text, final: input.final },
  }
  const nextOrder = existingSegment ? userSegmentOrder : [...userSegmentOrder, input.segmentId]
  const textFor = (final: boolean) =>
    nextOrder
      .map((segmentId) => nextSegments[segmentId])
      .filter((segment) => segment?.final === final)
      .map((segment) => segment?.text.trim())
      .filter(Boolean)
      .join(' ')

  return {
    ...state,
    interimUser: textFor(false),
    finalUser: textFor(true),
    userSegments: nextSegments,
    userSegmentOrder: nextOrder,
    clearUserOnNextSegment: false,
  }
}

export function visibleVoiceUserText(state: VoiceTranscriptState) {
  return [state.finalUser, state.interimUser].filter(Boolean).join(' ')
}

export function retryVoiceSession(mutation: { reset: () => void; mutate: () => void }) {
  mutation.reset()
  mutation.mutate()
}

export function voiceFailureCopy(failure: VoiceFailure) {
  if (failure === 'permission') {
    return 'Microphone access was denied. Allow microphone access in your browser, then try again.'
  }
  if (failure === 'worker_disconnect') {
    return 'Voice transcription stopped. You can reconnect to keep talking; your saved conversation is unchanged.'
  }
  if (failure === 'worker_start') {
    return 'The Voice Coach did not become available. Reconnect to start a new voice session.'
  }
  return 'The voice connection ended. You can reconnect or continue with text.'
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
