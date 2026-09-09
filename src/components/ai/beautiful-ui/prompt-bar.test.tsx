import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import '@/i18n'
import { CoachPromptBar } from './prompt-bar'

it('shows the voice-mode switch without the independent microphone', () => {
  const html = renderToStaticMarkup(
    <CoachPromptBar onSend={() => undefined} onVoice={() => undefined} />,
  )
  expect(html).toContain('Switch to voice input')
  expect(html).toContain('data-coach-icon="voice"')
  expect(html).not.toContain('data-coach-icon="mic"')
})
