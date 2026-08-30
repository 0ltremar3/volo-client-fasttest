import { ArrowRight, Check, Pencil, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { BeautifulPromptComposer } from '@/components/ai/beautiful-prompt-composer'
import { MoveCardSurface } from '@/components/cards/move-card-surface'
import { AppAtmosphere } from '@/components/layout/app-atmosphere'
import { AppBottomNavigation } from '@/components/layout/app-bottom-navigation'
import { Button } from '@/components/ui/button'
import { CoachOrb } from '@/features/coach/coach-orb'
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
} from '@/features/coach/coach-model'
import { cn } from '@/lib/utils'
import { mockAuthEnabled } from '@/features/auth/mock-auth'
import { VoloCoachExperience } from '@/features/coach/volo-coach-experience'

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
      <MoveCardSurface
        schedule="Every Sun · 09:00 / 21:00"
        source="From “The Cost of Choice”"
        dueLabel="Today 21:00"
        status={
          state === 'added' ? (
            <span className="inline-flex items-center gap-1 font-medium text-[var(--coach-success)]">
              <Check className="size-3.5" /> Added
            </span>
          ) : null
        }
      >
        {state === 'editing' ? (
          <textarea
            value={text}
            onChange={(event) => onTextChange(event.target.value)}
            rows={3}
            className="w-full resize-none rounded-lg bg-[var(--coach-surface-muted)] p-3 text-base leading-6 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Edit move"
          />
        ) : (
          <p>{text}</p>
        )}
      </MoveCardSurface>

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

function CoachExperienceState({
  initialSession,
}: {
  initialSession: (typeof mockSessions)[number] | undefined
}) {
  const [screen, setScreen] = useState<CoachScreen>('conversation')
  const [schedule, setSchedule] = useState(defaultSchedule)
  const [messages, setMessages] = useState<CoachMessage[]>(
    initialSession?.messages ?? previewMessages,
  )
  const [replying, setReplying] = useState(false)
  const [turn, setTurn] = useState(initialSession ? 0 : 2)
  const [moveState, setMoveState] = useState<MoveState>(initialSession ? 'hidden' : 'suggested')
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

  const coachChromeVisible = screen !== 'welcome' && screen !== 'schedule'
  return (
    <div className="app-canvas relative isolate flex h-dvh min-h-0 w-full flex-col overflow-hidden text-[var(--coach-ink)]">
      <AppAtmosphere />
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
        <AppBottomNavigation onCoach={() => setScreen('conversation')} />
      ) : null}
    </div>
  )
}

export function CoachExperience() {
  return mockAuthEnabled ? <MockCoachExperience /> : <VoloCoachExperience />
}

function MockCoachExperience() {
  const location = useLocation()
  const navigate = useNavigate()
  const sessionId = new URLSearchParams(location.search).get('session')
  const session = mockSessions.find((candidate) => candidate.id === sessionId)

  useEffect(() => {
    if (sessionId && !session) void navigate('/chat', { replace: true })
  }, [navigate, session, sessionId])

  return <CoachExperienceState key={session?.id ?? 'default'} initialSession={session} />
}
