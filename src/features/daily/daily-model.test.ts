import { describe, expect, it } from 'vitest'

import { formatIsoWeekday, getPeriodMoveStatusLabel } from '@/features/daily/daily-model'

describe('Daily Move presentation', () => {
  it('keeps all four persisted status values distinct', () => {
    expect([
      getPeriodMoveStatusLabel(null),
      getPeriodMoveStatusLabel('progressing'),
      getPeriodMoveStatusLabel('stuck'),
      getPeriodMoveStatusLabel('needs_adjustment'),
    ]).toEqual(['Check in', 'On Track', 'Drifting', 'Needs a Rethink'])
  })

  it('maps ISO weekday 7 to Sunday', () => {
    expect(Array.from({ length: 7 }, (_, index) => formatIsoWeekday(index + 1))).toEqual([
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat',
      'Sun',
    ])
  })
})
