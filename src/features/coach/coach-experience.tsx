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
  CoachConversationHeader,
  CoachFocusCard,
  CoachPauseDialog,
  MoveScheduleFields,
} from '@/features/coach/coach-conversation-ui'
import {
  isEmptyCoachConversation,
  resolveCoachLanding,
} from '@/features/coach/coach-conversation-state'
import {
  defaultSchedule,
  formatScheduleDate,
  formatScheduleTime,
  mockMoveProposal,
  mockSessions,
  moveCopy,
  openingMessages,
  readMockCoachHomeState,
  resolveMoveScheduleDraft,
  previewMessages,
  writeMockCoachHomeState,
  type CoachMessage,
  type CoachSchedule,
  type CoachScreen,
  type MoveScheduleFrequency,
} from '@/features/coach/coach-model'
import { cn } from '@/lib/utils'
import { mockAuthEnabled } from '@/features/auth/mock-auth'
import { VoloCoachExperience } from '@/features/coach/volo-coach-experience'

type MoveState = 'hidden' | 'suggested' | 'editing' | 'added' | 'skipped'

function CoachHomeHeader() {
  return (
    <header className="safe-top relative z-30 flex h-[104px] shrink-0 items-end px-9 pb-[10px]">
      <h1 className="text-lg font-semibold text-[var(--coach-ink)]">Coach Schedule</h1>
    </header>
  )
}

function FocusCard() {
  return (
    <CoachFocusCard
      title="The cost of choice, and what I truly want"
      topics={['Career Choice', 'Inner Standards']}
    />
  )
}

function WelcomeScreen({ onSchedule, onStart }: { onSchedule: () => void; onStart: () => void }) {
  return (
    <section className="flex flex-1 flex-col items-center px-[25px] pb-[145px] pt-[220px] text-center">
      <CoachOrb />
      <div className="mt-[35px] w-full">
        <h1 className="font-display text-4xl font-medium leading-none tracking-[-0.02em] text-[var(--coach-ink)]">
          Hello, Jiayu.
        </h1>
        <p className="mx-auto mt-2 max-w-[19rem] text-[1.625rem] font-semibold leading-8 text-[var(--coach-ink)]">
          I’m here to help you hear yourself.
        </p>
        <p className="mx-auto mt-5 max-w-[20rem] text-base leading-[18px] text-[var(--coach-text-secondary)]">
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
    <article className="min-h-[116px] rounded-[22px] bg-[var(--coach-surface-glass)] px-[18px] py-[18px] shadow-[var(--coach-shadow)]">
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
  onSchedule,
}: {
  schedule: CoachSchedule
  onStart: () => void
  onSchedule: () => void
}) {
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="coach-scrollbar-none min-h-0 flex-1 overflow-y-auto px-5 pb-5">
        <SessionCard schedule={schedule} />
        <p className="mt-12 text-center text-lg font-semibold">Next Session</p>
        <CoachOrb className="mx-auto mt-[35px]" />
        <button
          type="button"
          onClick={onStart}
          className="group mt-7 block min-h-touch w-full text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="block text-4xl font-semibold leading-none tracking-[-0.03em]">
            {schedule.topic}
          </span>
          <span className="mt-3 inline-flex items-center gap-1.5 text-sm text-[var(--coach-text-secondary)]">
            {formatScheduleDate(schedule.date)} · {formatScheduleTime(schedule.time)}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </button>
      </div>
      <div className="shrink-0 px-[25px] pb-4 pt-2">
        <Button
          type="button"
          onClick={onSchedule}
          className="h-[50px] w-full rounded-full bg-[var(--coach-surface)] text-base font-medium text-[var(--coach-ink)] shadow-[var(--coach-shadow)] hover:bg-[var(--coach-surface-glass-strong)]"
        >
          Schedule a Session
        </Button>
        <button
          type="button"
          onClick={onStart}
          className="mt-2 min-h-11 w-full rounded-full px-5 text-sm font-medium text-[var(--coach-text-secondary)]"
        >
          New Conversation
        </button>
      </div>
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
  const initialSchedule = resolveMoveScheduleDraft(mockMoveProposal.suggested_schedule)
  const [frequency, setFrequency] = useState<MoveScheduleFrequency>(initialSchedule.frequency)
  const [time, setTime] = useState(initialSchedule.time)

  if (state === 'hidden' || state === 'skipped') return null

  return (
    <div className="animate-[coach-rise_240ms_var(--ease-standard)_both]">
      <p className="mb-4 text-pretty text-base font-medium leading-5">
        Based on our conversation, here’s a move that reflects what matters most to you:
      </p>
      <MoveCardSurface
        schedule={`${frequency[0]!.toUpperCase()}${frequency.slice(1)} · ${time}`}
        source="From “The Cost of Choice”"
        dueLabel={state === 'added' ? `Today ${time}` : ''}
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
        {state === 'suggested' || state === 'editing' ? (
          <MoveScheduleFields
            frequency={frequency}
            time={time}
            onFrequencyChange={setFrequency}
            onTimeChange={setTime}
          />
        ) : null}
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
  disabled,
  inputRef,
}: {
  messages: CoachMessage[]
  replying: boolean
  moveState: MoveState
  moveText: string
  onMoveTextChange: (text: string) => void
  onMoveStateChange: (state: MoveState) => void
  onSend: (text: string) => void
  disabled: boolean
  inputRef: React.RefObject<HTMLTextAreaElement | null>
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
              <CoachOrb className="size-7" speaking />
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

          <div ref={endRef} />
        </div>
      </div>
      <BeautifulPromptComposer
        placeholder="Say what feels present…"
        showInspirations
        disabled={disabled}
        inputRef={inputRef}
        onSend={onSend}
      />
    </section>
  )
}

