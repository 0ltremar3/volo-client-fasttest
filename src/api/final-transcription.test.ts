import { afterEach, expect, it, vi } from 'vitest'
import { openFinalTranscription } from './final-transcription'
import { transcribeBailianDirect } from './bailian-transcription'
vi.mock('@/api/auth-session', () => ({ getAccessToken: () => 'test-token' }))
vi.mock('./bailian-transcription', () => ({ transcribeBailianDirect: vi.fn() }))
afterEach(() => {
  vi.clearAllMocks()
})

it('keeps every PCM frame and invokes direct transcription only after finish', async () => {
  vi.mocked(transcribeBailianDirect).mockResolvedValue({ text: '早上9点。明天呢？' })
  const fail = vi.fn()
  const stream = await openFinalTranscription(new AbortController().signal, fail)
  stream.send(new Uint8Array([1, 2, 3, 4]).buffer)
  stream.send(new Uint8Array([5, 6]).buffer)
  expect(transcribeBailianDirect).not.toHaveBeenCalled()
  const result = stream.finish()
  expect(stream.finish()).toBe(result)
  expect(await result).toBe('早上9点。明天呢？')
  const blob = vi.mocked(transcribeBailianDirect).mock.calls[0]?.[0]
  if (!blob) throw new Error('Missing audio')
  const wav = new DataView(await blob.arrayBuffer())
  expect(wav.getUint32(24, true)).toBe(16000)
  expect(wav.getUint32(40, true)).toBe(6)
  expect(Array.from(new Uint8Array(wav.buffer, 44))).toEqual([1, 2, 3, 4, 5, 6])
  expect(transcribeBailianDirect).toHaveBeenCalledOnce()
  expect(fail).not.toHaveBeenCalled()
})

it('discards cancelled recordings without requesting credentials or transcription', async () => {
  const controller = new AbortController()
  const stream = await openFinalTranscription(controller.signal, vi.fn())
  stream.send(new ArrayBuffer(3200))
  controller.abort()
  await expect(stream.finish()).rejects.toThrow()
  expect(transcribeBailianDirect).not.toHaveBeenCalled()
})

it('aborts direct transcription and rejects late text', async () => {
  let resolveRequest: (value: { text: string }) => void = () => undefined
  vi.mocked(transcribeBailianDirect).mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveRequest = resolve
      }),
  )
  const controller = new AbortController()
  const stream = await openFinalTranscription(controller.signal, vi.fn())
  stream.send(new ArrayBuffer(3200))
  const result = stream.finish()
  controller.abort()
  expect(vi.mocked(transcribeBailianDirect).mock.calls[0]?.[1]?.aborted).toBe(true)
  resolveRequest({ text: 'late text' })
  await expect(result).rejects.toThrow('Cancelled')
})
