import {
  BarVisualizer,
  RoomAudioRenderer,
  RoomContext,
  useMediaDeviceSelect,
  useTranscriptions,
  useVoiceAssistant,
} from '@livekit/components-react'
import { AudioLines, Mic, MicOff, PhoneOff, RefreshCw, Volume2, X } from 'lucide-react'
import { ParticipantKind, Room, RoomEvent, Track, type Participant } from 'livekit-client'
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'

import type { VoiceConnectionDetails } from '@/api/volo'
import {
  deferVoiceRoomDisconnect,
  createVoiceTranscriptState,
  finishVoiceCall,
  reduceVoiceTranscript,
  visibleVoiceUserText,
  voiceFailureCopy,
  voicePhaseLabel,
  type VoiceFailure,
  type VoicePhase,
} from '@/features/coach/voice-state'

type VoiceOverlayProps = {
  details: VoiceConnectionDetails | null
  loading: boolean
  requestError: boolean
  onRetry: () => void
  onClose: () => void
  onCanonicalChange: () => void
}

const emptyTranscript = createVoiceTranscriptState()

export function VoiceOverlay({
  details,
  loading,
  requestError,
  onRetry,
  onClose,
  onCanonicalChange,
}: VoiceOverlayProps) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
  }, [])

  return (
    <section
      className="voice-overlay app-canvas fixed inset-0 isolate mx-auto flex h-dvh w-full max-w-[390px] flex-col overflow-hidden text-[var(--coach-ink)]"
      role="dialog"
      aria-modal="true"
      aria-label="Voice conversation"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose()
      }}
    >
      {details ? (
        <VoiceRoom
          key={details.voice_session_id}
          closeRef={closeRef}
          details={details}
          onClose={onClose}
          onCanonicalChange={onCanonicalChange}
          onRetry={onRetry}
        />
      ) : (
        <>
          <VoiceChrome closeRef={closeRef} onClose={onClose} />
          <VoicePending
            loading={loading}
            error={requestError}
            onRetry={onRetry}
            onClose={onClose}
          />
        </>
      )}
    </section>
  )
}

function VoicePending({
  loading,
  error,
  onRetry,
  onClose,
}: {
  loading: boolean
  error: boolean
  onRetry: () => void
  onClose: () => void
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 pb-[max(24px,env(safe-area-inset-bottom))] text-center">
      <div className="grid size-24 place-items-center rounded-full bg-[var(--coach-surface-glass)] shadow-[var(--coach-shadow)]">
        {error ? (
          <AudioLines className="size-8 text-[var(--danger)]" aria-hidden="true" />
        ) : (
          <RefreshCw
            className="size-7 animate-spin text-[var(--coach-accent)]"
            aria-hidden="true"
          />
        )}
      </div>
      <h3 className="mt-6 text-xl font-semibold">
        {error ? 'Voice is unavailable' : 'Connecting'}
      </h3>
      <p className="mt-2 max-w-[19rem] text-sm leading-5 text-[var(--coach-text-secondary)]">
        {error
          ? 'We couldn’t start this voice session. Your text conversation is still available.'
          : 'Preparing a private microphone connection.'}
      </p>
      {error ? (
        <button
          type="button"
          className="mt-6 min-h-11 rounded-full bg-[var(--coach-chrome-dark)] px-6 text-sm font-semibold text-[var(--coach-on-dark)]"
          onClick={onRetry}
        >
          Try again
        </button>
      ) : null}
      <button
        type="button"
        className="mt-3 min-h-11 px-5 text-sm font-medium text-[var(--coach-text-secondary)]"
        disabled={loading && !error}
        onClick={onClose}
      >
        Continue with text
      </button>
    </div>
  )
}

function VoiceChrome({
  closeRef,
  onClose,
  leading,
}: {
  closeRef?: RefObject<HTMLButtonElement | null>
  onClose: () => void
  leading?: ReactNode
}) {
  return (
    <header className="safe-top flex min-h-[72px] shrink-0 items-end justify-between px-4 pb-2">
      {leading ?? <span className="size-11" aria-hidden="true" />}
      <h2 className="pb-3 text-base font-semibold">Voice Coach</h2>
      <button
        ref={closeRef}
        type="button"
        className="grid size-11 place-items-center rounded-full text-[var(--coach-ink)] transition-colors hover:bg-[var(--coach-surface-glass)]"
        aria-label="Return to text chat"
        onClick={onClose}
      >
        <X className="size-5" aria-hidden="true" />
      </button>
    </header>
  )
}

