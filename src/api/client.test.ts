import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { clearAccessToken } from '@/api/auth-session'
import { streamVoloCoachPost } from '@/api/sse'
import { authApi, reviewApi, voiceApi } from '@/api/volo'

beforeEach(() => {
  vi.stubGlobal('localStorage', createStorage())
  vi.stubGlobal('sessionStorage', createStorage())
})

afterEach(() => {
  clearAccessToken()
  vi.unstubAllGlobals()
})

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function requestHeaders(call: unknown[] | undefined) {
  return new Headers((call?.[1] as RequestInit | undefined)?.headers)
}

function requestBody(call: unknown[] | undefined) {
  return (call?.[1] as RequestInit | undefined)?.body
}

function createStorage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() {
      return values.size
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  }
}

describe('email OTP session contract', () => {
  it('keeps a remembered token across browser sessions without changing the backend request', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ token: 'session-token', user: { email: 'alex@example.com' } }),
      )
    vi.stubGlobal('fetch', fetchMock)

    await authApi.signIn('alex@example.com', '123456', true)

    expect(localStorage.getItem('volo-access-token')).toBe('session-token')
    expect(sessionStorage.getItem('volo-access-token')).toBeNull()
    expect(JSON.parse(requestBody(fetchMock.mock.calls[0]) as string)).toEqual({
      email: 'alex@example.com',
      otp: '123456',
    })
  })

  it('keeps a non-remembered token in the current browser session only', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ token: 'session-token', user: { email: 'alex@example.com' } }),
      )
    vi.stubGlobal('fetch', fetchMock)

    await authApi.signIn('alex@example.com', '123456')

    expect(sessionStorage.getItem('volo-access-token')).toBe('session-token')
    expect(localStorage.getItem('volo-access-token')).toBeNull()
  })

  it('sends the sign-in token as Authorization on the following /v1/me request', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ token: 'session-token', user: { email: 'alex@example.com' } }),
      )
      .mockResolvedValueOnce(jsonResponse({ profile: { display_name: '' } }))
    vi.stubGlobal('fetch', fetchMock)

    await authApi.signIn('alex@example.com', '123456')
    await authApi.me()

    expect(requestHeaders(fetchMock.mock.calls[0]).get('Authorization')).toBeNull()
    expect(requestHeaders(fetchMock.mock.calls[1]).get('Authorization')).toBe(
      'Bearer session-token',
    )
  })

  it('updates only the display name through the account profile endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse({
        display_name: 'Jiayu',
        age_range: null,
        current_status: null,
        goal_clarity: null,
        onboarding_goal_text: null,
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await authApi.updateProfile('Jiayu')

    expect(fetchMock.mock.calls[0]?.[0]).toContain('/v1/me/profile')
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'PATCH' })
    expect(JSON.parse(requestBody(fetchMock.mock.calls[0]) as string)).toEqual({
      display_name: 'Jiayu',
    })
  })

  it('sends the stored Bearer token on Coach SSE requests', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ token: 'session-token', user: { email: 'alex@example.com' } }),
      )
      .mockResolvedValueOnce(
        new Response(
          'event: assistant_message_done\ndata: {"id":"a","role":"assistant","body":"Hi","sequence":2,"client_temp_id":null,"model_provider":null,"model_name":null,"created_at":"now"}\n\nevent: done\ndata: {}\n\n',
          {
            headers: { 'Content-Type': 'text/event-stream' },
          },
        ),
      )
    vi.stubGlobal('fetch', fetchMock)

    await authApi.signIn('alex@example.com', '123456')
    await streamVoloCoachPost('/v2/coach/sessions/s1/messages/stream', {}, () => undefined)

    expect(requestHeaders(fetchMock.mock.calls[1]).get('Authorization')).toBe(
      'Bearer session-token',
    )
  })

  it('clears the stored token after a 401 so the next request is unauthenticated', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ token: 'session-token', user: { email: 'alex@example.com' } }),
      )
      .mockResolvedValueOnce(jsonResponse({ error: { code: 'UNAUTHORIZED' } }, 401))
      .mockResolvedValueOnce(jsonResponse({ profile: { display_name: '' } }))
    vi.stubGlobal('fetch', fetchMock)

    await authApi.signIn('alex@example.com', '123456')
    await expect(authApi.me()).rejects.toMatchObject({ status: 401 })
    await authApi.me()

    expect(requestHeaders(fetchMock.mock.calls[2]).get('Authorization')).toBeNull()
  })
})

