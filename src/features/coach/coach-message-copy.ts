import type { TFunction } from 'i18next'

export const moveAdjustmentOpeningPattern =
  /^Let us revisit your Move: "([\s\S]*)"\.(?: We will adjust its wording and keep its schedule unchanged\.)?$/

const welcomePattern =
  /^Good (morning|afternoon|evening), ([^\n]+)\. What(?:'|’)s the next step toward your vision\?$/

const greetingKeys = {
  morning: 'greetingMorning',
  afternoon: 'greetingAfternoon',
  evening: 'greetingEvening',
} as const

const fixtureKeys = {
  'What feels most alive when you picture the next chapter of your work?': 'mock.replyAlive',
  'It sounds like the decision is carrying the weight of every future possibility. Which loss feels hardest to accept?':
    'mock.replyLoss',
  'Where are you spending energy that your role no longer requires from you?': 'mock.replyEnergy',
  'What has changed because of your effort, even if the work is not finished yet?':
    'mock.replyProgress',
  'What seemed to take most of your attention today?': 'mock.replyAttention',
  'You’ve been holding this question for a while. What seems to take most of your attention when you sit with it?':
    'mock.replyHolding',
  'I hear a wish to choose with honesty, without pretending there is no cost. Let’s make that insight tangible.':
    'mock.replyTangible',
  'What changes when you say that out loud? Stay with the part that feels unexpectedly true.':
    'mock.replyTrue',
} as const

export function localizeCoachAssistantBody(body: string, t: TFunction<'coach'>): string {
  const adjustment = moveAdjustmentOpeningPattern.exec(body)
  if (adjustment) return t('adjustmentOpening', { description: adjustment[1] ?? '' })

  const fixtureKey = fixtureKeys[body as keyof typeof fixtureKeys]
  if (fixtureKey) return t(fixtureKey)

  const welcome = welcomePattern.exec(body)
  const period = welcome?.[1] as keyof typeof greetingKeys | undefined
  if (!welcome || !period) return body
  return t('welcomeMessage', {
    name: welcome[2] ?? '',
    period: t(greetingKeys[period]),
  })
}
