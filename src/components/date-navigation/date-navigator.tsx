import { ChevronRight, X } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'

import {
  commitFocusedDate,
  createDateWindow,
  dateIndexFromScroll,
  dateStripContentWidth,
  dateStripDayColumnSpacing,
  dateStripDayNumber,
  dateStripLayout,
  dateStripSideInset,
  dateStripStride,
  dateStripTickSizes,
  dateStripWeekdayLetter,
  enumerateDateWindow,
  expandDateWindow,
  formatDateStripFullDate,
  formatDateStripMonthYear,
  formatDateStripMonthYearValue,
  formatDateStripWeekday,
  isoDateDistance,
  monthGrid,
  monthYearFromIso,
  scrollLeftForIndex,
  shiftMonthYear,
  type MonthYear,
} from '@/components/date-navigation/date-strip-model'
import { cn } from '@/lib/utils'

type DateNavigatorProps = {
  value: string
  today: string
  onChange: (value: string) => void
  onExpansionChange?: (expanded: boolean) => void
  readOnly?: boolean
  className?: string
}

const weekdayHeadings = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const
const monthSwipeThreshold = 40

export function DateNavigator({
  value,
  today,
  onChange,
  onExpansionChange,
  readOnly = false,
  className,
}: DateNavigatorProps) {
  const headingId = useId()
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    return () => onExpansionChange?.(false)
  }, [onExpansionChange])

  function setExpandedState(next: boolean) {
    if (expanded === next) return
    setExpanded(next)
    onExpansionChange?.(next)
  }

  return (
    <section className={cn(className)} aria-labelledby={headingId}>
      {expanded && !readOnly ? (
        <MonthCalendar
          headingId={headingId}
          selected={value}
          today={today}
          onSelect={(next) => {
            onChange(next)
            setExpandedState(false)
          }}
          onClose={() => setExpandedState(false)}
        />
      ) : (
        <DateStrip
          headingId={headingId}
          value={value}
          today={today}
          readOnly={readOnly}
          onCommit={onChange}
          onOpenMonth={readOnly ? undefined : () => setExpandedState(true)}
        />
      )}
    </section>
  )
}

