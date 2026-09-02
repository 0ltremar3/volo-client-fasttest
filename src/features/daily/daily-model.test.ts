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

  it('translates status labels for Chinese', () => {
    expect([
      getPeriodMoveStatusLabel(null, 'zh'),
      getPeriodMoveStatusLabel('progressing', 'zh'),
      getPeriodMoveStatusLabel('stuck', 'zh'),
    ]).toEqual(['打卡', '进展顺利', '有些偏离'])
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

  it('maps ISO weekdays to Chinese short labels', () => {
    expect(Array.from({ length: 7 }, (_, index) => formatIsoWeekday(index + 1, 'zh'))).toEqual([
      '周一',
      '周二',
      '周三',
      '周四',
      '周五',
      '周六',
      '周日',
    ])
  })
})
