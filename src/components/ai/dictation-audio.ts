export function encodePcm16(input: Float32Array, inputSampleRate: number) {
  const ratio = inputSampleRate / 16_000
  const output = new ArrayBuffer(Math.floor(input.length / ratio) * 2)
  const view = new DataView(output)
  for (let index = 0; index < output.byteLength / 2; index += 1) {
    const start = Math.floor(index * ratio)
    const end = Math.max(start + 1, Math.floor((index + 1) * ratio))
    let sum = 0
    for (let sourceIndex = start; sourceIndex < end; sourceIndex += 1) {
      sum += input[sourceIndex] ?? 0
    }
    const sample = Math.max(-1, Math.min(1, sum / (end - start)))
    view.setInt16(index * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
  }
  return output
}

export function mergeDictationDraft(base: string, transcript: string) {
  return base.trim() ? `${base.trimEnd()} ${transcript.trim()}` : transcript.trim()
}
