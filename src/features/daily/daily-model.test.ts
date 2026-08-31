import { describe, expect, it } from 'vitest'

import { formatIsoWeekday, getPeriodMoveStatusLabel } from '@/features/daily/daily-model'

describe('Daily Move presentation', () => {
  it('keeps the two persisted status values distinct', () => {
    expect([
      getPeriodMoveStatusLabel(null),
      getPeriodMoveStatusLabel('progressing'),
      getPeriodMoveStatusLabel('stuck'),
    ]).toEqual(['Check in', 'On Track', 'Drifting'])
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
