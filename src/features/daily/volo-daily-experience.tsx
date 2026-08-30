import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, CircleAlert, Settings2, Trash2, Wrench } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import echoArc from '@/assets/daily/echo-arc.svg'
import echoMarker from '@/assets/daily/echo-marker.svg'
import profileGlyph from '@/assets/daily/profile-glyph.svg'
import voloWordmark from '@/assets/daily/volo-wordmark.svg'
import { dailyApi, type DailyCheck, type PeriodMove, type VoloMove } from '@/api/volo'
import { MoveCardSurface } from '@/components/cards/move-card-surface'
import { AppAtmosphere } from '@/components/layout/app-atmosphere'
import { AppBottomNavigation } from '@/components/layout/app-bottom-navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EchoSettingsSheet } from '@/features/daily/echo-settings-sheet'
import {
  formatDailyDate,
  getWeekDates,
  parseDailyDate,
  toDailyDateValue,
  type EchoSchedule,
} from '@/features/daily/daily-model'

const today = () => new Date().toLocaleDateString('en-CA')

export function VoloDailyExperience() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedValue = searchParams.get('date') ?? today()
  const selectedDate = parseDailyDate(selectedValue) ?? new Date(`${today()}T00:00:00Z`)
  const daily = useQuery({
    queryKey: ['volo-daily', selectedValue],
    queryFn: () => dailyApi.get(selectedValue),
  })
  const moves = useQuery({ queryKey: ['volo-moves'], queryFn: dailyApi.listMoves })
  const queryClient = useQueryClient()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const scheduleValue: EchoSchedule = {
    time: daily.data?.echo.schedule?.local_time ?? '21:00',
    date: selectedValue,
    repeat: 'daily',
    alarm: daily.data?.echo.schedule?.enabled ?? false,
  }
  const saveSchedule = useMutation({
    mutationFn: (value: EchoSchedule) => dailyApi.saveEchoSchedule(value.alarm, value.time),
    onSuccess: async () => {
      setSettingsOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['volo-daily', selectedValue] })
    },
  })
  return (
    <div className="app-canvas relative isolate flex h-dvh min-h-0 w-full flex-col overflow-hidden text-[var(--coach-ink)]">
      <AppAtmosphere />
      <div className="coach-scrollbar-none min-h-0 flex-1 overflow-y-auto">
        <header className="safe-top grid h-24 grid-cols-[2rem_1fr_2rem] items-center px-5">
          <span />
          <img
            src={voloWordmark}
            alt="Volo"
            className="mx-auto h-[22px] w-[75px]"
            style={{ filter: 'var(--app-brand-asset-filter)' }}
          />
          <span className="grid size-8 place-items-center rounded-full bg-[var(--daily-profile-background)]">
            <img src={profileGlyph} alt="" className="h-5 w-[11px]" />
          </span>
        </header>

        <section className="mx-5">
          <div className="flex h-[38px] items-center justify-between">
            <h1 className="font-display text-[28px] font-semibold leading-[38px]">
              {formatDailyDate(selectedDate, { weekday: 'long' })}
            </h1>
            <p className="text-sm text-[var(--coach-text-secondary)]">
              {formatDailyDate(selectedDate, { month: 'short', year: 'numeric' })}
            </p>
          </div>
          <div className="mt-1 grid grid-cols-7">
            {getWeekDates(selectedDate).map((date) => {
              const value = toDailyDateValue(date)
              const selected = value === selectedValue
              return (
                <button
                  key={value}
                  onClick={() => setSearchParams({ date: value })}
                  aria-pressed={selected}
                  className="grid min-h-touch grid-rows-[1.15rem_1rem_0.95rem] place-items-center rounded-md text-[var(--coach-text-secondary)]"
                >
                  <span className="font-display text-xl group-aria-pressed:font-semibold">
                    {formatDailyDate(date, { day: 'numeric' })}
                  </span>
                  <span className="text-xs">{formatDailyDate(date, { weekday: 'narrow' })}</span>
                  <span
                    className={
                      selected
                        ? 'h-[15px] w-0.5 bg-[var(--coach-ink)]'
                        : 'h-2 w-px bg-[var(--coach-text-secondary)]'
                    }
                  />
                </button>
              )
            })}
          </div>
        </section>

        <main className="mx-auto mt-10 flex w-[calc(100%-30px)] max-w-[360px] flex-col gap-9 pb-12">
          {daily.isPending ? (
            <DailySkeleton />
          ) : daily.isError || !daily.data ? (
            <DailyError onRetry={() => void daily.refetch()} />
          ) : (
            <>
              <DailyEchoCard
                date={selectedValue}
                echo={daily.data.echo}
                onSettings={() => setSettingsOpen(true)}
              />

              <section aria-labelledby="period-moves-title">
                <h2 id="period-moves-title" className="text-base font-medium">
                  Period Moves
                </h2>
                <div className="mt-5 space-y-4">
                  {daily.data.period_moves.length ? (
                    daily.data.period_moves.map((move) => (
                      <PeriodMoveCard key={move.id} move={move} date={selectedValue} />
                    ))
                  ) : (
                    <EmptyBlock
                      title="No checks for this day."
                      body="A confirmed Move appears here after you add a check plan."
                    />
                  )}
                </div>
              </section>

              {moves.data?.items.some((move) => !move.schedule) ? (
                <section>
                  <h2 className="text-base font-medium">Moves without a check plan</h2>
                  <div className="mt-4 space-y-3">
                    {moves.data.items
                      .filter((move) => !move.schedule)
                      .map((move) => (
                        <UnscheduledMove key={move.id} move={move} />
                      ))}
                  </div>
                </section>
              ) : null}

              <section aria-labelledby="daily-traces-title">
                <h2 id="daily-traces-title" className="daily-section-title">
                  TRACES
                </h2>
                <EmptyBlock
                  title="No traces for this day."
                  body="Hardware traces will appear here in a later version."
                />
              </section>
            </>
          )}
        </main>
      </div>
      <AppBottomNavigation />
      <EchoSettingsSheet
        open={settingsOpen}
        value={scheduleValue}
        onClose={() => setSettingsOpen(false)}
        onSave={(value) => saveSchedule.mutate(value)}
      />
    </div>
  )
}

