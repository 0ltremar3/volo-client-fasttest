import { describe, expect, it } from 'vitest'

import { localizeCoachAssistantBody } from '@/features/coach/coach-message-copy'
import { i18n } from '@/i18n'

const opening = (description: string, withScheduleClaim = false) =>
  withScheduleClaim
    ? `Let us revisit your Move: "${description}". We will adjust its wording and keep its schedule unchanged.`
    : `Let us revisit your Move: "${description}".`

describe('localizeCoachAssistantBody', () => {
  it('keeps ordinary Coach replies unchanged', () => {
    expect(localizeCoachAssistantBody('What feels present?', i18n.getFixedT('zh', 'coach'))).toBe(
      'What feels present?',
    )
  })

  it('renders the stored Move rethink opening in the active locale', () => {
    const body = opening('出门')
    expect(localizeCoachAssistantBody(body, i18n.getFixedT('en', 'coach'))).toBe(body)
    expect(localizeCoachAssistantBody(body, i18n.getFixedT('zh', 'coach'))).toBe(
      '来重新想想这个 Move：「出门」。',
    )
  })

  it('drops the old schedule-unchanged claim from stored openings', () => {
    expect(localizeCoachAssistantBody(opening('出门', true), i18n.getFixedT('zh', 'coach'))).toBe(
      '来重新想想这个 Move：「出门」。',
    )
  })

  it('preserves punctuation inside the Move description', () => {
    expect(
      localizeCoachAssistantBody(opening('say "yes" today'), i18n.getFixedT('zh', 'coach')),
    ).toBe('来重新想想这个 Move：「say "yes" today」。')
  })
})
