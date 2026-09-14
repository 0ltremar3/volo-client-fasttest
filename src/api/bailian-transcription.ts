import { apiFetch, ApiError, bailianAsrFetch } from '@/api/client'

const endpoint =
  'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation'
const model = 'qwen-audio-3.0-asr-flash'
type Credential = {
  token: string
  expires_at: number
  endpoint: string
  model: string
  max_audio_bytes: number
}

export async function transcribeBailianDirect(audio: Blob, cancellation?: AbortSignal) {
  const signal = AbortSignal.any([
    AbortSignal.timeout(90000),
    ...(cancellation ? [cancellation] : []),
  ])
  const formats: Record<string, string> = {
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/mpeg': 'mp3',
    'audio/flac': 'flac',
    'audio/x-flac': 'flac',
    'audio/mp4': 'm4a',
    'audio/x-m4a': 'm4a',
    'audio/ogg': 'ogg',
  }
  const format = formats[audio.type]
  if (!format || !audio.size || audio.size > 7400000)
    throw new Error('Invalid audio format or size')
  signal.throwIfAborted()
  const bytes = new Uint8Array(await audio.arrayBuffer())
  const parts: string[] = []
  for (let offset = 0; offset < bytes.length; offset += 32768) {
    parts.push(String.fromCharCode(...bytes.subarray(offset, offset + 32768)))
  }
  const body = JSON.stringify({
    model,
    input: {
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'input_audio',
              input_audio: { data: `data:${audio.type};base64,${btoa(parts.join(''))}` },
            },
          ],
        },
      ],
    },
    parameters: { format },
  })
  // Fetch credentials only after the recording and encoding have finished.
  for (let attempt = 0; attempt < 2; attempt++) {
    signal.throwIfAborted()
    const value = await apiFetch<unknown>('/v2/voice/transcriptions/credentials', {
      method: 'POST',
      body: '{}',
      signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
    })
    const credential = value as Partial<Credential> | null
    if (
      !credential ||
      typeof credential.token !== 'string' ||
      !/^st-[\x21-\x7e]+$/.test(credential.token) ||
      credential.token.length > 4096 ||
      typeof credential.expires_at !== 'number' ||
      !Number.isFinite(credential.expires_at) ||
      credential.expires_at * 1000 <= Date.now() + 5000 ||
      credential.expires_at * 1000 > Date.now() + 240000 ||
      credential.endpoint !== endpoint ||
      credential.model !== model ||
      credential.max_audio_bytes !== 7400000
    ) {
      throw new Error('Invalid transcription credential')
    }
    signal.throwIfAborted()
    try {
      const result = (await bailianAsrFetch(credential.token, body, signal)) as {
        output?: { text?: unknown }
        usage?: { duration?: unknown }
      } | null
      signal.throwIfAborted()
      if (
        !result ||
        typeof result.output?.text !== 'string' ||
        !result.output.text.trim() ||
        result.output.text.length > 100000
      )
        throw new Error('Invalid or empty transcript')
      return {
        text: result.output.text,
        ...(typeof result.usage?.duration === 'number' &&
        Number.isFinite(result.usage.duration) &&
        result.usage.duration >= 0
          ? { duration: result.usage.duration }
          : {}),
      }
    } catch (error) {
      // Only refresh a rejected credential once. Never retry timeouts or uncertain paid work.
      if (attempt === 0 && error instanceof ApiError && error.status === 401 && !signal.aborted)
        continue
      throw error
    }
  }
  throw new Error('Transcription credential rejected')
}