function VoiceRoom({
  closeRef,
  details,
  onClose,
  onRetry,
  onCanonicalChange,
}: {
  closeRef: RefObject<HTMLButtonElement | null>
  details: VoiceConnectionDetails
  onClose: () => void
  onRetry: () => void
  onCanonicalChange: () => void
}) {
  const room = useMemo(
    () =>
      new Room({
        adaptiveStream: true,
        dynacast: true,
        stopLocalTrackOnUnpublish: true,
      }),
    [],
  )
  return (
    <RoomContext.Provider value={room}>
      <VoiceRoomContent
        closeRef={closeRef}
        room={room}
        details={details}
        onClose={onClose}
        onRetry={onRetry}
        onCanonicalChange={onCanonicalChange}
      />
      <RoomAudioRenderer room={room} />
    </RoomContext.Provider>
  )
}

function VoiceRoomContent({
  closeRef,
  room,
  details,
  onClose,
  onRetry,
  onCanonicalChange,
}: {
  closeRef: RefObject<HTMLButtonElement | null>
  room: Room
  details: VoiceConnectionDetails
  onClose: () => void
  onRetry: () => void
  onCanonicalChange: () => void
}) {
  const [transcript, updateTranscript] = useReducer(reduceVoiceTranscript, emptyTranscript)
  const [failure, setFailure] = useState<VoiceFailure | null>(null)
  const [reconnecting, setReconnecting] = useState(false)
  const [micEnabled, setMicEnabled] = useState(false)
  const [audioBlocked, setAudioBlocked] = useState(false)
  const closingRef = useRef(false)
  const transcriptRef = useRef<HTMLDivElement>(null)
  const connectionRef = useRef<Promise<void> | null>(null)
  const effectGenerationRef = useRef(0)
  const workerDisconnectTimerRef = useRef<number | null>(null)
  const seenTranscriptionsRef = useRef(new Map<string, string>())
  const { state: agentState, audioTrack } = useVoiceAssistant()
  const transcriptionStreams = useTranscriptions({ room })
  const handleMediaDeviceError = useCallback(() => setFailure('permission'), [])
  const phase: VoicePhase = failure
    ? 'failed'
    : reconnecting
      ? 'reconnecting'
      : agentState === 'speaking'
        ? 'speaking'
        : agentState === 'thinking'
          ? 'thinking'
          : agentState === 'listening'
            ? 'listening'
            : 'connecting'
  const { devices, activeDeviceId, setActiveMediaDevice } = useMediaDeviceSelect({
    kind: 'audioinput',
    room,
    requestPermissions: false,
    onError: handleMediaDeviceError,
  })

  const hangUp = useCallback(async () => {
    closingRef.current = true
    await finishVoiceCall(room, onCanonicalChange, onClose)
  }, [onCanonicalChange, onClose, room])

  useEffect(() => {
    const effectGeneration = ++effectGenerationRef.current
    closingRef.current = false
    const onReconnecting = () => setReconnecting(true)
    const onReconnected = () => {
      setReconnecting(false)
      onCanonicalChange()
    }
    const onDisconnected = () => {
      if (!closingRef.current) {
        setFailure('connection')
      }
    }
    const onMediaError = (error: Error) => {
      setFailure(error.name === 'NotAllowedError' ? 'permission' : 'connection')
    }
    const onAudioPlayback = (playing: boolean) => setAudioBlocked(!playing)
    const onParticipantConnected = (participant: Participant) => {
      if (participant.kind !== ParticipantKind.AGENT) return
      if (workerDisconnectTimerRef.current !== null) {
        window.clearTimeout(workerDisconnectTimerRef.current)
        workerDisconnectTimerRef.current = null
      }
      setFailure((current) =>
        current === 'worker_start' || current === 'worker_disconnect' ? null : current,
      )
    }
    const onParticipantDisconnected = (participant: Participant) => {
      if (participant.kind === ParticipantKind.AGENT && !closingRef.current) {
        if (workerDisconnectTimerRef.current !== null) {
          window.clearTimeout(workerDisconnectTimerRef.current)
        }
        workerDisconnectTimerRef.current = window.setTimeout(() => {
          workerDisconnectTimerRef.current = null
          const hasAgent = [...room.remoteParticipants.values()].some(
            (remote) => remote.kind === ParticipantKind.AGENT,
          )
          if (!hasAgent && !closingRef.current) setFailure('worker_disconnect')
        }, 1_000)
      }
    }
    room.on(RoomEvent.Reconnecting, onReconnecting)
    room.on(RoomEvent.Reconnected, onReconnected)
    room.on(RoomEvent.Disconnected, onDisconnected)
    room.on(RoomEvent.MediaDevicesError, onMediaError)
    room.on(RoomEvent.AudioPlaybackStatusChanged, onAudioPlayback)
    room.on(RoomEvent.ParticipantConnected, onParticipantConnected)
    room.on(RoomEvent.ParticipantDisconnected, onParticipantDisconnected)

    let cancelled = false
    const connection =
      connectionRef.current ??
      room.connect(details.server_url, details.participant_token, { autoSubscribe: true })
    connectionRef.current = connection
    void connection
      .then(async () => {
        if (cancelled) return
        try {
          await room.localParticipant.setMicrophoneEnabled(true, undefined, {
            source: Track.Source.Microphone,
          })
          setMicEnabled(true)
          await room.startAudio()
          setAudioBlocked(!room.canPlaybackAudio)
        } catch (error) {
          setFailure(
            error instanceof Error && error.name === 'NotAllowedError'
              ? 'permission'
              : 'connection',
          )
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setFailure(
            error instanceof Error && error.name === 'NotAllowedError'
              ? 'permission'
              : 'connection',
          )
        }
      })

    return () => {
      cancelled = true
      room.off(RoomEvent.Reconnecting, onReconnecting)
      room.off(RoomEvent.Reconnected, onReconnected)
      room.off(RoomEvent.Disconnected, onDisconnected)
      room.off(RoomEvent.MediaDevicesError, onMediaError)
      room.off(RoomEvent.AudioPlaybackStatusChanged, onAudioPlayback)
      room.off(RoomEvent.ParticipantConnected, onParticipantConnected)
      room.off(RoomEvent.ParticipantDisconnected, onParticipantDisconnected)
      if (workerDisconnectTimerRef.current !== null) {
        window.clearTimeout(workerDisconnectTimerRef.current)
        workerDisconnectTimerRef.current = null
      }
      deferVoiceRoomDisconnect(room, effectGenerationRef, effectGeneration)
    }
  }, [details.participant_token, details.server_url, onCanonicalChange, room])

  useEffect(() => {
    for (const stream of transcriptionStreams) {
      const attributes = stream.streamInfo.attributes ?? {}
      const segmentId = attributes['lk.segment_id'] ?? stream.streamInfo.id
      const final = attributes['lk.transcription_final'] === 'true'
      const signature = `${stream.text}\u0000${final}`
      if (seenTranscriptionsRef.current.get(segmentId) === signature) continue
      seenTranscriptionsRef.current.set(segmentId, signature)
      const participant = room.getParticipantByIdentity(stream.participantInfo.identity)
      const speaker = participant?.kind === ParticipantKind.AGENT ? 'assistant' : 'user'
      updateTranscript({ speaker, segmentId, text: stream.text, final })
      if (final) onCanonicalChange()
    }
  }, [onCanonicalChange, room, transcriptionStreams])

  useEffect(() => {
    if (agentState !== 'connecting') return
    const timeout = window.setTimeout(() => setFailure('worker_start'), 20_000)
    return () => window.clearTimeout(timeout)
  }, [agentState])

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') void hangUp()
    }
    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [hangUp])

  const visibleUserText = visibleVoiceUserText(transcript)
  const failureCopy = failure ? voiceFailureCopy(failure) : ''

  useEffect(() => {
    const node = transcriptRef.current
    if (!node) return
    node.scrollTop = node.scrollHeight
  }, [transcript.assistant, visibleUserText])

  return (
    <>
      <VoiceChrome
        closeRef={closeRef}
        onClose={onClose}
        leading={
          <VoiceDevicePicker
            devices={devices}
            activeDeviceId={activeDeviceId}
            disabled={devices.length === 0 || Boolean(failure)}
            onSelect={(deviceId) => {
              void setActiveMediaDevice(deviceId, { exact: true }).catch(() =>
                setFailure('permission'),
              )
            }}
          />
        }
      />
      <div className="flex min-h-0 flex-1 flex-col px-5 pb-[max(16px,env(safe-area-inset-bottom))]">
        <div className="flex min-h-0 flex-1 flex-col items-center pt-2 text-center">
          <div
            className="voice-visualizer grid size-40 shrink-0 place-items-center rounded-full bg-[var(--coach-surface-glass)] shadow-[var(--coach-shadow)]"
            data-phase={phase}
            aria-hidden="true"
          >
            <BarVisualizer
              className="flex h-16 w-24 items-center justify-center gap-1"
              state={phase === 'reconnecting' || phase === 'failed' ? 'connecting' : phase}
              trackRef={audioTrack}
              barCount={7}
              options={{ minHeight: 14, maxHeight: 100 }}
            >
              <span className="voice-visualizer__bar block w-1.5 rounded-full" />
            </BarVisualizer>
          </div>
          <p className="mt-5 shrink-0 text-lg font-semibold" aria-live="polite">
            {voicePhaseLabel(phase)}
          </p>

          {failure ? (
            <div className="mt-4 max-w-[20rem] shrink-0" role="alert">
              <p className="text-sm leading-5 text-[var(--danger)]">{failureCopy}</p>
              <button
                type="button"
                className="mt-3 min-h-11 rounded-full bg-[var(--coach-chrome-dark)] px-5 text-sm font-semibold text-[var(--coach-on-dark)]"
                onClick={onRetry}
              >
                Reconnect
              </button>
            </div>
          ) : (
            <div
              ref={transcriptRef}
              className="mt-6 min-h-0 w-full max-w-[21rem] flex-1 overflow-y-auto overscroll-contain"
              aria-live="polite"
            >
              {visibleUserText ? (
                <div>
                  <p className="text-xs font-semibold text-[var(--coach-text-tertiary)]">
                    {transcript.interimUser ? 'Hearing you' : 'You said'}
                  </p>
                  <p className="mt-1 text-pretty text-base leading-6 text-[var(--coach-text-warm)]">
                    {visibleUserText}
                  </p>
                </div>
              ) : null}
              {transcript.assistant ? (
                <div className={visibleUserText ? 'mt-4' : undefined}>
                  <p className="text-xs font-semibold text-[var(--coach-text-tertiary)]">Coach</p>
                  <p className="mt-1 text-pretty text-base leading-6">{transcript.assistant}</p>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {audioBlocked ? (
          <button
            type="button"
            className="mx-auto mb-3 flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-[var(--coach-accent-muted)] px-4 text-sm font-medium"
            onClick={() => void room.startAudio().then(() => setAudioBlocked(false))}
          >
            <Volume2 className="size-4" aria-hidden="true" />
            Hear Coach
          </button>
        ) : null}

        <div className="flex shrink-0 items-center justify-center gap-5">
          <button
            type="button"
            className="grid size-12 place-items-center rounded-full bg-[var(--coach-surface-glass-strong)] shadow-[var(--coach-shadow)] disabled:opacity-45"
            aria-label={micEnabled ? 'Mute microphone' : 'Unmute microphone'}
            disabled={Boolean(failure)}
            onClick={() => {
              void room.localParticipant
                .setMicrophoneEnabled(!micEnabled, undefined, { source: Track.Source.Microphone })
                .then(() => setMicEnabled((enabled) => !enabled))
                .catch(() => setFailure('permission'))
            }}
          >
            {micEnabled ? (
              <Mic className="size-5" aria-hidden="true" />
            ) : (
              <MicOff className="size-5" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            className="grid size-14 place-items-center rounded-full bg-[var(--danger)] text-white shadow-[0_4px_8px_rgb(61_31_31/20%)]"
            aria-label="Hang up voice conversation"
            onClick={() => void hangUp()}
          >
            <PhoneOff className="size-6" aria-hidden="true" />
          </button>
        </div>

        <button
          type="button"
          className="mx-auto mt-3 min-h-11 shrink-0 px-5 text-sm font-medium text-[var(--coach-text-secondary)]"
          onClick={() => void hangUp()}
        >
          Continue with text
        </button>
      </div>
    </>
  )
}

function VoiceDevicePicker({
  devices,
  activeDeviceId,
  disabled,
  onSelect,
}: {
  devices: MediaDeviceInfo[]
  activeDeviceId: string
  disabled: boolean
  onSelect: (deviceId: string) => void
}) {
  const activeLabel =
    devices.find((device) => device.deviceId === activeDeviceId)?.label || 'Default microphone'

  return (
    <label className="relative grid size-11 place-items-center rounded-full text-[var(--coach-text-tertiary)] transition-colors hover:bg-[var(--coach-surface-glass)] hover:text-[var(--coach-ink)] has-[:disabled]:opacity-45">
      <Mic className="size-5" aria-hidden="true" />
      <span className="sr-only">Audio input device: {activeLabel}</span>
      <select
        className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
        aria-label="Audio input device"
        title={activeLabel}
        value={activeDeviceId}
        disabled={disabled}
        onChange={(event) => onSelect(event.target.value)}
      >
        {devices.length === 0 ? <option value="default">Default microphone</option> : null}
        {devices.map((device, index) => (
          <option key={device.deviceId} value={device.deviceId}>
            {device.label || `Microphone ${index + 1}`}
          </option>
        ))}
      </select>
    </label>
  )
}
