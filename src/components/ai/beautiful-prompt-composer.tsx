import { Keyboard } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CoachPromptBar } from '@/components/ai/beautiful-ui/prompt-bar'
import { Button } from '@/components/ui/button'
import { RecordingWaveform } from '@/components/ai/recording-waveform'

type Recording = {
  recorder?: MediaRecorder
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
  onTranscribe,
  onTranscribingChange,
}: {
  placeholder?: string
  showInspirations?: boolean
  disabled?: boolean
  inputRef?: React.RefObject<HTMLTextAreaElement | null>
  onSend: (text: string) => void
  onTranscribe?: (audio: Blob) => Promise<string>
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
        if (take.recorder?.state === 'recording') take.recorder.stop()
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
    if (active.current || disabled || !onTranscribe) return
    const take: Recording = { cancelled: false, released: false }
    active.current = take
    setError(null)
    setCancel(false)
    setState('requesting')
    try {
      if (!navigator.mediaDevices?.getUserMedia || !globalThis.MediaRecorder)
        throw new Error('unsupported')
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
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((type) =>
        MediaRecorder.isTypeSupported(type),
      )
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      take.recorder = recorder
      const chunks: Blob[] = []
      let size = 0
      recorder.ondataavailable = ({ data }) => {
        chunks.push(data)
        size += data.size
        if (size > 10 * 1024 * 1024 && recorder.state === 'recording') {
          take.cancelled = true
          setError(t('composer.tooLong'))
          recorder.stop()
        }
      }
      recorder.onerror = () => {
        take.cancelled = true
        stream.getTracks().forEach((track) => track.stop())
        if (active.current === take) {
          active.current = null
          setState('idle')
          setError(t('composer.dictationFailed'))
        }
      }
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
        if (active.current !== take) return
        if (take.cancelled || blocked.current) {
          active.current = null
          setState('idle')
          return
        }
        const audio = new Blob(chunks, { type: recorder.mimeType || 'application/octet-stream' })
        if (!audio.size || size > 10 * 1024 * 1024) {
          if (size > 10 * 1024 * 1024) setError(t('composer.tooLong'))
          active.current = null
          setState('idle')
          return
        }
        setState('transcribing')
        void onTranscribe(audio)
          .then((text) => {
            if (active.current !== take || blocked.current) return
            if (text.trim()) onSend(text.trim())
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
      recorder.start(1000)
      setWaveformStream(stream)
      setState('recording')
    } catch (failure) {
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
    if (take.recorder?.state === 'recording') {
      setState(cancelled ? 'idle' : 'transcribing')
      take.recorder.stop()
    } else {
      active.current = null
      setState('idle')
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
        onVoice={onTranscribe ? () => setVoiceMode(true) : undefined}
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
