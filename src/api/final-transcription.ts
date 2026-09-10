import { getAccessToken } from '@/api/auth-session'
import { apiFetch } from '@/api/client'

export type FinalTranscription = {
  send: (audio: ArrayBuffer) => void
  finish: () => Promise<string>
  close: () => void
}

export function openFinalTranscription(
  signal: AbortSignal,
  onFailure: () => void,
): Promise<FinalTranscription> {
  if (!getAccessToken() || signal.aborted)
    return Promise.reject(new Error('Authentication required or cancelled'))
  let chunks: Uint8Array[] = []
  let bytes = 0
  let closed = false
  let finalPromise: Promise<string> | undefined
  const controller = new AbortController()
  const close = () => {
    if (closed) return
    closed = true
    chunks = []
    controller.abort()
    signal.removeEventListener('abort', close)
  }
  signal.addEventListener('abort', close, { once: true })
  return Promise.resolve<FinalTranscription>({
    close,
    send(audio) {
      if (closed || finalPromise || !audio.byteLength || audio.byteLength % 2) {
        throw new Error('Invalid recording state or PCM frame')
      }
      if (bytes + audio.byteLength > 300 * 32000) throw new Error('Recording too long')
      chunks.push(new Uint8Array(audio.slice(0)))
      bytes += audio.byteLength
    },
    finish() {
      if (finalPromise) return finalPromise
      if (closed || !bytes) return Promise.reject(new Error('Recording cancelled or empty'))
      // Include the worklet's acknowledged final short frame in the complete WAV.
      const buffer = new ArrayBuffer(44 + bytes)
      const view = new DataView(buffer)
      const label = (offset: number, value: string) => {
        for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i))
      }
      label(0, 'RIFF')
      view.setUint32(4, bytes + 36, true)
      label(8, 'WAVEfmt ')
      view.setUint32(16, 16, true)
      view.setUint16(20, 1, true)
      view.setUint16(22, 1, true)
      view.setUint32(24, 16000, true)
      view.setUint32(28, 32000, true)
      view.setUint16(32, 2, true)
      view.setUint16(34, 16, true)
      label(36, 'data')
      view.setUint32(40, bytes, true)
      const pcm = new Uint8Array(buffer)
      let offset = 44
      for (const chunk of chunks) {
        pcm.set(chunk, offset)
        offset += chunk.length
      }
      chunks = []
      finalPromise = apiFetch<unknown>('/v2/voice/transcriptions?language=auto&provider=groq', {
        method: 'POST',
        headers: { 'Content-Type': 'audio/wav' },
        body: new Blob([buffer], { type: 'audio/wav' }),
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(65000)]),
      })
        .then((result) => {
          if (closed || signal.aborted) throw new Error('Cancelled')
          if (
            !result ||
            typeof result !== 'object' ||
            !('text' in result) ||
            typeof result.text !== 'string' ||
            !result.text.trim() ||
            result.text.length > 100000
          ) {
            throw new Error('Invalid or empty transcript')
          }
          return result.text
        })
        .catch((error: unknown) => {
          if (!closed && !signal.aborted) onFailure()
          throw error
        })
        .finally(close)
      return finalPromise
    },
  })
}
