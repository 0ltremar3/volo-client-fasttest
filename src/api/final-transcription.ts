import { getAccessToken } from '@/api/auth-session'
import { getWebSocketUrl } from '@/api/client'
import { getLocale } from '@/lib/locale'

export type FinalTranscription = {
  send: (audio: ArrayBuffer) => void
  finish: () => Promise<string>
  close: () => void
}

export function openFinalTranscription(signal: AbortSignal, onFailure: () => void) {
  return new Promise<FinalTranscription>((resolve, reject) => {
    const token = getAccessToken()
    if (!token || signal.aborted) {
      reject(new Error('Authentication required or cancelled'))
      return
    }
    const socket = new WebSocket(
      getWebSocketUrl(
        `/v2/voice/transcriptions/stream?mode=final&language=auto&primary_language=${getLocale()}`,
      ),
    )
    let ready = false
    let done = false
    let finishing = false
    let bytes = 0
    let resolveFinal: ((text: string) => void) | undefined
    let rejectFinal: ((error: Error) => void) | undefined
    let finalPromise: Promise<string> | undefined
    let timer = setTimeout(() => fail(), 10_000)
    const abort = () => fail()
    const cleanup = () => {
      clearTimeout(timer)
      signal.removeEventListener('abort', abort)
      socket.close()
    }
    function fail() {
      if (done) return
      done = true
      const error = new Error('Voice transcription failed')
      reject(error)
      rejectFinal?.(error)
      cleanup()
      if (ready) onFailure()
    }
    signal.addEventListener('abort', abort, { once: true })
    socket.addEventListener('open', () => {
      if (done) return
      socket.send(
        JSON.stringify({
          type: 'authenticate',
          token,
          time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      )
    })
    socket.addEventListener('error', fail)
    socket.addEventListener('close', fail)
    socket.addEventListener('message', (event) => {
      if (done) return
      try {
        if (typeof event.data !== 'string') throw new Error('Invalid response')
        const payload = JSON.parse(event.data) as Record<string, unknown>
        if (payload.type === 'ready' && !ready) {
          ready = true
          clearTimeout(timer)
          resolve({
            send(audio) {
              if (
                done ||
                finishing ||
                socket.readyState !== WebSocket.OPEN ||
                socket.bufferedAmount > 1_048_576
              ) {
                fail()
                throw new Error('Voice stream unavailable')
              }
              bytes += audio.byteLength
              if (bytes > 300 * 32000) {
                fail()
                throw new Error('Recording too long')
              }
              socket.send(audio)
            },
            finish() {
              if (finalPromise) return finalPromise
              if (done) return Promise.reject(new Error('Voice stream unavailable'))
              finishing = true
              finalPromise = new Promise<string>((resolveText, rejectText) => {
                resolveFinal = resolveText
                rejectFinal = rejectText
              })
              timer = setTimeout(fail, 35_000)
              socket.send(JSON.stringify({ type: 'finish' }))
              return finalPromise
            },
            close: fail,
          })
        } else if (payload.type === 'interim') {
          // A preview is never authoritative and never becomes a message.
          return
        } else if (
          finishing &&
          payload.type === 'final' &&
          typeof payload.text === 'string' &&
          payload.text.length <= 100_000 &&
          typeof payload.duration === 'number' &&
          Number.isFinite(payload.duration) &&
          Math.abs(payload.duration * 32000 - bytes) <= 1
        ) {
          done = true
          resolveFinal?.(payload.text)
          cleanup()
        } else {
          fail()
        }
      } catch {
        fail()
      }
    })
  })
}
