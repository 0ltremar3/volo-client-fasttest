import type { AppLocale } from '@/lib/locale'
import { toBcp47 } from '@/lib/locale'

/** Layout copied from EverEcho `DateStripLayoutMetrics` (Figma Calendar/Week·Strip). */
export const dateStripLayout = {
  compactHeight: 83,
  headerToDayBandSpacing: 10,
  dayBandHeight: 36,
  tickGap: 5,
  tickRowHeight: 15,
  dayColumnWidth: 26,
  monthChevronSize: 12,
  horizontalInsetRatio: 0.04,
  windowRadius: 60,
  windowExpansion: 60,
  windowThreshold: 14,
} as const

export const dateStripTickSizes = [
  { width: 1, height: 8 },
  { width: 1, height: 8 },
  { width: 1, height: 8 },
  { width: 2, height: 15 },
  { width: 1, height: 8 },
  { width: 1, height: 8 },
  { width: 1, height: 8 },
] as const

export const weekdayLetters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const

export const weekdayLettersByLocale: Record<AppLocale, readonly string[]> = {
  en: weekdayLetters,
  zh: ['日', '一', '二', '三', '四', '五', '六'],
}

export const weekdayHeadingsByLocale: Record<AppLocale, readonly string[]> = {
  en: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
  zh: ['日', '一', '二', '三', '四', '五', '六'],
}

export type DateWindow = {
  start: string
  end: string
}

export type MonthYear = {
  year: number
  month: number
}

export function parseIsoDate(value: string) {
  return new Date(`${value}T00:00:00Z`)
}

export function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function shiftIsoDate(value: string, days: number) {
  const date = parseIsoDate(value)
  date.setUTCDate(date.getUTCDate() + days)
  return toIsoDate(date)
}

export function isoDateDistance(from: string, to: string) {
  return Math.round((parseIsoDate(to).getTime() - parseIsoDate(from).getTime()) / 86_400_000)
}

export function createDateWindow(
  center: string,
  radius = dateStripLayout.windowRadius,
): DateWindow {
  return {
    start: shiftIsoDate(center, -radius),
    end: shiftIsoDate(center, radius),
  }
}

export function expandDateWindow(window: DateWindow, around: string): DateWindow {
  const { windowExpansion: expansion, windowThreshold: threshold } = dateStripLayout
  let { start, end } = window

  while (around < start) start = shiftIsoDate(start, -expansion)
  while (around > end) end = shiftIsoDate(end, expansion)
  while (isoDateDistance(start, around) <= threshold) start = shiftIsoDate(start, -expansion)
  while (isoDateDistance(around, end) <= threshold) end = shiftIsoDate(end, expansion)

  if (start === window.start && end === window.end) return window
  return { start, end }
}

export function enumerateDateWindow(window: DateWindow) {
  const dates: string[] = []
  const length = isoDateDistance(window.start, window.end)
  for (let offset = 0; offset <= length; offset += 1) {
    dates.push(shiftIsoDate(window.start, offset))
  }
  return dates
}

export function dateStripContentWidth(totalWidth: number) {
  return totalWidth * (1 - dateStripLayout.horizontalInsetRatio * 2)
}

export function dateStripDayColumnSpacing(contentWidth: number) {
  return Math.max((contentWidth - dateStripLayout.dayColumnWidth * 7) / 6, 0)
}

export function dateStripSideInset(totalWidth: number) {
  return Math.max((totalWidth - dateStripLayout.dayColumnWidth) / 2, 0)
}

export function dateStripStride(columnSpacing: number) {
  return dateStripLayout.dayColumnWidth + columnSpacing
}

export function dateIndexFromScroll(scrollLeft: number, stride: number) {
  if (stride <= 0) return 0
  return Math.round(scrollLeft / stride)
}

export function scrollLeftForIndex(index: number, stride: number) {
  return index * stride
}

export function commitFocusedDate(focused: string, committed: string) {
  return focused === committed ? null : focused
}

export function monthYearFromIso(value: string): MonthYear {
  return {
    year: Number(value.slice(0, 4)),
    month: Number(value.slice(5, 7)),
  }
}

export function shiftMonthYear({ year, month }: MonthYear, delta: number): MonthYear {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1))
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 }
}

export function monthGrid({ year, month }: MonthYear) {
  const first = parseIsoDate(`${year}-${String(month).padStart(2, '0')}-01`)
  const leading = first.getUTCDay()
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const cells: Array<string | null> = Array.from({ length: leading }, () => null)
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`)
  }
  return cells
}

function formatUtc(value: string, options: Intl.DateTimeFormatOptions, locale: AppLocale = 'en') {
  return new Intl.DateTimeFormat(toBcp47(locale), { ...options, timeZone: 'UTC' }).format(
    parseIsoDate(value),
  )
}

export function formatDateStripWeekday(value: string, locale: AppLocale = 'en') {
  return formatUtc(value, { weekday: 'long' }, locale)
}

export function formatDateStripMonthYear(value: string, locale: AppLocale = 'en') {
  return formatUtc(value, { month: 'long', year: 'numeric' }, locale)
}

export function formatDateStripMonthYearValue(
  { year, month }: MonthYear,
  locale: AppLocale = 'en',
) {
  return formatDateStripMonthYear(`${year}-${String(month).padStart(2, '0')}-01`, locale)
}

export function formatDateStripFullDate(value: string, locale: AppLocale = 'en') {
  return formatUtc(
    value,
    { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
    locale,
  )
}

export function dateStripWeekdayLetter(value: string, locale: AppLocale = 'en') {
  return weekdayLettersByLocale[locale][parseIsoDate(value).getUTCDay()] ?? ''
}

export function dateStripDayNumber(value: string) {
  return parseIsoDate(value).getUTCDate()
}
