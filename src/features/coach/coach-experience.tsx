import {
  ArrowRight,
  Check,
  ChevronRight,
  History,
  Pencil,
  Sparkles,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { BeautifulPromptComposer } from '@/components/ai/beautiful-prompt-composer'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import coachNavSchedule from '@/assets/coach/coach-nav-schedule.svg'
import coachNavSurface from '@/assets/coach/coach-nav-surface.svg'
import { CoachNavMark, CoachOrb } from '@/features/coach/coach-orb'
import {
  defaultSchedule,
  formatScheduleDate,
  formatScheduleTime,
  mockSessions,
  moveCopy,
  openingMessages,
  previewMessages,
  type CoachMessage,
  type CoachSchedule,
  type CoachScreen,
  type CoachSession,
} from '@/features/coach/coach-model'
import { cn } from '@/lib/utils'

type MoveState = 'hidden' | 'suggested' | 'editing' | 'added' | 'skipped'

function CoachHeader() {
  return (
    <header className="safe-top sticky top-0 z-30">
      <div className="grid h-16 grid-cols-[2.75rem_1fr_2.75rem] items-center px-3">
        <span aria-hidden="true" />
        <p className="text-center text-base font-semibold text-[var(--coach-ink)]">Coach</p>
        <span aria-hidden="true" />
      </div>
    </header>
  )
}

function CoachBottomNavigation({
  active,
  onHome,
  onCoach,
  onHistory,
}: {
  active: 'home' | 'coach' | 'history'
  onHome: () => void
  onCoach: () => void
  onHistory: () => void
}) {
  return (
    <nav
      className="safe-bottom relative z-30 grid min-h-[93px] shrink-0 grid-cols-3 items-start px-11 pt-3"
      aria-label="Coach navigation"
    >
      <img
        data-coach-nav-bump
        src={coachNavSurface}
        alt=""
        width="430"
        height="133"
        className="pointer-events-none absolute -left-5 -top-[14px] h-[133px] w-[430px] max-w-none"
        style={{ filter: 'var(--coach-nav-surface-filter)' }}
        aria-hidden="true"
      />
      <button
        type="button"
        onClick={onHome}
        aria-label="Open Coach schedule"
        aria-current={active === 'home' ? 'page' : undefined}
        className="relative z-10 mx-auto grid min-h-touch min-w-touch place-items-center rounded-full text-[var(--coach-text-tertiary)] transition-[color,transform] duration-150 active:scale-[0.97] aria-[current=page]:text-[var(--coach-ink)]"
      >
        <span
          className="size-[27px] bg-current"
          style={{
            maskImage: `url(${coachNavSchedule})`,
            maskPosition: 'center',
            maskRepeat: 'no-repeat',
            maskSize: '100% 100%',
            WebkitMaskImage: `url(${coachNavSchedule})`,
            WebkitMaskPosition: 'center',
            WebkitMaskRepeat: 'no-repeat',
            WebkitMaskSize: '100% 100%',
          }}
          aria-hidden="true"
        />
      </button>

      <button
        type="button"
        onClick={onCoach}
        aria-label="Open Coach conversation"
        aria-current={active === 'coach' ? 'page' : undefined}
        className="coach-pressable relative z-10 mx-auto -mt-3 grid size-16 place-items-center transition-transform duration-150 active:scale-[0.97]"
      >
        <CoachNavMark />
      </button>

      <button
        type="button"
        onClick={onHistory}
        aria-label="Open conversation history"
        aria-haspopup="dialog"
        aria-current={active === 'history' ? 'page' : undefined}
        className="relative z-10 mx-auto grid min-h-touch min-w-touch place-items-center rounded-full text-[var(--coach-text-tertiary)] transition-[color,transform] duration-150 active:scale-[0.97] aria-[current=page]:text-[var(--coach-ink)]"
      >
        <History className="size-[28px]" aria-hidden="true" />
      </button>
    </nav>
  )
}

function FocusCard() {
  return (
    <article className="min-h-[175px] rounded-[22px] border border-white/80 bg-[var(--coach-focus)] px-[22px] py-5 shadow-[var(--coach-card-shadow)] backdrop-blur-sm">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--coach-text-tertiary)]">
        FOCUS
      </p>
      <h1 className="mt-4 max-w-[15.625rem] text-balance font-display text-[22px] font-semibold leading-[30px] text-[var(--coach-ink)]">
        The cost of choice,
        <br />
        and what I truly want
      </h1>
      <div className="mt-4 flex flex-wrap gap-2">
        {['Career Choice', 'Inner Standards'].map((topic) => (
          <span
            key={topic}
            className="inline-flex h-[22px] items-center rounded-full border border-[var(--coach-border-warm-subtle)] bg-[var(--coach-surface-glass-strong)] px-[10px] text-[11px] font-medium text-[var(--coach-ink)]"
          >
            {topic}
          </span>
        ))}
      </div>
    </article>
  )
}

function CoachHistoryDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (session: CoachSession) => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      className="coach-dialog m-0 h-dvh max-h-none w-[min(22.5rem,calc(100vw-1rem))] max-w-none bg-[var(--coach-surface)] p-0 text-[var(--coach-ink)]"
      onClose={() => onOpenChange(false)}
      onCancel={(event) => {
        event.preventDefault()
        onOpenChange(false)
      }}
      aria-labelledby="coach-history-title"
    >
      <div className="safe-top safe-bottom flex h-full flex-col">
        <div className="flex h-16 items-center gap-3 border-b border-[var(--coach-border)] px-4">
          <div className="min-w-0 flex-1">
            <h2 id="coach-history-title" className="text-base font-semibold">
              Conversations
            </h2>
            <p className="text-xs text-[var(--coach-text-secondary)]">Local mock history</p>
          </div>
          <ThemeToggle />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            aria-label="Close conversation history"
          >
            <X />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {mockSessions.map((session) => (
            <button
              key={session.id}
              type="button"
              onClick={() => onSelect(session)}
              className="group mb-1 flex min-h-touch w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-[var(--coach-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-[var(--coach-accent-muted)] text-[var(--coach-accent)]">
                <Sparkles className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{session.title}</span>
                <span className="mt-0.5 block text-xs text-[var(--coach-text-tertiary)]">
                  {session.date}
                </span>
                <span className="mt-2 line-clamp-2 block text-xs leading-5 text-[var(--coach-text-secondary)]">
                  {session.preview}
                </span>
              </span>
              <ChevronRight
                className="mt-2 size-4 shrink-0 text-[var(--coach-text-tertiary)] transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </button>
          ))}
        </div>
      </div>
    </dialog>
  )
}

function WelcomeScreen({ onSchedule, onStart }: { onSchedule: () => void; onStart: () => void }) {
  return (
    <section className="flex flex-1 flex-col items-center px-6 pb-10 pt-[15vh] text-center">
      <CoachOrb />
      <div className="mt-8 w-full">
        <h1 className="font-display text-4xl font-medium leading-none tracking-[-0.02em] text-[var(--coach-ink)]">
          Hello, Jiayu.
        </h1>
        <p className="mx-auto mt-3 max-w-[19rem] text-[1.625rem] font-semibold leading-none text-[var(--coach-ink)]">
          I’m here to help you hear yourself.
        </p>
        <p className="mx-auto mt-6 max-w-[20rem] text-base leading-5 text-[var(--coach-text-secondary)]">
          Make a little space for this conversation.
          <br />
          20–40 minutes is usually enough.
        </p>
      </div>

      <div className="mt-auto w-full pt-14">
        <Button
          type="button"
          onClick={onSchedule}
          className="h-[50px] w-full rounded-full bg-[var(--coach-surface)] text-base text-[var(--coach-ink)] shadow-[var(--coach-shadow)] hover:bg-[var(--coach-surface)]/90"
        >
          Find a Time
        </Button>
        <button
          type="button"
          onClick={onStart}
          className="mt-2 min-h-touch px-5 text-sm font-medium text-[var(--coach-text-secondary)] transition-colors hover:text-[var(--coach-ink)]"
        >
          Start Now
        </button>
      </div>
    </section>
  )
}

