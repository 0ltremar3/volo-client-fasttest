import { afterEach, describe, expect, it, vi } from 'vitest'

import { clearAccessToken } from '@/api/auth-session'
import { streamVoloCoachPost } from '@/api/sse'
import { authApi, reviewApi } from '@/api/volo'

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

describe('email OTP session contract', () => {
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