function DailyEchoCard({
  date,
  echo,
  onSettings,
}: {
  date: string
  echo: NonNullable<Awaited<ReturnType<typeof dailyApi.get>>>['echo']
  onSettings: () => void
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const start = useMutation({
    mutationFn: () => dailyApi.startEcho(date),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['volo-daily', date] })
      void navigate(`/daily/echo/${result.echo_session.id}`)
    },
  })
  const open = () => {
    if (echo.status === 'in_progress' && echo.echo_session_id) {
      void navigate(`/daily/echo/${echo.echo_session_id}`)
      return
    }
    if (echo.status === 'completed' && echo.echo_session_id) {
      void navigate(`/review/${echo.echo_session_id}`)
      return
    }
    start.mutate()
  }
  const scheduledTime = formatEchoTime(echo.schedule?.local_time ?? '21:00')

  return (
    <article
      className={`relative overflow-hidden rounded-[30px] bg-[var(--coach-surface-glass)] shadow-[var(--coach-shadow)] ${echo.status === 'completed' ? 'min-h-[323px]' : 'min-h-[264px]'}`}
    >
      <button
        type="button"
        className={`block w-full px-5 pb-5 pt-6 text-left focus-visible:outline-offset-[-3px] ${echo.status === 'completed' ? 'min-h-[323px]' : 'min-h-[264px]'}`}
        onClick={open}
        disabled={start.isPending}
        aria-label={
          echo.status === 'completed'
            ? 'Open completed Daily Echo'
            : echo.status === 'in_progress'
              ? 'Continue Daily Echo'
              : 'Start Daily Echo'
        }
      >
        <span className="daily-overline block">DAILY ECHO</span>
        {echo.status === 'completed' && echo.summary ? (
          <>
            <img
              src={echoArc}
              alt=""
              className="pointer-events-none absolute left-1/2 top-8 w-[550px] max-w-none -translate-x-1/2"
            />
            <img src={echoMarker} alt="" className="absolute left-7 top-24 size-[10px]" />
            <span className="relative z-10 mt-20 block font-display text-[22px] font-medium leading-7">
              {echo.summary}
            </span>
            {echo.takeaways?.[0] ? (
              <span className="relative z-10 mt-2 block text-base leading-5">
                {echo.takeaways[0]}
              </span>
            ) : null}
          </>
        ) : (
          <span className="mt-6 block">
            {echo.status === 'in_progress' ? (
              <>
                <span className="block text-sm text-[var(--coach-text-tertiary)]">IN PROGRESS</span>
                <span className="mt-7 block font-display text-[22px] font-medium leading-7">
                  Your reflection is still open.
                </span>
                <span className="mt-2 block text-base">Continue →</span>
              </>
            ) : (
              <>
                <span className="block font-display text-[22px] font-medium leading-7">
                  Your Echo is set for
                </span>
                <span className="mt-5 block font-display text-[28px] leading-none">
                  {scheduledTime.time} {scheduledTime.period}
                </span>
                <span className="mt-9 block text-base">Take a moment when you’re ready.</span>
                <span className="mt-1 block text-base">
                  {start.isPending ? 'Starting…' : 'Start now →'}
                </span>
              </>
            )}
          </span>
        )}
      </button>
      <button
        type="button"
        className="absolute right-2 top-2 z-20 grid size-11 place-items-center rounded-full"
        onClick={onSettings}
        aria-label="Daily Echo settings"
      >
        <Settings2 className="size-4" />
      </button>
      {start.isError ? (
        <p className="absolute bottom-3 left-5 right-5 text-sm text-[var(--danger)]" role="alert">
          Daily Echo could not start. Try again.
        </p>
      ) : null}
    </article>
  )
}