function ScheduleScreen({
  value,
  onChange,
  onClose,
  onSchedule,
}: {
  value: CoachSchedule
  onChange: (value: CoachSchedule) => void
  onClose: () => void
  onSchedule: () => void
}) {
  return (
    <section className="flex flex-1 flex-col px-6 pb-10">
      <div className="relative flex h-12 items-center justify-center">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute left-[-0.5rem]"
          onClick={onClose}
          aria-label="Close scheduling"
        >
          <X />
        </Button>
        <h1 className="text-base font-semibold">Find a time</h1>
      </div>

      <CoachOrb className="mx-auto mt-2" />
      <p className="mx-auto mt-4 max-w-[16rem] text-center text-base leading-5 text-[var(--coach-ink)]">
        Choose a time
        <br />
        when you won’t feel rushed.
      </p>

      <div className="mt-9 divide-y divide-[var(--coach-border-strong)]">
        <label className="flex min-h-[70px] items-center gap-4">
          <span className="min-w-0 flex-1 text-base">What’s on your mind?</span>
          <select
            value={value.topic}
            onChange={(event) => onChange({ ...value, topic: event.target.value })}
            className="coach-chip max-w-[10rem] appearance-none truncate px-4 text-right text-sm"
          >
            <option>Career Direction</option>
            <option>Leadership</option>
            <option>A difficult decision</option>
          </select>
        </label>
        <label className="flex min-h-[70px] items-center gap-4">
          <span className="min-w-0 flex-1 text-base">Date</span>
          <input
            type="date"
            value={value.date}
            onChange={(event) => onChange({ ...value, date: event.target.value })}
            className="coach-chip w-[9.75rem] px-3 text-sm"
          />
        </label>
        <label className="flex min-h-[70px] items-center gap-4">
          <span className="min-w-0 flex-1 text-base">Time</span>
          <input
            type="time"
            value={value.time}
            onChange={(event) => onChange({ ...value, time: event.target.value })}
            className="coach-chip w-[7.5rem] px-3 text-sm"
          />
        </label>
        <div className="flex min-h-[70px] items-center gap-4">
          <span className="min-w-0 flex-1 text-base">Alarm</span>
          <button
            type="button"
            role="switch"
            aria-checked={value.alarm}
            onClick={() => onChange({ ...value, alarm: !value.alarm })}
            className="relative h-11 w-20 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-checked={value.alarm}
          >
            <span
              aria-hidden="true"
              className={cn(
                'absolute inset-x-0 top-[7px] h-[30px] rounded-full transition-colors',
                value.alarm ? 'bg-[var(--coach-accent)]' : 'bg-[var(--coach-toggle-off)]',
              )}
            />
            <span
              className={cn(
                'absolute left-0.5 top-[9px] size-[26px] rounded-full bg-white shadow-sm transition-transform duration-200',
                value.alarm ? 'translate-x-12' : 'translate-x-0',
              )}
            />
            <span className="sr-only">{value.alarm ? 'Alarm on' : 'Alarm off'}</span>
          </button>
        </div>
      </div>

      <Button
        type="button"
        onClick={onSchedule}
        className="mt-auto h-[50px] rounded-full bg-[var(--coach-surface)] text-base text-[var(--coach-ink)] shadow-[var(--coach-shadow)] hover:bg-[var(--coach-surface)]/90"
      >
        Schedule
      </Button>
    </section>
  )
}

function SessionCard({ schedule }: { schedule: CoachSchedule }) {
  return (
    <article className="rounded-xl bg-[var(--coach-surface)] px-[18px] py-4 shadow-[var(--coach-shadow)]">
      <p className="text-base font-medium leading-6 text-[var(--coach-ink)]">
        Set aside 30 minutes to explore what this direction is asking of you.
      </p>
      <div className="mt-4 flex items-end gap-3 text-xs text-[var(--coach-text-tertiary)]">
        <span className="min-w-0 flex-1 truncate">From “The Cost of Choice”</span>
        <time className="shrink-0">
          {formatScheduleDate(schedule.date)} · {formatScheduleTime(schedule.time)}
        </time>
      </div>
    </article>
  )
}

