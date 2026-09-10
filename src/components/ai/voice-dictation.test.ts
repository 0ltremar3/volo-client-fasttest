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