function formatEchoTime(localTime: string) {
  const [hour = 0, minute = 0] = localTime.split(':').map(Number)
  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return {
    time: `${String(displayHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    period,
  }
}

function PeriodMoveCard({ move, date }: { move: PeriodMove; date: string }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const update = useMutation({
    mutationFn: ({
      check,
      status,
    }: {
      check: DailyCheck
      status: Exclude<DailyCheck['status'], null>
    }) =>
      status === 'needs_adjustment'
        ? dailyApi.adjustmentSession(move.id, check.schedule_time_id, date)
        : dailyApi.updateCheck(move.id, check.schedule_time_id, date, status),
    onSuccess: async (result, variables) => {
      if (variables.status === 'needs_adjustment') {
        const adjustment = result as { session: { id: string } }
        void navigate(`/chat?session=${adjustment.session.id}`)
      }
      await queryClient.invalidateQueries({ queryKey: ['volo-daily', date] })
    },
  })
  const remove = useMutation({
    mutationFn: () => dailyApi.deleteMove(move.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['volo-daily', date] }),
  })
  const scheduleLabel = move.schedule.times.map((time) => time.local_time).join(' / ')
  return (
    <div>
      <MoveCardSurface
        schedule={`${move.schedule.rule.frequency} · ${scheduleLabel}`}
        source="From Coach"
        dueLabel={date}
        status={
          <button onClick={() => remove.mutate()} aria-label="Delete Move">
            <Trash2 className="size-4" />
          </button>
        }
      >
        {move.description}
      </MoveCardSurface>
      <div className="mt-2 space-y-2 px-2">
        {move.checks.map((check) => (
          <div key={check.schedule_time_id} className="flex items-center gap-2 text-xs">
            <time className="w-11 font-semibold">{check.local_time}</time>
            <CheckButton
              active={check.status === 'progressing'}
              label="Progress"
              icon={<Check />}
              onClick={() => update.mutate({ check, status: 'progressing' })}
            />
            <CheckButton
              active={check.status === 'stuck'}
              label="Stuck"
              icon={<CircleAlert />}
              onClick={() => update.mutate({ check, status: 'stuck' })}
            />
            <CheckButton
              active={check.status === 'needs_adjustment'}
              label="Adjust"
              icon={<Wrench />}
              onClick={() => {
                if (window.confirm('Open Coach to adjust this Move?'))
                  update.mutate({ check, status: 'needs_adjustment' })
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function CheckButton({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean
  label: string
  icon: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`grid size-10 place-items-center rounded-full ${active ? 'bg-[var(--coach-accent)] text-white' : 'bg-[var(--coach-surface-muted)] text-[var(--coach-text-secondary)]'}`}
    >
      {<span className="[&_svg]:size-4">{icon}</span>}
    </button>
  )
}

function UnscheduledMove({ move }: { move: VoloMove }) {
  const queryClient = useQueryClient()
  const [time, setTime] = useState('21:00')
  const schedule = useMutation({
    mutationFn: () =>
      dailyApi.scheduleMove(move.id, {
        rule: { frequency: 'daily' },
        startLocalDate: today(),
        times: [time],
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['volo-moves'] }),
        queryClient.invalidateQueries({ queryKey: ['volo-daily'] }),
      ])
    },
  })
  return (
    <div className="daily-card p-4">
      <p className="font-medium">{move.description}</p>
      <div className="mt-3 flex gap-2">
        <Input type="time" value={time} onChange={(event) => setTime(event.target.value)} />
        <Button onClick={() => schedule.mutate()} disabled={schedule.isPending}>
          Daily
        </Button>
      </div>
    </div>
  )
}

function EmptyBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="daily-card mt-4 px-[18px] py-6">
      <p className="font-medium">{title}</p>
      <p className="mt-2 text-sm text-[var(--coach-text-secondary)]">{body}</p>
    </div>
  )
}

function DailySkeleton() {
  return (
    <div className="space-y-4" aria-label="Loading Daily">
      <div className="h-[250px] animate-pulse rounded-[22px] bg-[var(--coach-surface-muted)]" />
      <div className="h-36 animate-pulse rounded-[22px] bg-[var(--coach-surface-muted)]" />
    </div>
  )
}

function DailyError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="daily-card px-[18px] py-6">
      <p className="font-medium">Daily could not load.</p>
      <p className="mt-2 text-sm text-[var(--coach-text-secondary)]">
        Check your connection and try again.
      </p>
      <Button className="mt-4" onClick={onRetry}>
        Retry
      </Button>
    </div>
  )
}