function HomeScreen({
  schedule,
  onStart,
  onSend,
}: {
  schedule: CoachSchedule
  onStart: () => void
  onSend: (text: string) => void
}) {
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
        <p className="pt-8 text-center text-lg font-semibold">Next Session</p>
        <CoachOrb className="mx-auto mt-8" />
        <button
          type="button"
          onClick={onStart}
          className="group mt-8 block min-h-touch w-full text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="block text-4xl font-semibold leading-none tracking-[-0.03em]">
            {schedule.topic}
          </span>
          <span className="mt-3 inline-flex items-center gap-1.5 text-sm text-[var(--coach-text-secondary)]">
            {formatScheduleDate(schedule.date)} · {formatScheduleTime(schedule.time)}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </button>

        <h2 className="mt-12 text-lg font-semibold">Coach Schedule</h2>
        <div className="mt-3">
          <SessionCard schedule={schedule} />
        </div>
      </div>
      <BeautifulPromptComposer placeholder="What’s on your mind?" onSend={onSend} />
    </section>
  )
}

function MessageBubble({ message }: { message: CoachMessage }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end pl-12">
        <p className="max-w-[18.5rem] text-pretty rounded-[22px] border border-white/80 bg-[var(--coach-user-bubble)] px-4 py-3 text-base font-medium leading-5 text-[var(--coach-text-warm)] shadow-[var(--coach-shadow)]">
          {message.text}
        </p>
      </div>
    )
  }

  return (
    <div className="pr-3">
      <p className="text-pretty whitespace-pre-line text-base font-medium leading-5 text-[var(--coach-ink)]">
        {message.text}
      </p>
    </div>
  )
}

