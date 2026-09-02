import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { VoiceOverlay } from './voice-overlay'
import { deferVoiceRoomDisconnect, finishVoiceCall, voiceFailureCopy } from './voice-state'

const noOp = () => undefined

describe('VoiceOverlay', () => {
  it('renders a full-screen same-route dialog while connecting', () => {
    const html = renderToStaticMarkup(
      <VoiceOverlay
        details={null}
        loading
        requestError={false}
        onRetry={noOp}
        onClose={noOp}
        onCanonicalChange={noOp}
      />,
    )
    expect(html).toContain('role="dialog"')
    expect(html).toContain('fixed inset-0')
    expect(html).toContain('Continue with text')
    expect(html).not.toContain('语音会被转写并保存到当前对话，原始音频不会保存。')
    expect(html).not.toContain('camera')
    expect(html).not.toContain('screen share')
  })

  it('keeps a retry and text fallback available after token failure', () => {
    const html = renderToStaticMarkup(
      <VoiceOverlay
        details={null}
        loading={false}
        requestError
        onRetry={noOp}
        onClose={noOp}
        onCanonicalChange={noOp}
      />,
    )
    expect(html).toContain('Voice is unavailable')
    expect(html).toContain('Try again')
    expect(html).toContain('Continue with text')
  })

  it('describes worker disconnect as a retryable transcription failure', () => {
    expect(voiceFailureCopy('worker_disconnect')).toContain('transcription')
    expect(voiceFailureCopy('worker_disconnect')).toContain('reconnect')
    expect(voiceFailureCopy('worker_disconnect')).not.toContain('start this voice session')
    expect(voiceFailureCopy('worker_start')).toContain('did not become available')
  })

  it('disconnects microphone tracks before refreshing and closing on hangup', async () => {
    const order: string[] = []
    let composerFocused = false
    const room = {
      disconnect: vi.fn((stopTracks?: boolean) => {
        expect(stopTracks).toBe(true)
        order.push('disconnect')
        return Promise.resolve()
      }),
    }
    await finishVoiceCall(
      room,
      () => order.push('refresh'),
      () => {
        order.push('close')
        composerFocused = true
      },
    )
    expect(order).toEqual(['disconnect', 'refresh', 'close'])
    expect(composerFocused).toBe(true)
  })

  it('does not close the room during a Strict Mode effect restart', async () => {
    const room = { disconnect: vi.fn(() => Promise.resolve()) }
    const generation = { current: 1 }
    deferVoiceRoomDisconnect(room, generation, 1)
    generation.current = 2
    await Promise.resolve()
    expect(room.disconnect).not.toHaveBeenCalled()

    deferVoiceRoomDisconnect(room, generation, 2)
    await Promise.resolve()
    expect(room.disconnect).toHaveBeenCalledWith(true)
  })
})
