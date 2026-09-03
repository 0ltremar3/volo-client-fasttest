import type { TFunction } from 'i18next'

export const moveAdjustmentOpeningPattern =
  /^Let us revisit your Move: "([\s\S]*)"\.(?: We will adjust its wording and keep its schedule unchanged\.)?$/

export function localizeCoachAssistantBody(body: string, t: TFunction<'coach'>): string {
  const match = moveAdjustmentOpeningPattern.exec(body)
  if (!match) return body
  return t('adjustmentOpening', { description: match[1] ?? '' })
}