function DateStrip({
  headingId,
  value,
  today,
  readOnly,
  onCommit,
  onOpenMonth,
}: {
  headingId: string
  value: string
  today: string
  readOnly: boolean
  onCommit: (value: string) => void
  onOpenMonth?: () => void
}) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const settleTimerRef = useRef(0)
  const [width, setWidth] = useState(0)
  const [dateWindow, setDateWindow] = useState(() => createDateWindow(value))
  const [focused, setFocused] = useState(value)
  const [valueSeen, setValueSeen] = useState(value)
  const dates = useMemo(() => enumerateDateWindow(dateWindow), [dateWindow])

  if (value !== valueSeen) {
    setValueSeen(value)
    setFocused(value)
    if (value < dateWindow.start || value > dateWindow.end) {
      setDateWindow(expandDateWindow(createDateWindow(value), value))
    } else {
      const nextWindow = expandDateWindow(dateWindow, value)
      if (nextWindow !== dateWindow) setDateWindow(nextWindow)
    }
  }

  const contentWidth = dateStripContentWidth(width)
  const columnSpacing = dateStripDayColumnSpacing(contentWidth)
  const sideInset = dateStripSideInset(width)
  const stride = dateStripStride(columnSpacing)
  const showToday = !readOnly && focused !== today
  const stripHeight =
    dateStripLayout.dayBandHeight + dateStripLayout.tickGap + dateStripLayout.tickRowHeight

  useLayoutEffect(() => {
    const element = measureRef.current
    if (!element) return

    const updateWidth = () => setWidth(element.clientWidth)
    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const alignToDate = useCallback(
    (date: string, behavior: ScrollBehavior) => {
      const scroller = scrollerRef.current
      if (!scroller || stride <= 0) return
      const index = dates.indexOf(date)
      if (index < 0) return
      scroller.scrollTo({ left: scrollLeftForIndex(index, stride), behavior })
    },
    [dates, stride],
  )

  useLayoutEffect(() => {
    if (width <= 0) return
    alignToDate(value, 'auto')
  }, [alignToDate, value, width])

  const dateFromScroll = useCallback(() => {
    const scroller = scrollerRef.current
    if (!scroller || stride <= 0 || dates.length === 0) return value
    const lastIndex = Math.max(dates.length - 1, 0)
    const index = Math.min(lastIndex, Math.max(0, dateIndexFromScroll(scroller.scrollLeft, stride)))
    return dates[index] ?? value
  }, [dates, stride, value])

  const settle = useCallback(() => {
    window.clearTimeout(settleTimerRef.current)
    const next = dateFromScroll()
    setFocused(next)
    const committed = commitFocusedDate(next, value)
    if (committed) onCommit(committed)
    setDateWindow((current) => {
      const nextWindow = expandDateWindow(current, next)
      if (nextWindow === current) return current
      const scroller = scrollerRef.current
      if (scroller && stride > 0 && nextWindow.start !== current.start) {
        scroller.scrollLeft += isoDateDistance(nextWindow.start, current.start) * stride
      }
      return nextWindow
    })
  }, [dateFromScroll, onCommit, stride, value])

  function selectDate(date: string) {
    window.clearTimeout(settleTimerRef.current)
    setFocused(date)
    const committed = commitFocusedDate(date, value)
    if (committed) onCommit(committed)
    alignToDate(date, prefersReducedMotion() ? 'auto' : 'smooth')
  }

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return

    const onScrollEnd = () => settle()
    scroller.addEventListener('scrollend', onScrollEnd)
    return () => scroller.removeEventListener('scrollend', onScrollEnd)
  }, [settle])

  useEffect(() => {
    return () => window.clearTimeout(settleTimerRef.current)
  }, [])

  return (
    <div ref={measureRef}>
      <div className="flex min-h-touch items-center gap-3.5 text-[var(--coach-ink)]">
        <h1
          id={headingId}
          className="min-w-0 truncate font-display text-[28px] font-semibold leading-[38px]"
        >
          {formatDateStripWeekday(focused)}
        </h1>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {showToday ? (
            <button
              type="button"
              className="min-h-touch min-w-touch px-2 text-sm leading-[17px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => selectDate(today)}
            >
              Today
            </button>
          ) : null}
          {onOpenMonth ? (
            <button
              type="button"
              className="flex min-h-touch items-center gap-1 px-1 text-sm leading-[17px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-haspopup="dialog"
              aria-expanded={false}
              aria-label="Open month view"
              onClick={onOpenMonth}
            >
              <span>{formatDateStripMonthYear(focused)}</span>
              <ChevronRight className="size-3" strokeWidth={2.25} aria-hidden="true" />
            </button>
          ) : (
            <p className="px-1 text-sm leading-[17px]">{formatDateStripMonthYear(focused)}</p>
          )}
        </div>
      </div>

      <div
        className="relative"
        style={{ marginTop: dateStripLayout.headerToDayBandSpacing, height: stripHeight }}
      >
        <div
          ref={scrollerRef}
          className="coach-scrollbar-none h-full overflow-x-auto overscroll-x-contain"
          style={{
            paddingInline: sideInset,
            scrollSnapType: readOnly ? undefined : 'x mandatory',
            touchAction: readOnly ? 'pan-y' : 'pan-x',
          }}
          onScroll={() => {
            const next = dateFromScroll()
            if (next !== focused) setFocused(next)
            window.clearTimeout(settleTimerRef.current)
            settleTimerRef.current = window.setTimeout(settle, 80)
          }}
        >
          <div
            className="flex"
            style={{
              gap: columnSpacing,
              width:
                dates.length * dateStripLayout.dayColumnWidth +
                Math.max(dates.length - 1, 0) * columnSpacing,
            }}
          >
            {dates.map((date) => {
              const selected = date === focused
              return (
                <button
                  key={date}
                  type="button"
                  disabled={readOnly}
                  aria-pressed={selected}
                  aria-current={selected ? 'date' : undefined}
                  aria-label={formatDateStripFullDate(date)}
                  onClick={() => selectDate(date)}
                  className="flex shrink-0 flex-col items-center text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-100"
                  style={{
                    width: dateStripLayout.dayColumnWidth,
                    height: stripHeight,
                    scrollSnapAlign: 'center',
                    scrollSnapStop: 'always',
                  }}
                >
                  <span className="text-xs leading-none text-[var(--coach-text-tertiary)]">
                    {dateStripWeekdayLetter(date)}
                  </span>
                  <span
                    className={cn(
                      'mt-0.5 font-numeric text-xl leading-[27px] tabular-nums lining-nums',
                      selected ? 'text-[var(--coach-ink)]' : 'text-[var(--coach-text-secondary)]',
                    )}
                  >
                    {dateStripDayNumber(date)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center"
          style={{ height: dateStripLayout.tickRowHeight }}
          aria-hidden="true"
        >
          <div className="flex" style={{ width: contentWidth || undefined, gap: columnSpacing }}>
            {dateStripTickSizes.map((tick, index) => (
              <span
                key={index}
                className="flex items-end justify-center"
                style={{
                  width: dateStripLayout.dayColumnWidth,
                  height: dateStripLayout.tickRowHeight,
                }}
              >
                <span
                  className="rounded-full"
                  style={{
                    width: tick.width,
                    height: tick.height,
                    background: index === 3 ? 'var(--coach-ink)' : 'var(--coach-text-secondary)',
                  }}
                />
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function MonthCalendar({
  headingId,
  selected,
  today,
  onSelect,
  onClose,
}: {
  headingId: string
  selected: string
  today: string
  onSelect: (value: string) => void
  onClose: () => void
}) {
  const [displayed, setDisplayed] = useState<MonthYear>(() => monthYearFromIso(selected))
  const dialogRef = useRef<HTMLDivElement>(null)
  const dragOrigin = useRef<number | null>(null)
  const didSwipe = useRef(false)
  const cells = useMemo(() => monthGrid(displayed), [displayed])
  const showToday = selected !== today

  useEffect(() => {
    dialogRef.current?.focus()
  }, [])

  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    dragOrigin.current = event.clientX
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragOrigin.current == null) return
    const delta = event.clientX - dragOrigin.current
    dragOrigin.current = null
    if (Math.abs(delta) < monthSwipeThreshold) return
    didSwipe.current = true
    setDisplayed((current) => shiftMonthYear(current, delta < 0 ? 1 : -1))
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby={headingId}
      tabIndex={0}
      className="max-w-[330px] focus-visible:outline-none"
      onClickCapture={(event) => {
        if (!didSwipe.current) return
        didSwipe.current = false
        event.preventDefault()
        event.stopPropagation()
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') {
          event.preventDefault()
          setDisplayed((current) => shiftMonthYear(current, -1))
        }
        if (event.key === 'ArrowRight') {
          event.preventDefault()
          setDisplayed((current) => shiftMonthYear(current, 1))
        }
      }}
    >
      <div className="flex min-h-touch items-center gap-3">
        <h1 id={headingId} className="text-sm font-medium leading-[17px] text-[var(--coach-ink)]">
          {formatDateStripMonthYearValue(displayed)}
        </h1>
        <div className="ml-auto flex items-center">
          {showToday ? (
            <button
              type="button"
              className="min-h-touch px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => onSelect(today)}
            >
              <span className="inline-flex h-[30px] items-center rounded-full border border-[var(--coach-border)] bg-[var(--coach-surface-glass)] px-3.5 text-sm font-medium text-[var(--coach-ink)]">
                today
              </span>
            </button>
          ) : null}
          <button
            type="button"
            className="grid size-11 place-items-center rounded-full text-[var(--coach-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Close month view"
            onClick={onClose}
          >
            <X className="size-[18px]" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <div
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          dragOrigin.current = null
        }}
      >
        <div className="grid grid-cols-7 text-center text-sm leading-[17px] text-[var(--coach-text-tertiary)]">
          {weekdayHeadings.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
        <div className="mt-6 grid grid-cols-7 gap-y-2.5" role="grid" aria-label="Choose a date">
          {cells.map((date, index) =>
            date ? (
              <button
                key={date}
                type="button"
                role="gridcell"
                aria-pressed={date === selected}
                aria-label={formatDateStripFullDate(date)}
                onClick={() => onSelect(date)}
                className="mx-auto grid size-11 place-items-center rounded-full font-numeric text-xl tabular-nums lining-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span
                  className={cn(
                    'grid size-10 place-items-center rounded-full',
                    date === selected
                      ? 'bg-[var(--coach-ink)] text-[var(--background)]'
                      : 'text-[var(--coach-ink)]',
                  )}
                >
                  {dateStripDayNumber(date)}
                </span>
              </button>
            ) : (
              <span key={`empty-${index}`} className="size-11" aria-hidden="true" />
            ),
          )}
        </div>
      </div>
    </div>
  )
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
