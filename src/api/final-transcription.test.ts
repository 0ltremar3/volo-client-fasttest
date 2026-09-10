import { afterEach, expect, it, vi } from 'vitest'
import { openFinalTranscription } from './final-transcription'

vi.mock('@/api/auth-session', () => ({ getAccessToken: () => 'test-token' }))
vi.mock('@/api/client', () => ({ getWebSocketUrl: (path: string) => `ws://test${path}` }))
vi.mock('@/lib/locale', () => ({ getLocale: () => 'zh' }))

class Socket extends EventTarget {
  static OPEN = 1
  static current: Socket
  readyState = 1
  bufferedAmount = 0
  sent: unknown[] = []
  constructor(readonly url: string) {
    super()
    Socket.current = this
    queueMicrotask(() => this.dispatchEvent(new Event('open')))
  }
  send(data: unknown) {
    this.sent.push(data)
    if (typeof data === 'string' && data.includes('authenticate')) {
      queueMicrotask(() => this.message({ type: 'ready' }))
    }
  }
  message(payload: object) {
    this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(payload) }))
  }
  close() {
    this.readyState = 3
    this.dispatchEvent(new Event('close'))
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

it('streams PCM and waits for punctuated final after finish, ignoring interim', async () => {
  vi.stubGlobal('WebSocket', Socket)
  const fail = vi.fn()
  const stream = await openFinalTranscription(new AbortController().signal, fail)
  const socket = Socket.current
  expect(socket.url).toContain('?mode=final&language=auto')
  expect(socket.url).toContain('&primary_language=zh')
  expect(JSON.parse(socket.sent[0] as string)).toMatchObject({
    type: 'authenticate',
    token: 'test-token',
  })
  stream.send(new ArrayBuffer(3200))
  const result = stream.finish()
  expect(stream.finish()).toBe(result)
  const resolved = vi.fn()
  void result.then(resolved)
  socket.message({ type: 'interim', text: '不应发送' })
  await Promise.resolve()
  expect(resolved).not.toHaveBeenCalled()
  socket.message({ type: 'final', text: '早上9点。明天呢？', duration: 0.1 })
  expect(await result).toBe('早上9点。明天呢？')
  expect(socket.sent.at(-1)).toBe('{"type":"finish"}')
  expect(socket.readyState).toBe(3)
  expect(fail).not.toHaveBeenCalled()
})

it.each(['close', 'abort', 'timeout', 'truncated'])(
  'fails instead of sending partial text on %s',
  async (reason) => {
    vi.useFakeTimers()
    vi.stubGlobal('WebSocket', Socket)
    const controller = new AbortController()
    const fail = vi.fn()
    const stream = await openFinalTranscription(controller.signal, fail)
    stream.send(new ArrayBuffer(3200))
    const result = stream.finish()
    const rejected = expect(result).rejects.toThrow()
    if (reason === 'close') Socket.current.close()
    if (reason === 'abort') controller.abort()
    if (reason === 'timeout') await vi.advanceTimersByTimeAsync(35000)
    if (reason === 'truncated') Socket.current.message({ type: 'final', text: '少字', duration: 0 })
    await rejected
    expect(fail).toHaveBeenCalledOnce()
  },
)
