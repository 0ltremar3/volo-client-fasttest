import { afterEach, describe, expect, it, vi } from 'vitest'

import { streamVoloCoachPost, VoloCoachStreamError, type VoloCoachStreamEvent } from '@/api/sse'

afterEach(() => vi.unstubAllGlobals())

function byteStream(source: string) {
  const bytes = new TextEncoder().encode(source)
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const byte of bytes) controller.enqueue(Uint8Array.of(byte))
      controller.close()
    },
  })
}

describe('Volo Coach SSE', () => {
  it('parses arbitrarily split CRLF, UTF-8, multiline data, and a trailing event', async () => {
    const assistant = {
      id: 'assistant-1',
      role: 'assistant' as const,
      body: '你好',
      sequence: 3,
      client_temp_id: null,
      model_provider: 'fake',
      model_name: 'test',
      created_at: '2026-08-30T12:00:00.000Z',
    }
    const source = [
      'event: user_message_stored\r\ndata: {"message_id":"user-1","sequence":2}\r\n\r\n',
      'event: assistant_delta\r\ndata: {"text":\r\ndata: "你好"}\r\n\r\n',
      `event: assistant_message_done\r\ndata: ${JSON.stringify(assistant)}\r\n\r\n`,
      'event: done\r\ndata: {}',
    ].join('')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(byteStream(source), {
          headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
        }),
      ),
    )
    const events: VoloCoachStreamEvent[] = []

    await streamVoloCoachPost('/stream', {}, (event) => events.push(event))

    expect(events.map((event) => event.event)).toEqual([
      'user_message_stored',
      'assistant_delta',
      'assistant_message_done',
      'done',
    ])
    expect(events[1]).toEqual({ event: 'assistant_delta', data: { text: '你好' } })
  })

  it('rejects a non-SSE response', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(new Response('{}', { headers: { 'Content-Type': 'application/json' } })),
    )

    await expect(streamVoloCoachPost('/stream', {}, () => undefined)).rejects.toMatchObject({
      code: 'INVALID_CONTENT_TYPE',
    })
  })

  it('requires done before EOF', async () => {
    const source =
      'event: assistant_message_done\ndata: {"id":"a","role":"assistant","body":"Hi","sequence":2,"client_temp_id":null,"model_provider":null,"model_name":null,"created_at":"now"}\n\n'
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(byteStream(source), { headers: { 'Content-Type': 'text/event-stream' } }),
        ),
    )

    await expect(streamVoloCoachPost('/stream', {}, () => undefined)).rejects.toMatchObject({
      code: 'STREAM_INCOMPLETE',
    })
  })

  it('requires an assistant message before successful completion', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(byteStream('event: done\ndata: {}\n\n'), {
          headers: { 'Content-Type': 'text/event-stream' },
        }),
      ),
    )

    await expect(streamVoloCoachPost('/stream', {}, () => undefined)).rejects.toMatchObject({
      code: 'ASSISTANT_MESSAGE_MISSING',
    })
  })

  it('turns an error event into a coded error immediately', async () => {
    const onEvent = vi.fn()
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            byteStream(
              'event: error\ndata: {"code":"UPSTREAM_TIMEOUT","message":"Try again"}\n\n' +
                'event: done\ndata: {}\n\n',
            ),
            { headers: { 'Content-Type': 'text/event-stream' } },
          ),
        ),
    )

    await expect(streamVoloCoachPost('/stream', {}, onEvent)).rejects.toEqual(
      new VoloCoachStreamError('UPSTREAM_TIMEOUT', 'Try again'),
    )
    expect(onEvent).not.toHaveBeenCalled()
  })
})