function CoachExperienceState({
  initialSession,
}: {
  initialSession: (typeof mockSessions)[number] | undefined
}) {
  const navigate = useNavigate()
  const initialHome = readMockCoachHomeState()
  const initialLanding = resolveCoachLanding(
    Boolean(initialSession) || initialHome.hasCurrentSession,
    initialHome.hasScheduledSession ? 1 : 0,
  )
  const [homeState, setHomeState] = useState(initialHome)
  const [screen, setScreen] = useState<CoachScreen>(
    initialLanding === 'session'
      ? 'conversation'
      : initialLanding === 'scheduled'
        ? 'home'
        : 'welcome',
  )
  const [schedule, setSchedule] = useState(defaultSchedule)
  const [messages, setMessages] = useState<CoachMessage[]>(
    initialSession?.messages ?? previewMessages,
  )
  const [replying, setReplying] = useState(false)
  const [turn, setTurn] = useState(initialSession ? 0 : 2)
  const [moveState, setMoveState] = useState<MoveState>(initialSession ? 'hidden' : 'suggested')
  const [moveText, setMoveText] = useState(moveCopy)
  const [pauseOpen, setPauseOpen] = useState(false)
  const [preparingPause, setPreparingPause] = useState(false)
  const [pauseAction, setPauseAction] = useState<'confirm' | 'continue' | null>(null)
  const timerRef = useRef<number | null>(null)
  const endTimerRef = useRef<number | null>(null)
  const composerRef = useRef<HTMLTextAreaElement>(null)

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
      if (endTimerRef.current) window.clearTimeout(endTimerRef.current)
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
    const nextHome = { ...homeState, hasCurrentSession: true }
    setHomeState(nextHome)
    writeMockCoachHomeState(nextHome)
    setScreen('conversation')
  }

  function scheduleConversation() {
    const nextHome = { ...homeState, hasScheduledSession: true }
    setHomeState(nextHome)
    writeMockCoachHomeState(nextHome)
    setScreen('home')
  }

  function preparePause() {
    if (preparingPause || pauseOpen || replying) return
    if (isEmptyCoachConversation(messages)) {
      const nextHome = { ...homeState, hasCurrentSession: false }
      setHomeState(nextHome)
      writeMockCoachHomeState(nextHome)
      void navigate('/daily', { replace: true })
      return
    }
    setPreparingPause(true)
    endTimerRef.current = window.setTimeout(() => {
      setPreparingPause(false)
      setPauseOpen(true)
      endTimerRef.current = null
    }, 240)
  }

  function confirmPause() {
    setPauseAction('confirm')
    const nextHome = { ...homeState, hasCurrentSession: false }
    setHomeState(nextHome)
    writeMockCoachHomeState(nextHome)
    void navigate('/daily', { replace: true })
  }

  function keepTalking() {
    if (pauseAction) return
    setPauseAction('continue')
    setPauseOpen(false)
    setPauseAction(null)
    window.requestAnimationFrame(() => composerRef.current?.focus())
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
      {screen === 'conversation' ? (
        <CoachConversationHeader
          onDone={preparePause}
          disabled={replying || preparingPause || pauseOpen}
          busy={preparingPause}
        />
      ) : coachChromeVisible ? (
        <CoachHomeHeader />
      ) : null}

      <main className="flex min-h-0 flex-1 flex-col">
        {screen === 'welcome' ? (
          <WelcomeScreen onSchedule={() => setScreen('schedule')} onStart={startConversation} />
        ) : null}
        {screen === 'schedule' ? (
          <ScheduleScreen
            value={schedule}
            onChange={setSchedule}
            onClose={() => setScreen('welcome')}
            onSchedule={scheduleConversation}
          />
        ) : null}
        {screen === 'home' ? (
          <HomeScreen
            schedule={schedule}
            onStart={startConversation}
            onSchedule={() => setScreen('schedule')}
          />
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
            disabled={replying || preparingPause || pauseOpen}
            inputRef={composerRef}
          />
        ) : null}
      </main>

      {coachChromeVisible ? (
        <AppBottomNavigation
          onCoach={() =>
            setScreen(
              homeState.hasCurrentSession
                ? 'conversation'
                : homeState.hasScheduledSession
                  ? 'home'
                  : 'welcome',
            )
          }
        />
      ) : null}
      {pauseOpen ? (
        <CoachPauseDialog
          key="mock-session-end"
          initialPayload={{
            topic_to_explore: 'The cost of choosing — and what I really want',
            takeaway:
              'What’s holding me back isn’t a lack of options. It’s the fear that choosing one means losing everything else.',
          }}
          confirming={pauseAction === 'confirm'}
          continuing={pauseAction === 'continue'}
          onConfirm={confirmPause}
          onKeepTalking={keepTalking}
        />
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
