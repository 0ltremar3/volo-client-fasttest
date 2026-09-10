import { openFinalTranscription, type FinalTranscription } from '@/api/final-transcription'

export type VoiceDictation = { finish: () => Promise<string>; close: () => void }

export async function startVoiceDictation(
  stream: MediaStream,
  signal: AbortSignal,
  onFailure: () => void,
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
  let recordingLimit: ReturnType<typeof setTimeout> | undefined
  const releaseAudio = () => {
    source?.disconnect()
    processor?.disconnect()
    stream.getTracks().forEach((track) => track.stop())
    void context.close().catch(() => undefined)
    clearTimeout(recordingLimit)
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
        stopAck?.()
      }
    }
    source = context.createMediaStreamSource(stream)
    source.connect(processor)
    // The worklet outputs silence; connecting it keeps the processing graph active.
    processor.connect(context.destination)
    recordingLimit = setTimeout(fail, 295_000)
    return {
      close,
      async finish() {
        if (closed || !processor || !transport) throw new Error('Cancelled')
        try {
          await new Promise<void>((resolve, reject) => {
            stopAck = resolve
            stopReject = reject
            timeout = setTimeout(() => reject(new Error('Audio flush timed out')), 2000)
            processor?.port.postMessage({ type: 'stop' })
          })
          clearTimeout(timeout)
          releaseAudio()
          return await transport.finish()
        } finally {
          close()
        }
      },
    }
  } catch (error) {
    close()
    throw error
  }
}
