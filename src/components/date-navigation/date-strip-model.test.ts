import { describe, expect, it } from 'vitest'

import {
  commitFocusedDate,
  createDateWindow,
  dateIndexFromScroll,
  dateStripContentWidth,
  dateStripDayColumnSpacing,
  dateStripLayout,
  dateStripSideInset,
  dateStripStride,
  dateStripTickSizes,
  dateStripWeekdayLetter,
  enumerateDateWindow,
  expandDateWindow,
  formatDateStripMonthYear,
  formatDateStripWeekday,
  isoDateDistance,
  monthGrid,
  monthYearFromIso,
  shiftIsoDate,
  shiftMonthYear,
} from '@/components/date-navigation/date-strip-model'

describe('Date strip window', () => {
  it('starts sixty days on either side of the focused day', () => {
    const window = createDateWindow('2026-08-31')
    expect(window).toEqual({ start: '2026-07-02', end: '2026-10-30' })
    expect(enumerateDateWindow(window)).toHaveLength(121)
  })

  it('grows before either edge becomes visible', () => {
    const expanded = expandDateWindow(createDateWindow('2026-08-31'), '2026-07-10')
    expect(expanded.start).toBe('2026-05-03')
    expect(isoDateDistance(expanded.start, '2026-07-10')).toBeGreaterThan(
      dateStripLayout.windowThreshold,
    )
  })

  it('crosses month and year boundaries one day at a time', () => {
    expect(shiftIsoDate('2026-08-31', 1)).toBe('2026-09-01')
    expect(shiftIsoDate('2026-12-31', 1)).toBe('2027-01-01')
  })
})

describe('Date strip layout', () => {
  it('keeps the header and day band on the same inset width', () => {
    const totalWidth = 350
    const contentWidth = dateStripContentWidth(totalWidth)
    const spacing = dateStripDayColumnSpacing(contentWidth)

    expect(contentWidth).toBeCloseTo(322)
    expect(spacing).toBeCloseTo(23.333, 3)
    expect(dateStripLayout.dayColumnWidth * 7 + spacing * 6).toBeCloseTo(contentWidth)
    expect(dateStripSideInset(totalWidth) * 2 + dateStripLayout.dayColumnWidth).toBe(totalWidth)
  })

  it('maps scroll position onto one centered day', () => {
    const stride = dateStripStride(23)
    expect(dateIndexFromScroll(0, stride)).toBe(0)
    expect(dateIndexFromScroll(stride * 4 + 10, stride)).toBe(4)
  })

  it('emphasizes only the center tick', () => {
    expect(dateStripTickSizes[3]).toEqual({ width: 2, height: 15 })
    expect(dateStripTickSizes.filter((tick) => tick.height === 8)).toHaveLength(6)
  })
})

describe('Date strip presentation', () => {
  it('uses the full English weekday and month title', () => {
    expect(formatDateStripWeekday('2026-05-25')).toBe('Monday')
    expect(formatDateStripMonthYear('2026-05-25')).toBe('May 2026')
    expect(dateStripWeekdayLetter('2026-05-25')).toBe('M')
  })

  it('uses Chinese weekday letters and locale month titles', () => {
    expect(formatDateStripWeekday('2026-05-25', 'zh')).toBe('星期一')
    expect(formatDateStripMonthYear('2026-05-25', 'zh')).toBe('2026年5月')
    expect(dateStripWeekdayLetter('2026-05-25', 'zh')).toBe('一')
  })

  it('commits a new day only after focus differs from the published date', () => {
    expect(commitFocusedDate('2026-08-31', '2026-08-31')).toBeNull()
    expect(commitFocusedDate('2026-09-01', '2026-08-31')).toBe('2026-09-01')
  })

  it('builds a Sunday-leading month grid', () => {
    const august = monthGrid(monthYearFromIso('2026-08-31'))
    expect(august.slice(0, 7)).toEqual([null, null, null, null, null, null, '2026-08-01'])
    expect(shiftMonthYear({ year: 2026, month: 8 }, 1)).toEqual({ year: 2026, month: 9 })
  })
})
