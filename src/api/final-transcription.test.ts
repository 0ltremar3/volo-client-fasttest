import { afterEach, expect, it, vi } from 'vitest'
import { openFinalTranscription } from './final-transcription'

vi.mock('@/api/auth-session', () => ({
  getAccessToken: () => 'test-token',
  clearAccessToken: vi.fn(),
}))

afterEach(() => {
  vi.unstubAllGlobals()
})

it('uploads one authenticated WAV only after stop, preserving every frame', async () => {
  const fetchMock = vi.fn(() =>
    Promise.resolve(
      new Response(JSON.stringify({ text: '早上9点。明天呢？' }), {
        headers: { 'content-type': 'application/json' },
      }),
    ),
  )
  vi.stubGlobal('fetch', fetchMock)
  const fail = vi.fn()
  const stream = await openFinalTranscription(new AbortController().signal, fail)
  stream.send(new Uint8Array([1, 2, 3, 4]).buffer)
  stream.send(new Uint8Array([5, 6]).buffer)
  expect(fetchMock).not.toHaveBeenCalled()
  const result = stream.finish()
  expect(stream.finish()).toBe(result)
  expect(await result).toBe('早上9点。明天呢？')
  expect(fetchMock).toHaveBeenCalledTimes(1)
  const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
  expect(url).toContain('/v2/voice/transcriptions?language=auto&provider=groq')
  expect(new Headers(init.headers).get('Authorization')).toBe('Bearer test-token')
  const wav = new DataView(await (init.body as Blob).arrayBuffer())
  expect(wav.getUint32(24, true)).toBe(16000)
  expect(wav.getUint32(40, true)).toBe(6)
  expect(Array.from(new Uint8Array(wav.buffer, 44))).toEqual([1, 2, 3, 4, 5, 6])
  stream.close()
  expect(fail).not.toHaveBeenCalled()
})

it('cancels buffered audio without uploading', async () => {
  const fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  const controller = new AbortController()
  const stream = await openFinalTranscription(controller.signal, vi.fn())
  stream.send(new ArrayBuffer(3200))
  controller.abort()
  await expect(stream.finish()).rejects.toThrow()
  expect(fetchMock).not.toHaveBeenCalled()
})

it('aborts an in-flight upload and never returns late text', async () => {
  let requestSignal: AbortSignal | undefined
  let resolveRequest: (response: Response) => void = () => undefined
  vi.stubGlobal(
    'fetch',
    vi.fn((_url, init: RequestInit) => {
      requestSignal = init.signal ?? undefined
      return new Promise<Response>((resolve) => {
        resolveRequest = resolve
      })
    }),
  )
  const controller = new AbortController()
  const stream = await openFinalTranscription(controller.signal, vi.fn())
  stream.send(new ArrayBuffer(3200))
  const result = stream.finish()
  controller.abort()
  expect(requestSignal?.aborted).toBe(true)
  resolveRequest(
    new Response(JSON.stringify({ text: 'late text' }), {
      headers: { 'content-type': 'application/json' },
    }),
  )
  await expect(result).rejects.toThrow('Cancelled')
})

it.each(['', null, 'x'.repeat(100001)])('rejects empty or invalid transcripts', async (text) => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ text }), { headers: { 'content-type': 'application/json' } }),
      ),
    ),
  )
  const fail = vi.fn()
  const stream = await openFinalTranscription(new AbortController().signal, fail)
  stream.send(new ArrayBuffer(3200))
  await expect(stream.finish()).rejects.toThrow()
  expect(fail).toHaveBeenCalledOnce()
})
