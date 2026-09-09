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

  it('renders the Coach welcome in Chinese', () => {
    const body = 'Good evening, Jiayu. What’s the next step toward your vision?'
    expect(localizeCoachAssistantBody(body, i18n.getFixedT('en', 'coach'))).toBe(body)
    expect(localizeCoachAssistantBody(body, i18n.getFixedT('zh', 'coach'))).toBe(
      'Jiayu，晚上好。为了靠近你的愿景，你想从哪一步开始？',
    )
  })

  it('renders fixture Coach replies in Chinese', () => {
    expect(
      localizeCoachAssistantBody(
        'What seemed to take most of your attention today?',
        i18n.getFixedT('zh', 'coach'),
      ),
    ).toBe('今天什么事情占据了你最多注意力？')
  })

  it('renders the stored Move rethink opening in the active locale', () => {
    const body = opening('出门')
    expect(localizeCoachAssistantBody(body, i18n.getFixedT('en', 'coach'))).toBe(body)
    expect(localizeCoachAssistantBody(body, i18n.getFixedT('zh', 'coach'))).toBe(
      '来重新想想这个行动：「出门」。',
    )
  })

  it('drops the old schedule-unchanged claim from stored openings', () => {
    expect(localizeCoachAssistantBody(opening('出门', true), i18n.getFixedT('zh', 'coach'))).toBe(
      '来重新想想这个行动：「出门」。',
    )
  })

  it('preserves punctuation inside the Move description', () => {
    expect(
      localizeCoachAssistantBody(opening('say "yes" today'), i18n.getFixedT('zh', 'coach')),
    ).toBe('来重新想想这个行动：「say "yes" today」。')
  })
})