function MoveCard({
  state,
  text,
  onTextChange,
  onEdit,
  onAccept,
  onSkip,
  onSave,
}: {
  state: MoveState
  text: string
  onTextChange: (text: string) => void
  onEdit: () => void
  onAccept: () => void
  onSkip: () => void
  onSave: () => void
}) {
  if (state === 'hidden' || state === 'skipped') return null

  return (
    <div className="animate-[coach-rise_240ms_var(--ease-standard)_both]">
      <p className="mb-4 text-pretty text-base font-medium leading-5">
        Based on our conversation, here’s a move that reflects what matters most to you:
      </p>
      <article className="min-h-[146px] rounded-[22px] border border-white/80 bg-[var(--coach-surface-glass)] p-[18px] shadow-[var(--coach-card-shadow)] backdrop-blur-sm">
        <div className="flex min-h-[15px] items-center gap-3 text-xs text-[var(--coach-text-tertiary)]">
          <span className="min-w-0 flex-1">Every Sun · 09:00 / 21:00</span>
          {state === 'added' ? (
            <span className="inline-flex items-center gap-1 font-medium text-[var(--coach-success)]">
              <Check className="size-3.5" /> Added
            </span>
          ) : null}
        </div>

        {state === 'editing' ? (
          <textarea
            value={text}
            onChange={(event) => onTextChange(event.target.value)}
            rows={3}
            className="mt-4 w-full resize-none rounded-lg bg-[var(--coach-surface-muted)] p-3 text-base leading-6 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Edit move"
          />
        ) : (
          <p className="mt-4 text-pretty text-lg font-medium leading-6">{text}</p>
        )}
        <div className="mt-4 flex items-end gap-3 text-xs text-[var(--coach-text-tertiary)]">
          <p className="min-w-0 flex-1 truncate">From “The Cost of Choice”</p>
          <time className="shrink-0 font-semibold">Today 21:00</time>
        </div>
      </article>

      {state === 'suggested' || state === 'editing' ? (
        <div className="mt-3 px-3">
          <p className="text-base font-medium text-[var(--coach-ink)]">Make this your move?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {state === 'editing' ? (
              <Button type="button" onClick={onSave} className="min-h-touch rounded-full px-4">
                Save move
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  onClick={onAccept}
                  className="min-h-touch rounded-full bg-[var(--coach-surface-glass)] px-4 text-[var(--coach-ink)] shadow-[var(--coach-shadow)] hover:bg-[var(--coach-surface-glass-strong)]"
                >
                  Add move
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onEdit}
                  className="min-h-touch rounded-full px-4"
                >
                  <Pencil /> Edit
                </Button>
              </>
            )}
            <Button
              type="button"
              variant="ghost"
              onClick={onSkip}
              className="min-h-touch rounded-full px-4"
            >
              Skip
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ConversationScreen({
  messages,
  replying,
  moveState,
  moveText,
  onMoveTextChange,
  onMoveStateChange,
  onSend,
  onPause,
}: {
  messages: CoachMessage[]
  replying: boolean
  moveState: MoveState
  moveText: string
  onMoveTextChange: (text: string) => void
  onMoveStateChange: (state: MoveState) => void
  onSend: (text: string) => void
  onPause: () => void
}) {
  const endRef = useRef<HTMLDivElement>(null)
  const previousScrollStateRef = useRef({
    messageCount: messages.length,
    moveState,
    replying,
  })

  useEffect(() => {
    const previous = previousScrollStateRef.current
    const changed =
      previous.messageCount !== messages.length ||
      previous.moveState !== moveState ||
      previous.replying !== replying
    previousScrollStateRef.current = { messageCount: messages.length, moveState, replying }
    if (!changed) return
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, moveState, replying])

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="coach-scrollbar-none min-h-0 flex-1 overflow-y-auto px-[15px] pb-5 pt-1">
        <div className="mb-9">
          <FocusCard />
        </div>

        <div className="space-y-6 px-[5px]" aria-live="polite">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {replying ? (
            <div
              className="flex items-center gap-2 text-sm text-[var(--coach-text-secondary)]"
              role="status"
            >
              <CoachOrb
                className="size-7 [&_img]:!inset-[3px_5px] [&_img]:!h-[22px] [&_img]:!w-[18px] [&_.coach-orb__glow]:!inset-[5px]"
                speaking
              />
              <span>Listening for what matters…</span>
            </div>
          ) : null}

          <MoveCard
            state={moveState}
            text={moveText}
            onTextChange={onMoveTextChange}
            onEdit={() => onMoveStateChange('editing')}
            onAccept={() => onMoveStateChange('added')}
            onSkip={() => onMoveStateChange('skipped')}
            onSave={() => onMoveStateChange('suggested')}
          />

          {!replying && (moveState === 'added' || moveState === 'skipped') ? (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={onPause}
                className="min-h-touch rounded-full px-5 text-sm font-medium text-[var(--coach-text-secondary)] hover:text-[var(--coach-ink)]"
              >
                Pause and reflect
              </button>
            </div>
          ) : null}
          <div ref={endRef} />
        </div>
      </div>
      <BeautifulPromptComposer
        placeholder="Say what feels present…"
        showInspirations
        onSend={onSend}
      />
    </section>
  )
}

function SummaryScreen({ moveText, onContinue }: { moveText: string; onContinue: () => void }) {
  return (
    <section className="min-h-0 flex-1 overflow-y-auto px-5 pb-10 pt-8">
      <CoachOrb className="mx-auto" />
      <h1 className="mt-6 text-center font-display text-3xl font-medium leading-tight">
        A good place to pause.
      </h1>
      <p className="mx-auto mt-3 max-w-[19rem] text-center text-sm leading-6 text-[var(--coach-text-secondary)]">
        You’ve made something clear enough to carry forward.
      </p>

      <article className="mt-8 rounded-xl bg-[var(--coach-surface)] px-[18px] py-5 shadow-[var(--coach-card-shadow)]">
        <p className="text-xs font-semibold text-[var(--coach-text-tertiary)]">TOPIC TO EXPLORE</p>
        <p className="mt-3 text-lg font-semibold leading-6">
          The cost of choosing — and what I really want
        </p>
        <div className="my-4 h-px bg-[var(--coach-border)]" />
        <p className="text-xs font-semibold text-[var(--coach-text-tertiary)]">TAKE AWAY</p>
        <p className="mt-2 text-sm leading-6 text-[var(--coach-text-secondary)]">
          What’s holding me back isn’t a lack of options. It’s the fear that choosing one means
          losing everything else.
        </p>
        <div className="my-4 h-px bg-[var(--coach-border)]" />
        <p className="text-xs font-semibold text-[var(--coach-text-tertiary)]">MY MOVE</p>
        <p className="mt-2 text-sm leading-6">{moveText}</p>
      </article>

      <Button
        type="button"
        onClick={onContinue}
        className="mt-6 h-[50px] w-full rounded-full bg-[var(--coach-surface)] text-[var(--coach-ink)] shadow-[var(--coach-shadow)] hover:bg-[var(--coach-surface)]/90"
      >
        Return to Coach
      </Button>
    </section>
  )
}

export function CoachExperience() {
  const [screen, setScreen] = useState<CoachScreen>('conversation')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [schedule, setSchedule] = useState(defaultSchedule)
  const [messages, setMessages] = useState<CoachMessage[]>(previewMessages)
  const [replying, setReplying] = useState(false)
  const [turn, setTurn] = useState(2)
  const [moveState, setMoveState] = useState<MoveState>('suggested')
  const [moveText, setMoveText] = useState(moveCopy)
  const timerRef = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    },
    [],
  )

  function clearPendingReply() {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = null
    setReplying(false)
  }

  function startConversation() {
    clearPendingReply()
    setMessages(openingMessages)
    setTurn(0)
    setMoveState('hidden')
    setScreen('conversation')
  }

  function sendMessage(text: string) {
    clearPendingReply()
    const nextTurn = turn + 1
    const userMessage: CoachMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
    }

    setMessages((current) => {
      const base = screen === 'conversation' ? current : openingMessages
      return [...base, userMessage]
    })
    setScreen('conversation')
    setTurn(nextTurn)
    setReplying(true)

    timerRef.current = window.setTimeout(() => {
      if (nextTurn === 1) {
        setMessages((current) => [
          ...current,
          {
            id: `coach-${Date.now()}`,
            role: 'coach',
            text: 'You’ve been holding this question for a while. What seems to take most of your attention when you sit with it?',
          },
        ])
      } else if (nextTurn === 2) {
        setMessages((current) => [
          ...current,
          {
            id: `coach-${Date.now()}`,
            role: 'coach',
            text: 'I hear a wish to choose with honesty, without pretending there is no cost. Let’s make that insight tangible.',
          },
        ])
        setMoveState('suggested')
      } else {
        setMessages((current) => [
          ...current,
          {
            id: `coach-${Date.now()}`,
            role: 'coach',
            text: 'What changes when you say that out loud? Stay with the part that feels unexpectedly true.',
          },
        ])
      }
      setReplying(false)
      timerRef.current = null
    }, 720)
  }

  function openSession(session: CoachSession) {
    clearPendingReply()
    setMessages(session.messages)
    setTurn(0)
    setMoveState('hidden')
    setScreen('conversation')
    setHistoryOpen(false)
  }

  const coachChromeVisible = screen !== 'welcome' && screen !== 'schedule'
  const activeNavigation = historyOpen ? 'history' : screen === 'home' ? 'home' : 'coach'

  return (
    <div className="coach-canvas relative isolate flex h-dvh min-h-0 w-full flex-col overflow-hidden text-[var(--coach-ink)]">
      <span
        className="coach-atmosphere pointer-events-none absolute inset-0 -z-10"
        aria-hidden="true"
      />
      {coachChromeVisible ? <CoachHeader /> : null}

      <main className="flex min-h-0 flex-1 flex-col">
        {screen === 'welcome' ? (
          <WelcomeScreen onSchedule={() => setScreen('schedule')} onStart={startConversation} />
        ) : null}
        {screen === 'schedule' ? (
          <ScheduleScreen
            value={schedule}
            onChange={setSchedule}
            onClose={() => setScreen('welcome')}
            onSchedule={() => setScreen('home')}
          />
        ) : null}
        {screen === 'home' ? (
          <HomeScreen schedule={schedule} onStart={startConversation} onSend={sendMessage} />
        ) : null}
        {screen === 'conversation' ? (
          <ConversationScreen
            messages={messages}
            replying={replying}
            moveState={moveState}
            moveText={moveText}
            onMoveTextChange={setMoveText}
            onMoveStateChange={setMoveState}
            onSend={sendMessage}
            onPause={() => setScreen('summary')}
          />
        ) : null}
        {screen === 'summary' ? (
          <SummaryScreen moveText={moveText} onContinue={() => setScreen('home')} />
        ) : null}
      </main>

      {coachChromeVisible ? (
        <CoachBottomNavigation
          active={activeNavigation}
          onHome={() => setScreen('home')}
          onCoach={() => setScreen('conversation')}
          onHistory={() => setHistoryOpen(true)}
        />
      ) : null}

      <CoachHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} onSelect={openSession} />
    </div>
  )
}
