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

export type PeriodMoveStatus = 'progressing' | 'stuck' | 'needs_adjustment' | null

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

export type EchoRepeat = 'daily' | 'weekly' | 'monthly' | 'custom' | 'none'

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
  { value: 'custom', label: 'Custom' },
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

export function formatDailyDate(date: Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en', { ...options, timeZone: 'UTC' }).format(date)
}

export function formatIsoWeekday(day: number) {
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][day - 1] ?? String(day)
}

export function getPeriodMoveStatusLabel(status: PeriodMoveStatus) {
  if (status === 'progressing') return 'On Track'
  if (status === 'stuck') return 'Drifting'
  if (status === 'needs_adjustment') return 'Needs a Rethink'
  return 'Check in'
}

export function formatEchoScheduleDate(value: string) {
  const date = parseDailyDate(value)
  return date ? formatDailyDate(date, { month: 'short', day: 'numeric', year: 'numeric' }) : value
}

export function formatEchoScheduleTime(value: string) {
  const [hour = '0', minute = '0'] = value.split(':')
  const date = new Date(Date.UTC(2026, 0, 1, Number(hour), Number(minute)))
  return new Intl.DateTimeFormat('en', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  }).format(date)
}

export function getWeekDates(selectedDate: Date) {
  const sunday = new Date(selectedDate)
  sunday.setUTCDate(selectedDate.getUTCDate() - selectedDate.getUTCDay())
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(sunday)
    date.setUTCDate(sunday.getUTCDate() + index)
    return date
  })
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
