import { afterEach, expect, it, vi } from 'vitest'
import { openFinalTranscription } from '@/api/final-transcription'
import { startVoiceDictation } from './voice-dictation'

vi.mock('@/api/final-transcription', () => ({ openFinalTranscription: vi.fn() }))

class Context {
  sampleRate = 16000
  destination = {}
  resume = vi.fn().mockResolvedValue(undefined)
  close = vi.fn().mockResolvedValue(undefined)
  audioWorklet = { addModule: vi.fn().mockResolvedValue(undefined) }
  createMediaStreamSource = () => ({ connect: vi.fn(), disconnect: vi.fn() })
}
class Processor {
  connect = vi.fn()
  disconnect = vi.fn()
  port: { onmessage?: (event: { data: unknown }) => void; postMessage: () => void } = {
    postMessage: () => {
      this.port.onmessage?.({ data: new ArrayBuffer(2) })
      this.port.onmessage?.({ data: { type: 'stopped' } })
    },
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
  vi.clearAllMocks()
})

it('warns with 30 seconds left, then finishes once and keeps the final text at the limit', async () => {
  vi.useFakeTimers()
  vi.stubGlobal('AudioContext', Context)
  vi.stubGlobal('AudioWorkletNode', Processor)
  const order: string[] = []
  const transport = {
    send: vi.fn(() => order.push('tail')),
    finish: vi.fn(() => {
      order.push('finish')
      return Promise.resolve('到限保留的完整转写。')
    }),
    close: vi.fn(),
  }
  vi.mocked(openFinalTranscription).mockResolvedValue(transport)
  const fail = vi.fn(),
    warning = vi.fn(),
    stop = vi.fn()
  const session = await startVoiceDictation(
    { getTracks: () => [{ stop }] } as unknown as MediaStream,
    new AbortController().signal,
    fail,
    { onNearLimit: warning },
  )
  await vi.advanceTimersByTimeAsync(194999)
  expect(warning).not.toHaveBeenCalled()
  await vi.advanceTimersByTimeAsync(1)
  expect(warning).toHaveBeenCalledOnce()
  await vi.advanceTimersByTimeAsync(30000)
  expect(await session.finish()).toBe('到限保留的完整转写。')
  expect(await session.finish()).toBe('到限保留的完整转写。')
  expect(order).toEqual(['tail', 'finish'])
  expect(transport.finish).toHaveBeenCalledOnce()
  expect(stop).toHaveBeenCalled()
  expect(fail).not.toHaveBeenCalled()
})

it('clears reminder and auto-finish when cancelled', async () => {
  vi.useFakeTimers()
  vi.stubGlobal('AudioContext', Context)
  vi.stubGlobal('AudioWorkletNode', Processor)
  const transport = { send: vi.fn(), finish: vi.fn(), close: vi.fn() }
  vi.mocked(openFinalTranscription).mockResolvedValue(transport)
  const warning = vi.fn(),
    limit = vi.fn()
  const session = await startVoiceDictation(
    { getTracks: () => [{ stop: vi.fn() }] } as unknown as MediaStream,
    new AbortController().signal,
    vi.fn(),
    { onNearLimit: warning, onLimit: limit },
  )
  session.close()
  await vi.advanceTimersByTimeAsync(230000)
  expect(warning).not.toHaveBeenCalled()
  expect(limit).not.toHaveBeenCalled()
  expect(transport.finish).not.toHaveBeenCalled()
})

it('flushes final PCM before finish and releases microphone after success', async () => {
  vi.stubGlobal('AudioContext', Context)
  vi.stubGlobal('AudioWorkletNode', Processor)
  const order: string[] = []
  const transport = {
    send: () => order.push('tail'),
    finish: () => {
      order.push('finish')
      return Promise.resolve('完成。')
    },
    close: vi.fn(),
  }
  vi.mocked(openFinalTranscription).mockResolvedValue(transport)
  const stop = vi.fn()
  const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream
  const session = await startVoiceDictation(stream, new AbortController().signal, vi.fn())
  expect(await session.finish()).toBe('完成。')
  expect(order).toEqual(['tail', 'finish'])
  expect(stop).toHaveBeenCalled()
  expect(transport.close).toHaveBeenCalledOnce()
})

it('cancels without requesting a final transcript', async () => {
  vi.stubGlobal('AudioContext', Context)
  vi.stubGlobal('AudioWorkletNode', Processor)
  const transport = { send: vi.fn(), finish: vi.fn(), close: vi.fn() }
  vi.mocked(openFinalTranscription).mockResolvedValue(transport)
  const stop = vi.fn()
  const controller = new AbortController()
  const session = await startVoiceDictation(
    { getTracks: () => [{ stop }] } as unknown as MediaStream,
    controller.signal,
    vi.fn(),
  )
  controller.abort()
  await expect(session.finish()).rejects.toThrow()
  expect(transport.finish).not.toHaveBeenCalled()
  expect(stop).toHaveBeenCalled()
  expect(transport.close).toHaveBeenCalledOnce()
})

it('reports stalled audio initialization and releases the microphone', async () => {
  vi.useFakeTimers()
  class SuspendedContext extends Context {
    resume = vi.fn(() => new Promise<void>(() => undefined))
  }
  vi.stubGlobal('AudioContext', SuspendedContext)
  vi.stubGlobal('AudioWorkletNode', Processor)
  const stop = vi.fn()
  const fail = vi.fn()
  void startVoiceDictation(
    { getTracks: () => [{ stop }] } as unknown as MediaStream,
    new AbortController().signal,
    fail,
  )
  await vi.advanceTimersByTimeAsync(10000)
  expect(stop).toHaveBeenCalled()
  expect(fail).toHaveBeenCalledOnce()
})
