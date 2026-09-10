import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { expect, it } from 'vitest'

it('sends ordered little-endian PCM including tail before stop acknowledgement', () => {
  const messages: unknown[] = []
  type Processor = {
    process: (inputs: Float32Array[][]) => boolean
    port: { onmessage: () => void }
  }
  let Factory: (new () => Processor) | undefined
  class Base {
    port = { postMessage: (data: unknown) => messages.push(data) }
  }
  runInNewContext(readFileSync(new URL('./voice-pcm-worklet.js', import.meta.url), 'utf8'), {
    AudioWorkletProcessor: Base,
    registerProcessor: (_name: string, processor: new () => Processor) => {
      Factory = processor
    },
    ArrayBuffer,
    DataView,
  })
  if (!Factory) throw new Error('Missing processor')
  const processor = new Factory()
  processor.process([[new Float32Array(1600).fill(1)]])
  processor.process([[new Float32Array([-1, 0, 0.5])]])
  processor.port.onmessage()
  expect(messages).toHaveLength(3)
  expect((messages[0] as ArrayBuffer).byteLength).toBe(3200)
  const tail = new DataView(messages[1] as ArrayBuffer)
  expect(tail.byteLength).toBe(6)
  expect([0, 2, 4].map((offset) => tail.getInt16(offset, true))).toEqual([-32768, 0, 16384])
  expect(messages[2]).toEqual({ type: 'stopped' })
  expect(processor.process([[new Float32Array([1])]])).toBe(false)
  expect(messages).toHaveLength(3)
})
