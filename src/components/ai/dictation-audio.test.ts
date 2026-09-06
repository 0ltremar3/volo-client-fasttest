import { describe, expect, it } from 'vitest'

import { encodePcm16, mergeDictationDraft } from '@/components/ai/dictation-audio'

describe('dictation PCM encoding', () => {
  it('downsamples 48 kHz float audio to little-endian 16 kHz PCM', () => {
    const encoded = encodePcm16(new Float32Array([1, 1, 1, -1, -1, -1]), 48_000)
    const view = new DataView(encoded)

    expect(encoded.byteLength).toBe(4)
    expect(view.getInt16(0, true)).toBe(0x7fff)
    expect(view.getInt16(2, true)).toBe(-0x8000)
  })

  it('replaces the spoken suffix while preserving the original draft', () => {
    expect(mergeDictationDraft('已有文字', '正在识别')).toBe('已有文字 正在识别')
    expect(mergeDictationDraft('已有文字', '最终结果')).toBe('已有文字 最终结果')
    expect(mergeDictationDraft('', '最终结果')).toBe('最终结果')
  })
})
