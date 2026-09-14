import { openFinalTranscription, type FinalTranscription } from '@/api/final-transcription'

export const DICTATION_LIMIT_SECONDS = 225
export type DictationLimitEvents = { onNearLimit?: () => void; onLimit?: () => void }
export type VoiceDictation = { finish: () => Promise<string>; close: () => void }

export async function startVoiceDictation(
  stream: MediaStream,
  signal: AbortSignal,
  onFailure: () => void,
  events: DictationLimitEvents = {},
): Promise<VoiceDictation> {
  if (!globalThis.AudioContext || !globalThis.AudioWorkletNode) throw new Error('unsupported')
  // Let the browser resample the microphone into a 16 kHz mono processing graph.
  const context = new AudioContext({ sampleRate: 16000 })
  let source: MediaStreamAudioSourceNode | undefined
  let processor: AudioWorkletNode | undefined
  let transport: FinalTranscription | undefined
  let closed = false
  let stopAck: (() => void) | undefined
  let stopReject: ((error: Error) => void) | undefined
  let timeout: ReturnType<typeof setTimeout> | undefined
  let warningTimer: ReturnType<typeof setTimeout> | undefined
  let audioStopped = false
  let limitReached = false
  let finalPromise: Promise<string> | undefined
  let recordingLimit: ReturnType<typeof setTimeout> | undefined
  const releaseAudio = () => {
    source?.disconnect()
    processor?.disconnect()
    stream.getTracks().forEach((track) => track.stop())
    void context.close().catch(() => undefined)
    clearTimeout(recordingLimit)
    clearTimeout(warningTimer)
  }
  const close = () => {
    if (closed) return
    closed = true
    clearTimeout(timeout)
    signal.removeEventListener('abort', close)
    releaseAudio()
    stopReject?.(new Error('Recording cancelled'))
    transport?.close()
  }
  const fail = () => {
    if (closed) return
    close()
    onFailure()
  }
  const finish = () => {
    if (finalPromise) return finalPromise
    finalPromise = (async () => {
      if (closed || !processor || !transport) throw new Error('Cancelled')
      clearTimeout(recordingLimit)
      clearTimeout(warningTimer)
      try {
        if (!audioStopped) {
          await new Promise<void>((resolve, reject) => {
            stopAck = resolve
            stopReject = reject
            timeout = setTimeout(() => reject(new Error('Audio flush timed out')), 2000)
            processor?.port.postMessage({ type: 'stop' })
          })
        }
        clearTimeout(timeout)
        releaseAudio()
        return await transport.finish()
      } finally {
        close()
      }
    })()
    return finalPromise
  }
  const reachedLimit = () => {
    if (closed || limitReached || finalPromise) return
    limitReached = true
    if (events.onLimit) events.onLimit()
    else void finish().catch(onFailure)
  }
  signal.addEventListener('abort', close, { once: true })
  try {
    timeout = setTimeout(fail, 10_000)
    if (signal.aborted || context.sampleRate !== 16000) throw new Error('unsupported')
    await context.resume()
    transport = await openFinalTranscription(signal, fail)
    await context.audioWorklet.addModule(new URL('./voice-pcm-worklet.js', import.meta.url))
    if (closed || signal.aborted) throw new Error('Cancelled')
    clearTimeout(timeout)
    processor = new AudioWorkletNode(context, 'voice-pcm', {
      channelCount: 1,
      channelCountMode: 'explicit',
      processorOptions: { maxSamples: DICTATION_LIMIT_SECONDS * 16000 },
    })
    processor.onprocessorerror = fail
    processor.port.onmessage = (event: MessageEvent<unknown>) => {
      if (closed) return
      if (event.data instanceof ArrayBuffer) {
        try {
          transport?.send(event.data)
        } catch {
          fail()
        }
      } else if ((event.data as { type?: string } | null)?.type === 'stopped') {
        audioStopped = true
        stopAck?.()
      } else if ((event.data as { type?: string } | null)?.type === 'limit') {
        reachedLimit()
      }
    }
    source = context.createMediaStreamSource(stream)
    source.connect(processor)
    // The worklet outputs silence; connecting it keeps the processing graph active.
    processor.connect(context.destination)
    warningTimer = setTimeout(
      () => {
        if (!closed && !finalPromise) events.onNearLimit?.()
      },
      (DICTATION_LIMIT_SECONDS - 30) * 1000,
    )
    recordingLimit = setTimeout(reachedLimit, DICTATION_LIMIT_SECONDS * 1000)
    return { close, finish }
  } catch (error) {
    close()
    throw error
  }
}
