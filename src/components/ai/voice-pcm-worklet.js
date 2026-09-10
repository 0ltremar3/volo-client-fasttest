/* global AudioWorkletProcessor, registerProcessor */
class VoicePcmProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.samples = new DataView(new ArrayBuffer(3200))
    this.length = 0
    this.stopped = false
    this.port.onmessage = () => {
      this.stopped = true
      this.flush()
      this.port.postMessage({ type: 'stopped' })
    }
  }
  flush() {
    if (!this.length) return
    const audio = this.samples.buffer.slice(0, this.length * 2)
    this.port.postMessage(audio, [audio])
    this.length = 0
  }
  process(inputs) {
    if (this.stopped) return false
    const input = inputs[0]?.[0]
    if (input) {
      for (const sample of input) {
        const value = Math.max(-1, Math.min(1, sample))
        this.samples.setInt16(
          this.length++ * 2,
          Math.round(value * (value < 0 ? 32768 : 32767)),
          true,
        )
        if (this.length === 1600) this.flush()
      }
    }
    return true
  }
}
registerProcessor('voice-pcm', VoicePcmProcessor)
