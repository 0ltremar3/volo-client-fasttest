import { useQuery } from '@tanstack/react-query'
import { ChevronRight } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { reviewApi, type ReviewItem } from '@/api/volo'
import { AppAtmosphere } from '@/components/layout/app-atmosphere'
import { AppBottomNavigation } from '@/components/layout/app-bottom-navigation'
import { Button } from '@/components/ui/button'
import { mockAuthEnabled } from '@/features/auth/mock-auth'
import { mockReviewItems } from '@/features/review/review-mock'

const today = () => new Date().toLocaleDateString('en-CA')

export function ReviewPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedDate = validDate(searchParams.get('date')) ?? today()
  const month = selectedDate.slice(0, 7)
  const mockItems = useMemo(() => mockReviewItems(), [])
  const activity = useQuery({
    queryKey: ['volo-review-activity', month],
    queryFn: () => reviewApi.activity(month),
    enabled: !mockAuthEnabled,
  })
  const day = useQuery({
    queryKey: ['volo-review', selectedDate],
    queryFn: () => reviewApi.day(selectedDate),
    enabled: !mockAuthEnabled,
  })
  const activityDates = mockAuthEnabled
    ? [...new Set(mockItems.map((item) => item.date))]
    : (activity.data?.dates ?? [])
  const groups = mockAuthEnabled
    ? (['coach', 'echo', 'move'] as const).flatMap((type) => {
        const items = mockItems.filter((item) => item.date === selectedDate && item.type === type)
        return items.length ? [{ type, items }] : []
      })
    : (day.data?.groups ?? [])
  const selected = new Date(`${selectedDate}T12:00:00`)

  return (
    <div className="app-canvas relative isolate flex h-dvh min-h-0 flex-col overflow-hidden text-[var(--coach-ink)]">
      <AppAtmosphere />
      <header className="safe-top relative z-10 grid min-h-16 shrink-0 place-items-center">
        <h1 className="text-base font-semibold">Review</h1>
      </header>
      <main className="coach-scrollbar-none relative z-10 min-h-0 flex-1 overflow-y-auto px-[15px] pb-10">
        <div className="mt-3 flex items-end justify-between">
          <h2 className="font-display text-[28px] font-semibold leading-[38px]">
            {selected.toLocaleDateString('en-US', { weekday: 'long' })}
          </h2>
          <p className="mb-1 flex items-center text-sm text-[var(--coach-text-secondary)]">
            {selected.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            <ChevronRight className="size-4" />
          </p>
        </div>
        <MonthCalendar
          selectedDate={selectedDate}
          activityDates={activityDates}
          onSelect={(date) => setSearchParams({ date })}
        />

        {day.isPending && !mockAuthEnabled ? (
          <div className="mt-9 h-32 animate-pulse rounded-[22px] bg-[var(--coach-surface-muted)]" />
        ) : groups.length ? (
          <div className="mt-9 space-y-7">
            {groups.map((group) => (
              <section key={group.type} aria-labelledby={`review-${group.type}`}>
                <h3 id={`review-${group.type}`} className="mb-3 text-sm font-medium capitalize">
                  {group.type === 'echo' ? 'Echo' : group.type === 'move' ? 'Move' : 'Coach'}
                </h3>
                <div className="space-y-3">
                  {group.items.map((item) => (
                    <ReviewCard key={item.id} item={item} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <section className="mt-12 text-center text-[var(--coach-text-tertiary)]">
            <p className="text-base font-semibold">Nothing here yet</p>
            <p className="mx-auto mt-1 max-w-[16rem] text-base font-semibold leading-6">
              Your Coach conversations will appear here.
            </p>
            <Button
              asChild
              className="mt-5 h-[50px] w-full rounded-full bg-[var(--coach-surface-glass-strong)] text-[var(--coach-ink)] shadow-[var(--coach-shadow)]"
            >
              <Link to="/chat">Start a Conversation</Link>
            </Button>
          </section>
        )}
      </main>
      <AppBottomNavigation />
    </div>
  )
}

function MonthCalendar({
  selectedDate,
  activityDates,
  onSelect,
}: {
  selectedDate: string
  activityDates: string[]
  onSelect: (date: string) => void
}) {
  const [year, month] = selectedDate.split('-').map(Number)
  const days = new Date(year!, month!, 0).getDate()
  const offset = new Date(year!, month! - 1, 1).getDay()
  const cells = Array.from({ length: offset + days }, (_, index) =>
    index < offset ? null : index - offset + 1,
  )
  return (
    <section className="mt-4 rounded-[22px] bg-[var(--coach-surface-glass)] px-[20px] py-8 shadow-[var(--coach-shadow)] backdrop-blur-md">
      <div className="grid grid-cols-7 text-center text-[11px] text-[var(--coach-text-secondary)]">
        {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className="mt-5 grid grid-cols-7 gap-y-[9px]">
        {cells.map((day, index) => {
          if (!day) return <span key={`blank-${index}`} className="size-11" />
          const value = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const selected = value === selectedDate
          const active = activityDates.includes(value)
          return (
            <button
              key={value}
              type="button"
              className="relative mx-auto grid size-11 place-items-center rounded-full font-display text-lg"
              aria-pressed={selected}
              onClick={() => onSelect(value)}
            >
              {active && !selected ? (
                <span className="absolute left-1/2 top-1 size-1.5 -translate-x-1/2 rounded-full bg-[var(--coach-accent)]" />
              ) : null}
              <span
                className={`grid size-9 place-items-center rounded-full ${selected ? 'bg-[var(--coach-accent)] text-white' : ''}`}
              >
                {day}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function ReviewCard({ item }: { item: ReviewItem }) {
  return (
    <Link
      to={`/review/${item.id}`}
      className="block min-h-[90px] rounded-[18px] bg-[var(--coach-surface-glass)] px-[13px] py-3 shadow-[0_6px_18px_rgb(61_59_54/8%)] focus-visible:outline-offset-2"
    >
      <span className="line-clamp-2 block text-sm font-semibold">{item.title}</span>
      <span className="mt-1 line-clamp-2 block text-xs leading-4 text-[var(--coach-text-tertiary)]">
        {item.summary}
      </span>
      <span className="mt-2 flex items-center justify-between text-[11px] text-[var(--coach-text-tertiary)]">
        <time>
          {new Date(item.completed_at).toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
          })}
        </time>
        {item.move_count ? (
          <span className="rounded-full bg-[var(--coach-surface-muted)] px-2 py-0.5">
            {item.move_count} Move{item.move_count === 1 ? '' : 's'}
          </span>
        ) : null}
      </span>
    </Link>
  )
}

function validDate(value: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null
}
