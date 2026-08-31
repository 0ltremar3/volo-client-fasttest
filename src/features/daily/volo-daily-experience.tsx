import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Settings2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import echoArc from '@/assets/daily/echo-arc.svg'
import echoMarker from '@/assets/daily/echo-marker.svg'
import profileGlyph from '@/assets/daily/profile-glyph.svg'
import voloWordmark from '@/assets/daily/volo-wordmark.svg'
import {
  getGetV2DailyQueryKey,
  getGetV2MovesQueryKey,
  useDeleteV2MovesId,
  useGetV2Daily,
  useGetV2Moves,
  usePatchV2MovesIdCheck,
  usePostV2MovesIdAdjustmentSession,
  usePutV2MovesIdSchedule,
} from '@/api/generated/endpoints'
import type { GetV2Daily200Echo, GetV2Moves200ItemsItem } from '@/api/generated/models'
import { dailyApi } from '@/api/volo'
import { AppAtmosphere } from '@/components/layout/app-atmosphere'
import { AppBottomNavigation } from '@/components/layout/app-bottom-navigation'
import { Button } from '@/components/ui/button'
import { EchoSettingsSheet } from '@/features/daily/echo-settings-sheet'
import { PeriodMoves, type PeriodMoveItem } from '@/features/daily/period-moves'
import {
  formatDailyDate,
  formatIsoWeekday,
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
  const daily = useGetV2Daily({ date: selectedValue })
  const moves = useGetV2Moves()
  const queryClient = useQueryClient()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const scheduleValue: EchoSchedule = {
    time: daily.data?.echo?.schedule?.local_time ?? '21:00',
    date: selectedValue,
    repeat: 'daily',
    alarm: daily.data?.echo?.schedule?.enabled ?? false,
  }
  const saveSchedule = useMutation({
    mutationFn: (value: EchoSchedule) => dailyApi.saveEchoSchedule(value.alarm, value.time),
    onSuccess: async () => {
      setSettingsOpen(false)
      await queryClient.invalidateQueries({
        queryKey: getGetV2DailyQueryKey({ date: selectedValue }),
      })
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
          {daily.isPending || moves.isPending ? (
            <DailySkeleton />
          ) : daily.isError || moves.isError || !daily.data || !moves.data ? (
            <DailyError
              onRetry={() => {
                void daily.refetch()
                void moves.refetch()
              }}
            />
          ) : (
            <>
              <DailyEchoCard
                date={selectedValue}
                echo={daily.data.echo}
                onSettings={() => setSettingsOpen(true)}
              />

              <VoloPeriodMoves moves={moves.data.items} />

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
  echo: GetV2Daily200Echo
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

function VoloPeriodMoves({ moves }: { moves: GetV2Moves200ItemsItem[] }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const moveById = new Map(moves.map((move) => [move.id, move]))
  const items = moves.map(
    (move) =>
      ({
        id: move.id,
        schedule: formatMoveSchedule(move),
        text: move.description,
        source: 'From Coach',
        dueLabel: move.next_check_time
          ? `${move.next_check_time.local_date === today() ? 'Today' : move.next_check_time.local_date} ${move.next_check_time.local_time}`
          : 'No upcoming check',
        status: move.check?.status ?? null,
        scheduleValue: {
          startLocalDate: move.schedule.start_local_date,
          localTime: move.schedule.local_time,
          rule: move.schedule.rule,
          alarmEnabled: move.schedule.alarm_enabled,
        },
      }) satisfies PeriodMoveItem,
  )
  const update = usePatchV2MovesIdCheck()
  const adjustment = usePostV2MovesIdAdjustmentSession()
  const updateSchedule = usePutV2MovesIdSchedule()
  const remove = useDeleteV2MovesId()

  async function invalidateMoves() {
    await queryClient.invalidateQueries({ queryKey: getGetV2MovesQueryKey() })
  }

  function getMove(item: PeriodMoveItem) {
    const move = moveById.get(item.id)
    if (!move) throw new Error('Move is unavailable')
    return move
  }

  return (
    <PeriodMoves
      items={items}
      onStatusChange={async (item, status) => {
        const move = getMove(item)
        await update.mutateAsync({ id: move.id, data: { status } })
        await invalidateMoves()
      }}
      onRethink={async (item) => {
        const move = getMove(item)
        const result = await adjustment.mutateAsync({ id: move.id })
        await invalidateMoves()
        void navigate(`/chat?session=${result.session.id}`)
      }}
      onScheduleChange={async (item, schedule) => {
        const move = getMove(item)
        await updateSchedule.mutateAsync({
          id: move.id,
          data: {
            start_local_date: schedule.startLocalDate,
            local_time: schedule.localTime,
            rule: schedule.rule,
            alarm_enabled: schedule.alarmEnabled,
          },
        })
        await invalidateMoves()
      }}
      onDelete={async (item) => {
        const move = getMove(item)
        await remove.mutateAsync({ id: move.id })
        await invalidateMoves()
      }}
      onFindMove={() => void navigate('/chat')}
    />
  )
}

function formatMoveSchedule(move: GetV2Moves200ItemsItem) {
  const time = move.schedule.local_time
  const rule = move.schedule.rule
  if (rule.frequency === 'none') return `${move.schedule.start_local_date}  ·  ${time}`
  if (rule.frequency === 'daily') return `Every day  ·  ${time}`
  if (rule.frequency === 'weekly') {
    return `Every ${rule.weekdays.map(formatIsoWeekday).join(', ')}  ·  ${time}`
  }
  return `Monthly on day ${rule.day}  ·  ${time}`
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