describe('Review API contract', () => {
  it('deletes the encoded Review id with DELETE', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ id: 'review/id', status: 'deleted' }))
    vi.stubGlobal('fetch', fetchMock)

    await reviewApi.delete('review/id')

    expect(fetchMock.mock.calls[0]?.[0]).toContain('/v2/review/review%2Fid')
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'DELETE' })
  })
})

describe('Voice transcription API contract', () => {
  it('posts the raw audio blob with its MIME type and Bearer token', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ token: 'session-token' }))
      .mockResolvedValueOnce(jsonResponse({ text: '今天想先整理计划', language: 'zh' }))
    vi.stubGlobal('fetch', fetchMock)
    await authApi.signIn('alex@example.com', '123456')
    const audio = new Blob(['audio'], { type: 'audio/webm' })

    await expect(voiceApi.transcribe(audio)).resolves.toMatchObject({
      text: '今天想先整理计划',
    })

    expect(fetchMock.mock.calls[1]?.[0]).toContain('/v2/voice/transcriptions?language=auto')
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: 'POST', body: audio })
    expect(requestHeaders(fetchMock.mock.calls[1]).get('Authorization')).toBe(
      'Bearer session-token',
    )
    expect(requestHeaders(fetchMock.mock.calls[1]).get('Content-Type')).toBe('audio/webm')
  })

  it('authenticates the caption socket and forwards interim text', async () => {
    class FakeWebSocket extends EventTarget {
      static readonly OPEN = 1
      static current: FakeWebSocket | undefined
      readonly sent: unknown[] = []
      readyState = 0

      constructor(readonly url: string) {
        super()
        queueMicrotask(() => {
          this.readyState = FakeWebSocket.OPEN
          this.dispatchEvent(new Event('open'))
        })
        FakeWebSocket.current = this
      }

      send(data: unknown) {
        this.sent.push(data)
        const message = typeof data === 'string' ? (JSON.parse(data) as { type?: unknown }) : null
        if (message?.type === 'authenticate') {
          queueMicrotask(() => this.message({ type: 'ready' }))
        }
      }

      close() {
        this.readyState = 3
        this.dispatchEvent(new Event('close'))
      }

      message(payload: object) {
        this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(payload) }))
      }
    }

    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ token: 'session-token' }))
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('window', { location: { href: 'http://127.0.0.1:5173/chat' } })
    vi.stubGlobal('WebSocket', FakeWebSocket)
    await authApi.signIn('alex@example.com', '123456')
    const onInterim = vi.fn()

    const stream = await voiceApi.streamTranscription(onInterim)
    const socket = FakeWebSocket.current
    expect(socket?.url).toBe('ws://127.0.0.1:8000/v2/voice/transcriptions/stream')
    expect(JSON.parse(socket?.sent[0] as string)).toMatchObject({
      type: 'authenticate',
      token: 'session-token',
    })

    socket?.message({ type: 'interim', text: '正在识别' })
    stream.send(new ArrayBuffer(4))
    stream.finish()
    expect(onInterim).toHaveBeenCalledWith('正在识别')
    expect(socket?.sent.some((item) => item instanceof ArrayBuffer)).toBe(true)
    expect(socket?.sent.some((item) => typeof item === 'string' && item.includes('finish'))).toBe(
      true,
    )
  })
})
