import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CoachPromptBar } from '@/components/ai/beautiful-ui/prompt-bar'
import { encodePcm16 } from '@/components/ai/dictation-audio'

type DictationState = 'idle' | 'requesting' | 'recording' | 'transcribing'
type TranscriptionStream = {
  send: (audio: ArrayBuffer) => void
  finish: () => void
  close: () => void
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop())
}

function recordingOptions() {
  const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((type) =>
    MediaRecorder.isTypeSupported(type),
  )
  return mimeType ? { mimeType } : undefined
}

function startPcmCapture(stream: MediaStream, onAudio: (audio: ArrayBuffer) => void) {
  const context = new AudioContext()
  const source = context.createMediaStreamSource(stream)
  const processor = context.createScriptProcessor(4096, 1, 1)
  const silentOutput = context.createGain()
  silentOutput.gain.value = 0
  processor.onaudioprocess = (event) => {
    onAudio(encodePcm16(event.inputBuffer.getChannelData(0), event.inputBuffer.sampleRate))
  }
  source.connect(processor)
  processor.connect(silentOutput)
  silentOutput.connect(context.destination)
  void context.resume()
  return () => {
    processor.onaudioprocess = null
    source.disconnect()
    processor.disconnect()
    silentOutput.disconnect()
    void context.close()
  }
}

export function BeautifulPromptComposer({
  placeholder = 'Write a message…',
  showInspirations = false,
  disabled = false,
  inputRef,
  onSend,
  onVoice,
  onTranscribe,
  onTranscribeStream,
}: {
  placeholder?: string
  showInspirations?: boolean
  disabled?: boolean
  inputRef?: React.RefObject<HTMLTextAreaElement | null>
  onSend: (text: string) => void
  onVoice?: () => void
  onTranscribe?: (audio: Blob) => Promise<string>
  onTranscribeStream?: (onInterim: (text: string) => void) => Promise<TranscriptionStream>
}) {
  const { t } = useTranslation('coach')
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const transcriptionStreamRef = useRef<TranscriptionStream | null>(null)
  const stopPcmCaptureRef = useRef<(() => void) | null>(null)
  const mountedRef = useRef(false)
  const [dictationState, setDictationState] = useState<DictationState>('idle')
  const [dictationError, setDictationError] = useState<string | null>(null)

  function stopStreamingTranscription() {
    stopPcmCaptureRef.current?.()
    stopPcmCaptureRef.current = null
    transcriptionStreamRef.current?.finish()
  }

  function closeStreamingTranscription() {
    stopPcmCaptureRef.current?.()
    stopPcmCaptureRef.current = null
    transcriptionStreamRef.current?.close()
    transcriptionStreamRef.current = null
  }

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      recorderRef.current?.stop()
      recorderRef.current = null
      stopPcmCaptureRef.current?.()
      stopPcmCaptureRef.current = null
      transcriptionStreamRef.current?.close()
      transcriptionStreamRef.current = null
      stopStream(streamRef.current)
      streamRef.current = null
    }
  }, [])

  async function toggleDictation(
    updateDraft: (text: string, phase: 'begin' | 'interim' | 'final' | 'cancel') => void,
  ) {
    if (recorderRef.current?.state === 'recording') {
      setDictationState('transcribing')
      recorderRef.current.stop()
      return
    }
    if (dictationState !== 'idle') return
    if (!onTranscribe) return
    if (!navigator.mediaDevices?.getUserMedia || !globalThis.MediaRecorder) {
      setDictationError(t('composer.dictationUnsupported'))
      return
    }

    setDictationError(null)
    updateDraft('', 'begin')
    setDictationState('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (!mountedRef.current) {
        stopStream(stream)
        return
      }
      streamRef.current = stream
      if (onTranscribeStream) {
        try {
          const transcriptionStream = await onTranscribeStream((text) => {
            if (mountedRef.current) updateDraft(text, 'interim')
          })
          if (!mountedRef.current) {
            transcriptionStream.close()
            return
          }
          transcriptionStreamRef.current = transcriptionStream
          stopPcmCaptureRef.current = startPcmCapture(stream, transcriptionStream.send)
        } catch {
          closeStreamingTranscription()
        }
      }
      const recorder = new MediaRecorder(stream, recordingOptions())
      recorderRef.current = recorder
      chunksRef.current = []
      let recorderFailed = false
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data)
      }
      recorder.onerror = () => {
        recorderFailed = true
        closeStreamingTranscription()
        stopStream(streamRef.current)
        recorderRef.current = null
        streamRef.current = null
        if (mountedRef.current) {
          updateDraft('', 'cancel')
          setDictationState('idle')
          setDictationError(t('composer.dictationFailed'))
        }
      }
      recorder.onstop = () => {
        if (recorderFailed) return
        stopStreamingTranscription()
        const audio = new Blob(chunksRef.current, {
          type: recorder.mimeType || chunksRef.current[0]?.type || 'application/octet-stream',
        })
        chunksRef.current = []
        stopStream(streamRef.current)
        recorderRef.current = null
        streamRef.current = null
        if (!mountedRef.current) {
          closeStreamingTranscription()
          return
        }
        if (!audio.size) {
          closeStreamingTranscription()
          updateDraft('', 'cancel')
          setDictationState('idle')
          setDictationError(t('composer.dictationEmpty'))
          return
        }
        setDictationState('transcribing')
        void onTranscribe(audio)
          .then((text) => {
            if (!mountedRef.current) return
            if (!text.trim()) {
              updateDraft('', 'cancel')
              setDictationError(t('composer.dictationEmpty'))
            } else {
              updateDraft(text, 'final')
            }
          })
          .catch(() => {
            if (mountedRef.current) {
              updateDraft('', 'cancel')
              setDictationError(t('composer.dictationFailed'))
            }
          })
          .finally(() => {
            closeStreamingTranscription()
            if (mountedRef.current) {
              setDictationState('idle')
            }
          })
      }
      recorder.start()
      setDictationState('recording')
    } catch (error) {
      closeStreamingTranscription()
      updateDraft('', 'cancel')
      stopStream(streamRef.current)
      streamRef.current = null
      recorderRef.current = null
      setDictationState('idle')
      setDictationError(
        error instanceof DOMException && error.name === 'NotAllowedError'
          ? t('composer.dictationPermission')
          : t('composer.dictationFailed'),
      )
    }
  }

  return (
    <div className="sticky bottom-0 z-20 mt-auto bg-[var(--coach-composer-fade)] px-5 pb-3 pt-4">
      <CoachPromptBar
        placeholder={placeholder}
        showInspirations={showInspirations}
        disabled={disabled}
        inputRef={inputRef}
        onSend={onSend}
        onVoice={onVoice}
        dictationState={dictationState}
        dictationError={dictationError}
        onDictationToggle={onTranscribe ? (apply) => void toggleDictation(apply) : undefined}
      />
    </div>
  )
}
