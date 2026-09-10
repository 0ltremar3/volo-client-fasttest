import { Keyboard } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CoachPromptBar } from '@/components/ai/beautiful-ui/prompt-bar'
import { Button } from '@/components/ui/button'
import { RecordingWaveform } from '@/components/ai/recording-waveform'
import type { VoiceDictation } from '@/components/ai/voice-dictation'

type Recording = {
  dictation?: VoiceDictation
  controller: AbortController
  stream?: MediaStream
  cancelled: boolean
  released: boolean
}

export function BeautifulPromptComposer({
  placeholder,
  showInspirations = false,
  disabled = false,
  inputRef,
  onSend,
  onStartTranscription,
  onTranscribingChange,
}: {
  placeholder?: string
  showInspirations?: boolean
  disabled?: boolean
  inputRef?: React.RefObject<HTMLTextAreaElement | null>
  onSend: (text: string) => void
  onStartTranscription?: (
    stream: MediaStream,
    signal: AbortSignal,
    onFailure: () => void,
  ) => Promise<VoiceDictation>
  onTranscribingChange?: (pending: boolean) => void
}) {
  const { t } = useTranslation('coach')
  const fallbackInputRef = useRef<HTMLTextAreaElement>(null)
  const textInputRef = inputRef ?? fallbackInputRef
  const [voiceMode, setVoiceMode] = useState(false)
  const [state, setState] = useState<'idle' | 'requesting' | 'recording' | 'transcribing'>('idle')
  const [cancel, setCancel] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const active = useRef<Recording | null>(null)
  const [waveformStream, setWaveformStream] = useState<MediaStream | null>(null)
  useEffect(() => {
    onTranscribingChange?.(state === 'transcribing')
  }, [onTranscribingChange, state])
  useEffect(() => () => onTranscribingChange?.(false), [onTranscribingChange])
  const origin = useRef<number | null>(null)
  const blocked = useRef(disabled)
  useEffect(() => {
    blocked.current = disabled
  }, [disabled])
  useEffect(() => {
    function abort() {
      const take = active.current
      active.current = null
      if (take) {
        take.cancelled = true
        take.controller.abort()
        take.dictation?.close()
        take.stream?.getTracks().forEach((track) => track.stop())
      }
    }
    function hidden() {
      if (document.hidden) {
        abort()
        setState('idle')
        setCancel(false)
      }
    }
    function blur() {
      abort()
      setState('idle')
      setCancel(false)
    }
    window.addEventListener('blur', blur)
    document.addEventListener('visibilitychange', hidden)
    return () => {
      abort()
      window.removeEventListener('blur', blur)
      document.removeEventListener('visibilitychange', hidden)
    }
  }, [])

  async function start() {
    if (active.current || disabled || !onStartTranscription) return
    const take: Recording = { cancelled: false, released: false, controller: new AbortController() }
    active.current = take
    setError(null)
    setCancel(false)
    setState('requesting')
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      take.stream = stream
      if (active.current !== take || blocked.current) {
        stream.getTracks().forEach((track) => track.stop())
        if (active.current === take) {
          active.current = null
          setState('idle')
        }
        return
      }
      take.dictation = await onStartTranscription(stream, take.controller.signal, () => {
        if (active.current !== take) return
        active.current = null
        take.cancelled = true
        take.controller.abort()
        stream.getTracks().forEach((track) => track.stop())
        setState('idle')
        setError(t('composer.dictationFailed'))
      })
      if (active.current !== take || blocked.current) {
        take.dictation.close()
        stream.getTracks().forEach((track) => track.stop())
        if (active.current === take) {
          active.current = null
          setState('idle')
        }
        return
      }
      setWaveformStream(stream)
      setState('recording')
    } catch (failure) {
      take.controller.abort()
      take.dictation?.close()
      take.stream?.getTracks().forEach((track) => track.stop())
      if (active.current !== take) return
      active.current = null
      setState('idle')
      setError(
        t(
          failure instanceof DOMException && failure.name === 'NotAllowedError'
            ? 'composer.dictationPermission'
            : failure instanceof Error && failure.message === 'unsupported'
              ? 'composer.dictationUnsupported'
              : 'composer.dictationFailed',
        ),
      )
    }
  }
  function release(cancelled: boolean) {
    const take = active.current
    origin.current = null
    if (!take || take.released) return
    take.released = true
    take.cancelled = cancelled
    if (cancelled || !take.dictation || blocked.current) {
      active.current = null
      take.controller.abort()
      take.dictation?.close()
      take.stream?.getTracks().forEach((track) => track.stop())
      setState('idle')
    } else {
      setState('transcribing')
      void take.dictation
        .finish()
        .then((text) => {
          if (active.current === take && !blocked.current && text.trim()) onSend(text.trim())
        })
        .catch(() => {
          if (active.current === take) setError(t('composer.dictationFailed'))
        })
        .finally(() => {
          if (active.current === take) {
            active.current = null
            setState('idle')
          }
        })
    }
    setCancel(false)
  }
  const holdControl = (
    <button
      autoFocus
      type="button"
      className="hold-to-talk"
      disabled={disabled || state === 'transcribing'}
      aria-label={t('composer.holdToTalk')}
      aria-describedby="hold-instructions"
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => {
        if (event.button !== 0 || !event.isPrimary) return
        event.preventDefault()
        event.currentTarget.setPointerCapture(event.pointerId)
        origin.current = event.clientY
        void start()
      }}
      onPointerMove={(event) => {
        if (origin.current === null) return
        const cancelling = origin.current - event.clientY > 60
        if (active.current) active.current.cancelled = cancelling
        setCancel(cancelling)
      }}
      onPointerUp={() => release(active.current?.cancelled ?? false)}
      onPointerCancel={() => release(true)}
      onLostPointerCapture={() => release(true)}
      onBlur={() => release(true)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') release(true)
        if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault()
          if (!event.repeat) void start()
        }
      }}
      onKeyUp={(event) => {
        if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault()
          release(false)
        }
      }}
    >
      {state === 'recording' && waveformStream ? (
        <span className="hold-waveform" aria-hidden="true">
          <RecordingWaveform stream={waveformStream} />
        </span>
      ) : (
        t(state === 'requesting' ? 'composer.dictationRequesting' : 'composer.holdToTalk')
      )}
    </button>
  )
  const keyboardControl = (
    <Button
      className="hold-keyboard"
      variant="ghost"
      size="icon"
      disabled={state !== 'idle'}
      aria-label={t('composer.keyboard')}
      onClick={() => {
        setVoiceMode(false)
        requestAnimationFrame(() => textInputRef.current?.focus())
      }}
    >
      <Keyboard />
    </Button>
  )
  return (
    <div
      className="hold-composer-adapter sticky bottom-0 z-20 mt-auto bg-[var(--coach-composer-fade)] px-5 pb-3 pt-4"
      data-recording={state === 'recording' || state === 'requesting'}
      data-cancel={cancel}
    >
      <CoachPromptBar
        placeholder={placeholder}
        showInspirations={showInspirations}
        disabled={disabled || state !== 'idle'}
        inputRef={textInputRef}
        onSend={onSend}
        onVoice={onStartTranscription ? () => setVoiceMode(true) : undefined}
        inputControl={voiceMode ? holdControl : undefined}
        trailingControl={voiceMode ? keyboardControl : undefined}
      />
      <span id="hold-instructions" className="sr-only">
        {t('composer.holdHint')}
      </span>
      {state === 'recording' || state === 'requesting' ? (
        <div className="hold-recording-panel">
          <div className="hold-recording-backdrop" />
          <p role="status">
            {t(
              cancel
                ? 'composer.releaseCancel'
                : state === 'requesting'
                  ? 'composer.dictationRequesting'
                  : 'composer.releaseSend',
            )}
          </p>
        </div>
      ) : null}
      {error ? (
        <p className="pt-2 text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
