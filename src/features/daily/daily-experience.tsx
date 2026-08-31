import { useRef, useState } from 'react'
import { Settings2 } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import calendarChevron from '@/assets/daily/calendar-chevron.svg'
import echoArc from '@/assets/daily/echo-arc.svg'
import echoMarker from '@/assets/daily/echo-marker.svg'
import profileGlyph from '@/assets/daily/profile-glyph.svg'
import summaryDivider from '@/assets/daily/summary-divider.svg'
import traceDotGlyph from '@/assets/daily/trace-dot-glyph.svg'
import traceRail from '@/assets/daily/trace-rail.svg'
import voloWordmark from '@/assets/daily/volo-wordmark.svg'
import { AppAtmosphere } from '@/components/layout/app-atmosphere'
import { AppBottomNavigation } from '@/components/layout/app-bottom-navigation'
import {
  defaultEchoSchedule,
  defaultDailyDate,
  formatDailyDate,
  getDailyRecord,
  getWeekDates,
  parseDailyDate,
  toDailyDateValue,
  type DailyEcho,
  type DailySummary,
  type DailyTrace,
  type EchoSchedule,
} from '@/features/daily/daily-model'
import { EchoSettingsSheet } from '@/features/daily/echo-settings-sheet'
import { PeriodMoves, type PeriodMoveStatus } from '@/features/daily/period-moves'
import { mockAuthEnabled } from '@/features/auth/mock-auth'
import { VoloDailyExperience } from '@/features/daily/volo-daily-experience'

function DailyHeader() {
  return (
    <header className="safe-top grid h-24 shrink-0 grid-cols-[2rem_1fr_2rem] items-center px-5">
      <span aria-hidden="true" />
      <img
        src={voloWordmark}
        alt="Volo"
        width="75"
        height="22"
        className="mx-auto h-[22px] w-[75px]"
        style={{ filter: 'var(--app-brand-asset-filter)' }}
      />
      <span
        className="grid size-8 place-items-center rounded-full bg-[var(--daily-profile-background)]"
        aria-label="Profile"
        role="img"
      >
        <img src={profileGlyph} alt="" width="11" height="20" className="h-5 w-[11px]" />
      </span>
    </header>
  )
}

