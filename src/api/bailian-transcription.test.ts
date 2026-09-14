import { afterEach, expect, it, vi } from 'vitest'
import { transcribeBailianDirect } from './bailian-transcription'
import { clearAccessToken } from './auth-session'
vi.mock('./auth-session', () => ({
  getAccessToken: () => 'app-session-secret',
  clearAccessToken: vi.fn(),
}))
const endpoint =
  'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation'
const credential = () => ({
  token: 'st-temporary',
  expires_at: Math.floor(Date.now() / 1000) + 180,
  endpoint,
  model: 'qwen-audio-3.0-asr-flash',
  max_audio_bytes: 7400000,
})
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } })
afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

it('sends only an empty credential request to AWS and audio only to Beijing with temporary auth', async () => {
  const mock = vi
    .fn()
    .mockResolvedValueOnce(json(credential()))
    .mockResolvedValueOnce(json({ output: { text: '你好，世界。' }, usage: { duration: 2 } }))
  vi.stubGlobal('fetch', mock)
  expect(await transcribeBailianDirect(new Blob(['audio'], { type: 'audio/wav' }))).toEqual({
    text: '你好，世界。',
    duration: 2,
  })
  const [appUrl, app] = mock.mock.calls[0] as [string, RequestInit]
  const [url, provider] = mock.mock.calls[1] as [string, RequestInit]
  expect(appUrl).toContain('/v2/voice/transcriptions/credentials')
  expect(app.body).toBe('{}')
  expect(new Headers(app.headers).get('Authorization')).toBe('Bearer app-session-secret')
  expect(url).toBe(endpoint)
  expect(provider.credentials).toBe('omit')
  expect(provider.referrerPolicy).toBe('no-referrer')
  expect(new Headers(provider.headers).get('Authorization')).toBe('Bearer st-temporary')
  expect(JSON.stringify(provider)).not.toContain('app-session-secret')
  expect(JSON.parse(provider.body as string)).toEqual({
    model: 'qwen-audio-3.0-asr-flash',
    input: {
      messages: [
        {
          role: 'user',
          content: [
            { type: 'input_audio', input_audio: { data: 'data:audio/wav;base64,YXVkaW8=' } },
          ],
        },
      ],
    },
    parameters: { format: 'wav' },
  })
})
it('refreshes one rejected token without clearing login', async () => {
  const mock = vi
    .fn()
    .mockResolvedValueOnce(json(credential()))
    .mockResolvedValueOnce(json({}, 401))
    .mockResolvedValueOnce(json(credential()))
    .mockResolvedValueOnce(json({ output: { text: '保留录音。' } }))
  vi.stubGlobal('fetch', mock)
  await expect(
    transcribeBailianDirect(new Blob(['audio'], { type: 'audio/wav' })),
  ).resolves.toEqual({ text: '保留录音。' })
  expect(mock).toHaveBeenCalledTimes(4)
  expect(clearAccessToken).not.toHaveBeenCalled()
  const first = mock.mock.calls[1] as [string, RequestInit]
  const retried = mock.mock.calls[3] as [string, RequestInit]
  expect(first[1].body).toBe(retried[1].body)
})
it.each([429, 500])('does not repeat potentially billed work on HTTP %s', async (status) => {
  const mock = vi
    .fn()
    .mockResolvedValueOnce(json(credential()))
    .mockResolvedValueOnce(json({}, status))
  vi.stubGlobal('fetch', mock)
  await expect(
    transcribeBailianDirect(new Blob(['audio'], { type: 'audio/wav' })),
  ).rejects.toMatchObject({ status })
  expect(mock).toHaveBeenCalledTimes(2)
})
it.each(['wrong-endpoint', 'expired', 'permanent-key'])(
  'rejects unsafe credential %s',
  async (scenario) => {
    const value = credential()
    if (scenario === 'wrong-endpoint') value.endpoint = 'https://evil.test'
    if (scenario === 'expired') value.expires_at = 1
    if (scenario === 'permanent-key') value.token = 'sk-permanent'
    const mock = vi.fn().mockResolvedValue(json(value))
    vi.stubGlobal('fetch', mock)
    await expect(
      transcribeBailianDirect(new Blob(['audio'], { type: 'audio/wav' })),
    ).rejects.toThrow('Invalid transcription credential')
    expect(mock).toHaveBeenCalledOnce()
  },
)
it('does not upload after cancellation during credential acquisition', async () => {
  let resolve: (value: Response) => void = () => undefined
  const mock = vi.fn(
    () =>
      new Promise<Response>((done) => {
        resolve = done
      }),
  )
  vi.stubGlobal('fetch', mock)
  const controller = new AbortController()
  const pending = transcribeBailianDirect(
    new Blob(['audio'], { type: 'audio/wav' }),
    controller.signal,
  )
  await vi.waitFor(() => expect(mock).toHaveBeenCalledOnce())
  controller.abort()
  resolve(json(credential()))
  await expect(pending).rejects.toThrow()
  expect(mock).toHaveBeenCalledOnce()
})
