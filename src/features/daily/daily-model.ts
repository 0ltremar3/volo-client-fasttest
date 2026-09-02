import type { AppLocale } from '@/lib/locale'
import { toBcp47 } from '@/lib/locale'

export type DailyTrace = {
  id: string
  time: string
  text: string
  kind: 'pebble' | 'note'
}

export type DailyEcho = {
  lead: string
  takeaway: string
  traceCount: number
}

export type PeriodMoveStatus = 'progressing' | 'stuck' | null

export type DailyMove = {
  id: string
  schedule: string
  text: string
  source: string
  dueLabel: string
  status: PeriodMoveStatus
}

export type DailySummary = {
  sourceLabel: string
  dateLabel: string
  body: string
  takeaway: string
}

export type DailyRecord = {
  date: string
  echo: DailyEcho | null
  moves: DailyMove[]
  summary: DailySummary | null
  traces: DailyTrace[]
}

export type EchoRepeat = 'daily' | 'weekly' | 'monthly' | 'none'

export type EchoSchedule = {
  time: string
  date: string
  repeat: EchoRepeat
  alarm: boolean
}

export const echoRepeatOptions: ReadonlyArray<{ value: EchoRepeat; label: string }> = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'none', label: 'No repeat' },
]

export const defaultEchoSchedule: EchoSchedule = {
  time: '21:45',
  date: '2026-08-25',
  repeat: 'daily',
  alarm: false,
}

export const defaultDailyDate = '2026-05-27'

export const dailyRecords: Record<string, DailyRecord> = {
  [defaultDailyDate]: {
    date: defaultDailyDate,
    echo: {
      lead: 'You noticed the tiredness of hiding disagreement, and gave yourself a quiet stretch.',
      takeaway: 'Restlessness isn’t losing control. It’s a no you held down.',
      traceCount: 3,
    },
    moves: [
      {
        id: 'costs-new-direction-1',
        schedule: 'Every Sun  ·  09:00 / 21:00',
        text: 'Write down three costs I’m willing to bear for the new direction.',
        source: 'From  “The Cost of Choice”',
        dueLabel: 'Today 21:00',
        status: 'stuck',
      },
      {
        id: 'costs-new-direction-2',
        schedule: 'Every Sun  ·  09:00 / 21:00',
        text: 'Write down three costs I’m willing to bear for the new direction.',
        source: 'From  “The Cost of Choice”',
        dueLabel: 'Today 21:00',
        status: 'progressing',
      },
    ],
    summary: {
      sourceLabel: 'Based on 3 traces  ·  1 Echo',
      dateLabel: 'Sep 7',
      body: 'You’ve often noticed the fatigue of hiding a true opinion, and you’ve been giving yourself brief quiet.',
      takeaway: 'Restlessness isn’t always losing control. Sometimes it’s a no you held down.',
    },
    traces: [
      {
        id: 'morning-meeting',
        time: '9:42',
        text: 'Irritation in the meeting. Maybe I hid a disagreement again.',
        kind: 'pebble',
      },
      {
        id: 'afternoon-walk',
        time: '13:18',
        text: 'A ten-minute walk. My mind got quieter.',
        kind: 'note',
      },
    ],
  },
}

const datePattern = /^\d{4}-\d{2}-\d{2}$/

export function parseDailyDate(value: string | null) {
  if (!value || !datePattern.test(value)) return null
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date
}

export function formatDailyDate(
  date: Date,
  options: Intl.DateTimeFormatOptions,
  locale: AppLocale = 'en',
) {
  return new Intl.DateTimeFormat(toBcp47(locale), { ...options, timeZone: 'UTC' }).format(date)
}

const isoWeekdayLabels: Record<AppLocale, readonly string[]> = {
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  zh: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
}

export function formatIsoWeekday(day: number, locale: AppLocale = 'en') {
  return isoWeekdayLabels[locale][day - 1] ?? String(day)
}

const periodMoveStatusLabels: Record<
  AppLocale,
  { progressing: string; stuck: string; checkIn: string }
> = {
  en: { progressing: 'On Track', stuck: 'Drifting', checkIn: 'Check in' },
  zh: { progressing: '进展顺利', stuck: '有些偏离', checkIn: '打卡' },
}

export function getPeriodMoveStatusLabel(status: PeriodMoveStatus, locale: AppLocale = 'en') {
  const labels = periodMoveStatusLabels[locale]
  if (status === 'progressing') return labels.progressing
  if (status === 'stuck') return labels.stuck
  return labels.checkIn
}

export function formatEchoScheduleDate(value: string, locale: AppLocale = 'en') {
  const date = parseDailyDate(value)
  return date
    ? formatDailyDate(date, { month: 'short', day: 'numeric', year: 'numeric' }, locale)
    : value
}

export function formatEchoScheduleTime(value: string, locale: AppLocale = 'en') {
  const [hour = '0', minute = '0'] = value.split(':')
  const date = new Date(Date.UTC(2026, 0, 1, Number(hour), Number(minute)))
  return new Intl.DateTimeFormat(toBcp47(locale), {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  }).format(date)
}

export function toDailyDateValue(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function getDailyRecord(date: string): DailyRecord {
  return (
    dailyRecords[date] ?? {
      date,
      echo: null,
      moves: [],
      summary: null,
      traces: [],
    }
  )
}