function WeekStrip({ selectedDate }: { selectedDate: Date }) {
  const [, setSearchParams] = useSearchParams()
  const selectedValue = toDailyDateValue(selectedDate)
  const dates = getWeekDates(selectedDate)

  return (
    <section className="mx-5" aria-labelledby="daily-date-heading">
      <div className="flex h-[38px] items-center justify-between">
        <h1
          id="daily-date-heading"
          className="font-display text-[28px] font-semibold leading-[38px] text-[var(--coach-ink)]"
        >
          {formatDailyDate(selectedDate, { weekday: 'long' })}
        </h1>
        <p className="flex items-center gap-1 text-sm text-[var(--coach-text-secondary)]">
          {formatDailyDate(selectedDate, { month: 'short', year: 'numeric' })}
          <img
            src={calendarChevron}
            alt=""
            width="4"
            height="7"
            className="h-[7px] w-1"
            style={{ filter: 'var(--app-brand-asset-filter)' }}
            aria-hidden="true"
          />
        </p>
      </div>
      <div className="mt-1 grid grid-cols-7" aria-label="Select a day">
        {dates.map((date) => {
          const value = toDailyDateValue(date)
          const selected = value === selectedValue
          return (
            <button
              key={value}
              type="button"
              onClick={() => setSearchParams({ date: value })}
              aria-pressed={selected}
              aria-label={formatDailyDate(date, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
              className="group grid min-h-touch min-w-0 grid-rows-[1.15rem_1rem_0.95rem] place-items-center rounded-md text-[var(--coach-text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="font-display text-xl leading-none group-aria-pressed:font-semibold group-aria-pressed:text-[var(--coach-ink)]">
                {formatDailyDate(date, { day: 'numeric' })}
              </span>
              <span className="text-xs text-[var(--coach-text-tertiary)]">
                {formatDailyDate(date, { weekday: 'narrow' })}
              </span>
              <span
                className="h-2 w-px rounded-full bg-[var(--coach-text-secondary)] group-aria-pressed:h-[15px] group-aria-pressed:w-0.5 group-aria-pressed:bg-[var(--coach-ink)]"
                aria-hidden="true"
              />
            </button>
          )
        })}
      </div>
    </section>
  )
}

function DailyEchoCard({ echo, onSettings }: { echo: DailyEcho | null; onSettings: () => void }) {
  if (!echo) {
    return (
      <section
        className="daily-card relative min-h-[164px] px-5 py-6"
        aria-labelledby="daily-echo-title"
      >
        <div className="flex items-center justify-between">
          <p id="daily-echo-title" className="daily-overline">
            DAILY ECHO
          </p>
          <button
            type="button"
            className="grid size-11 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={onSettings}
            aria-label="Daily Echo settings"
          >
            <Settings2 className="size-4" />
          </button>
        </div>
        <p className="mt-8 font-display text-[22px] font-medium leading-7">No Echo for this day.</p>
        <p className="mt-2 text-sm text-[var(--coach-text-secondary)]">
          Choose another date to revisit a reflection.
        </p>
      </section>
    )
  }

  return (
    <article
      className="daily-card relative h-[323px] w-full overflow-hidden text-left"
      aria-labelledby="daily-echo-title"
      aria-describedby="daily-echo-description"
    >
      <div className="absolute left-5 right-5 top-6 z-10 flex items-center justify-between">
        <p id="daily-echo-title" className="daily-overline">
          DAILY ECHO
        </p>
        <button
          type="button"
          className="grid size-11 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onSettings}
          aria-label="Daily Echo settings"
        >
          <Settings2 className="size-4" />
        </button>
      </div>
      <img
        src={echoArc}
        alt=""
        width="739"
        height="739"
        className="pointer-events-none absolute left-1/2 top-[64px] h-[739px] w-[739px] max-w-none -translate-x-1/2"
        style={{ filter: 'var(--daily-decoration-filter)' }}
        aria-hidden="true"
      />
      <img
        src={echoMarker}
        alt=""
        width="10"
        height="10"
        className="absolute left-7 top-[103px] size-[10px]"
        aria-hidden="true"
      />
      <div
        id="daily-echo-description"
        className="absolute inset-x-5 bottom-[30px] z-10 text-[var(--coach-ink)]"
      >
        <p className="text-pretty font-display text-[22px] font-medium leading-7">{echo.lead}</p>
        <p className="mt-1.5 text-pretty text-base leading-normal">{echo.takeaway}</p>
      </div>
    </article>
  )
}

function DailySummaryCard({ summary }: { summary: DailySummary | null }) {
  if (!summary) {
    return (
      <div className="daily-card px-[18px] py-6">
        <p className="font-medium">No summary for this day.</p>
        <p className="mt-2 text-sm text-[var(--coach-text-secondary)]">
          A summary appears only when there is reflected material to gather.
        </p>
      </div>
    )
  }

  return (
    <article className="daily-card px-[18px] py-6">
      <div className="flex items-center justify-between gap-4 text-xs font-semibold text-[var(--coach-text-tertiary)]">
        <p className="min-w-0 truncate">{summary.sourceLabel}</p>
        <time className="shrink-0">{summary.dateLabel}</time>
      </div>
      <p className="mt-4 text-pretty text-lg font-medium leading-6">{summary.body}</p>
      <img
        src={summaryDivider}
        alt=""
        width="317"
        height="2"
        className="my-4 h-0.5 w-full"
        style={{ filter: 'var(--daily-decoration-filter)' }}
        aria-hidden="true"
      />
      <p className="daily-overline">TAKE AWAY</p>
      <p className="mt-1.5 text-pretty text-sm leading-normal">{summary.takeaway}</p>
    </article>
  )
}

function DailyTracesCard({ traces }: { traces: DailyTrace[] }) {
  return (
    <section className="daily-card relative px-[18px] py-6" aria-labelledby="daily-traces-title">
      <div className="flex items-center justify-between">
        <h2 id="daily-traces-title" className="daily-overline">
          TODAY’S TRACES
        </h2>
        <img src={traceDotGlyph} alt="" width="9" height="13" className="h-[13px] w-[9px]" />
      </div>
      {traces.length ? (
        <div className="relative mt-3">
          <img
            src={traceRail}
            alt=""
            width="7"
            height="96"
            className="pointer-events-none absolute left-[43px] top-3 h-24 w-[7px]"
            style={{ filter: 'var(--daily-decoration-filter)' }}
            aria-hidden="true"
          />
          <ol className="space-y-1">
            {traces.map((trace) => (
              <li key={trace.id} className="grid grid-cols-[2.75rem_1fr] gap-3 px-1 py-2.5">
                <time className="text-[11px] font-medium leading-[14px] text-[var(--coach-text-tertiary)]">
                  {trace.time}
                </time>
                <div className="min-w-0">
                  <p className="text-pretty text-[15px] font-medium leading-5">{trace.text}</p>
                  <span className="mt-0.5 inline-flex rounded-full bg-[var(--coach-border)] px-1.5 py-0.5 text-[11px] capitalize leading-[14px] text-[var(--coach-text-tertiary)]">
                    {trace.kind}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <div className="mt-6">
          <p className="font-medium">No traces for this day.</p>
          <p className="mt-2 text-sm text-[var(--coach-text-secondary)]">
            Small notes and pebbles will remain separate from the daily summary.
          </p>
        </div>
      )}
    </section>
  )
}

function MockDailyExperience() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [echoSettingsOpen, setEchoSettingsOpen] = useState(false)
  const [echoSchedule, setEchoSchedule] = useState<EchoSchedule>(defaultEchoSchedule)
  const [moveStatuses, setMoveStatuses] = useState<Record<string, PeriodMoveStatus>>({})
  const [deletedMoveIds, setDeletedMoveIds] = useState<string[]>([])
  const echoButtonRef = useRef<HTMLDivElement>(null)
  const selectedDate = parseDailyDate(searchParams.get('date')) ?? parseDailyDate(defaultDailyDate)!
  const selectedValue = toDailyDateValue(selectedDate)
  const record = getDailyRecord(selectedValue)

  function closeEchoSettings() {
    setEchoSettingsOpen(false)
    window.requestAnimationFrame(() => echoButtonRef.current?.querySelector('button')?.focus())
  }

  return (
    <div className="app-canvas relative isolate flex h-dvh min-h-0 w-full flex-col overflow-hidden text-[var(--coach-ink)]">
      <AppAtmosphere />
      <div className="coach-scrollbar-none min-h-0 flex-1 overflow-y-auto">
        <DailyHeader />
        <WeekStrip selectedDate={selectedDate} />

        <main className="mx-auto mt-10 flex w-[calc(100%-30px)] max-w-[360px] flex-col items-center gap-9 pb-12">
          <div ref={echoButtonRef} className="w-full max-w-[350px]">
            <DailyEchoCard echo={record.echo} onSettings={() => setEchoSettingsOpen(true)} />
          </div>

          <PeriodMoves
            items={record.moves
              .filter((move) => !deletedMoveIds.includes(move.id))
              .map((move) => ({
                ...move,
                status: moveStatuses[move.id] ?? move.status,
                scheduleValue: {
                  startLocalDate: selectedValue,
                  localTime: '21:00',
                  rule: { frequency: 'daily' as const },
                  alarmEnabled: false,
                },
              }))}
            onStatusChange={(move, status) =>
              setMoveStatuses((current) => ({ ...current, [move.id]: status }))
            }
            onRethink={() => void navigate('/chat')}
            onScheduleChange={() => undefined}
            onDelete={(move) => setDeletedMoveIds((current) => [...current, move.id])}
            onFindMove={() => void navigate('/chat')}
          />

          <section className="w-full" aria-labelledby="daily-summary-title">
            <h2 id="daily-summary-title" className="daily-section-title px-[5px]">
              DAILY SUMMARY
            </h2>
            <div className="mt-6 space-y-3">
              <DailySummaryCard summary={record.summary} />
              <DailyTracesCard traces={record.traces} />
            </div>
          </section>
        </main>
      </div>

      <AppBottomNavigation />
      <EchoSettingsSheet
        open={echoSettingsOpen}
        value={echoSchedule}
        onClose={closeEchoSettings}
        onSave={(nextSchedule) => {
          setEchoSchedule(nextSchedule)
          closeEchoSettings()
        }}
      />
    </div>
  )
}

export function DailyExperience() {
  return mockAuthEnabled ? <MockDailyExperience /> : <VoloDailyExperience />
}
