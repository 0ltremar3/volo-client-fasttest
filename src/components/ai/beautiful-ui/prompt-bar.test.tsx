import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import '@/i18n'
import { CoachPromptBar } from './prompt-bar'

const noOp = () => undefined

describe('CoachPromptBar dictation control', () => {
  it('renders the restored dictation entry as a 44px control', () => {
    const html = renderToStaticMarkup(<CoachPromptBar onSend={noOp} onDictationToggle={noOp} />)

    expect(html).toContain('aria-label="Start dictation"')
    expect(html).toContain('size-11')
  })

  it('exposes recording and transcription states', () => {
    const recording = renderToStaticMarkup(
      <CoachPromptBar onSend={noOp} onDictationToggle={noOp} dictationState="recording" />,
    )
    const transcribing = renderToStaticMarkup(
      <CoachPromptBar onSend={noOp} onDictationToggle={noOp} dictationState="transcribing" />,
    )

    expect(recording).toContain('aria-label="Stop and transcribe"')
    expect(recording).toContain('aria-pressed="true"')
    expect(transcribing).toContain('aria-label="Transcribing recording"')
    expect(transcribing).toContain('disabled=""')
  })

  it('keeps dictation read-only with a one-line minimum height', () => {
    const html = renderToStaticMarkup(
      <CoachPromptBar onSend={noOp} onDictationToggle={noOp} dictationState="recording" />,
    )

    expect(html).toContain('aria-live="polite"')
    expect(html).toContain('readOnly=""')
    expect(html).toContain('h-11 min-h-11')
    expect(html).toContain('coach-composer-input')
  })

  it('uses the supplied Coach icons in left-to-right order', () => {
    const html = renderToStaticMarkup(
      <CoachPromptBar onSend={noOp} onDictationToggle={noOp} onVoice={noOp} />,
    )

    expect(html.indexOf('data-coach-icon="inspiration"')).toBeLessThan(
      html.indexOf('data-coach-icon="mic"'),
    )
    expect(html.indexOf('data-coach-icon="mic"')).toBeLessThan(
      html.indexOf('data-coach-icon="voice"'),
    )
  })
})
