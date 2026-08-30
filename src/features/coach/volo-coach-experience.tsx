import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarClock, Check, ChevronDown, Pencil, RefreshCw, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { coachApi, dailyApi, type VoloCard, type VoloMessage, type VoloMove } from '@/api/volo'
import { BeautifulPromptComposer } from '@/components/ai/beautiful-prompt-composer'
import { MoveCardSurface } from '@/components/cards/move-card-surface'
import { AppAtmosphere } from '@/components/layout/app-atmosphere'
import { AppBottomNavigation } from '@/components/layout/app-bottom-navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CoachOrb } from '@/features/coach/coach-orb'
import { resolveScheduledSessionDestination, singleFlight } from '@/features/coach/schedule-routing'

const today = () => new Date().toLocaleDateString('en-CA')

export function VoloCoachExperience() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session')
  const home = useQuery({ queryKey: ['volo-coach-home'], queryFn: coachApi.home })

  useEffect(() => {
    if (!sessionId && home.data?.current_session) {
      void navigate(`/chat?session=${home.data.current_session.id}`, { replace: true })
    }
  }, [home.data?.current_session, navigate, sessionId])

  if (home.isPending) return <CoachLoading />
  if (home.isError) return <CoachError onRetry={() => void home.refetch()} />

  return (
    <div className="app-canvas relative isolate flex h-dvh min-h-0 w-full flex-col overflow-hidden text-[var(--coach-ink)]">
      <AppAtmosphere />
      {sessionId ? (
        <SessionView sessionId={sessionId} scheduled={home.data.scheduled_sessions} />
      ) : (
        <CoachStart scheduled={home.data.scheduled_sessions} />
      )}
      <AppBottomNavigation onCoach={() => void navigate('/chat')} />
    </div>
  )
}

function CoachStart({
  scheduled,
}: {
  scheduled: Awaited<ReturnType<typeof coachApi.home>>['scheduled_sessions']
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [scheduling, setScheduling] = useState(false)
  const [topic, setTopic] = useState('')
  const [date, setDate] = useState(today())
  const [time, setTime] = useState('21:00')
  const create = useMutation({
    mutationFn: coachApi.create,
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['volo-coach-home'] })
      if (result.session.status === 'ongoing') void navigate(`/chat?session=${result.session.id}`)
      else setScheduling(false)
    },
  })

  const latest = scheduled[0]
  return (
    <main className="coach-scrollbar-none min-h-0 flex-1 overflow-y-auto px-[15px] pb-8 pt-4">
      {scheduled.length ? (
        <>
          <h1 className="mx-5 mt-1 text-lg font-semibold">Coach Schedule</h1>
          <ScheduledSessionStack sessions={scheduled} className="mt-3" />
          <section className="mt-10 text-center" aria-labelledby="next-session-heading">
            <h2 id="next-session-heading" className="text-lg font-semibold">
              Next Session
            </h2>
            <CoachOrb className="mx-auto mt-6" />
            <h3 className="mt-7 text-wrap-balance text-4xl font-semibold leading-none">
              {latest?.topic || latest?.title}
            </h3>
            <p className="mt-3 text-sm font-medium text-[var(--coach-text-secondary)]">
              {formatAppointment(latest?.scheduled_at)}
            </p>
          </section>
        </>
      ) : (
        <section className="pt-[8vh] text-center">
          <CoachOrb className="mx-auto" />
          <h1 className="mx-auto mt-8 max-w-[21rem] text-wrap-balance font-display text-4xl font-medium leading-none">
            I’m here to help you hear yourself.
          </h1>
          <p className="mx-auto mt-5 max-w-[20rem] text-base leading-6 text-[var(--coach-text-secondary)]">
            Start now, or keep a quieter time for the conversation.
          </p>
        </section>
      )}

      {scheduling ? (
        <form
          className="daily-card mt-8 space-y-4 p-4"
          onSubmit={(event) => {
            event.preventDefault()
            create.mutate({
              startType: 'scheduled',
              topic,
              scheduledAt: new Date(`${date}T${time}:00`).toISOString(),
            })
          }}
        >
          <Input
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="What’s on your mind?"
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
            />
            <Input
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              required
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={create.isPending}>
              Schedule
            </Button>
            <Button type="button" variant="ghost" onClick={() => setScheduling(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-9 space-y-1">
          <Button
            type="button"
            className="h-[50px] w-full rounded-full bg-[var(--coach-surface)] text-[var(--coach-ink)] shadow-[0_6px_18px_rgb(52_51_48/8%)] hover:bg-[var(--coach-surface-glass-strong)]"
            disabled={create.isPending}
            onClick={() =>
              scheduled.length ? setScheduling(true) : create.mutate({ startType: 'instant' })
            }
          >
            {scheduled.length ? 'Schedule a Session' : 'Start now'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-12 w-full rounded-full"
            onClick={() =>
              scheduled.length ? create.mutate({ startType: 'instant' }) : setScheduling(true)
            }
          >
            {scheduled.length ? null : <CalendarClock />}
            {scheduled.length ? 'New Conversation' : 'Find a time'}
          </Button>
        </div>
      )}
    </main>
  )
}

type ScheduledSessionValue = Awaited<ReturnType<typeof coachApi.home>>['scheduled_sessions'][number]

function ScheduledSessionStack({
  sessions,
  className = '',
}: {
  sessions: ScheduledSessionValue[]
  className?: string
}) {
  const [expanded, setExpanded] = useState(false)
  if (!sessions.length) return null
  return (
    <section className={className} aria-label="Scheduled Coach sessions">
      <div className={expanded ? 'space-y-3' : 'relative pb-4'}>
        {expanded ? (
          sessions.map((session) => <ScheduledSession key={session.id} session={session} />)
        ) : (
          <>
            <div className="absolute inset-x-5 bottom-1 h-12 rounded-[22px] bg-white/55" />
            <div className="absolute inset-x-3 bottom-2.5 h-12 rounded-[22px] bg-white/70" />
            <ScheduledSession session={sessions[0]!} />
          </>
        )}
      </div>
      {sessions.length > 1 ? (
        <button
          type="button"
          className="mx-auto flex min-h-11 items-center gap-1 px-4 text-sm font-medium text-[var(--coach-text-secondary)]"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? 'Show latest' : `Show all ${sessions.length}`}
          <ChevronDown className={`size-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      ) : null}
    </section>
  )
}

function ScheduledSession({ session }: { session: ScheduledSessionValue }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const startOnce = useMemo(() => singleFlight(() => coachApi.start(session.id)), [session.id])
  const start = useMutation({
    mutationFn: startOnce,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['volo-coach-home'] })
      void navigate(`/chat?session=${session.id}`)
    },
  })
  const cancel = useMutation({
    mutationFn: () => coachApi.cancel(session.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['volo-coach-home'] }),
  })
  const open = () => {
    if (start.isPending || cancel.isPending) return
    if (resolveScheduledSessionDestination(session.scheduled_at) === 'start') start.mutate()
    else void navigate(`/chat/scheduled/${session.id}`)
  }
  return (
    <article className="relative z-10 mx-1 grid min-h-[116px] w-[calc(100%-8px)] grid-cols-[1fr_48px] overflow-hidden rounded-[22px] bg-[var(--coach-surface-glass)] shadow-[var(--coach-shadow)] backdrop-blur-md">
      <button
        type="button"
        className="min-w-0 px-[18px] py-[18px] text-left focus-visible:outline-offset-[-3px]"
        onClick={open}
        disabled={start.isPending || cancel.isPending}
      >
        <span className="block text-pretty text-lg font-medium leading-6">
          {session.topic || session.title}
        </span>
        <span className="mt-3 block text-xs text-[var(--coach-text-tertiary)]">
          {formatAppointment(session.scheduled_at)}
          {session.schedule_state === 'expired' ? ' · Passed, still available' : ''}
        </span>
      </button>
      <button
        type="button"
        className="grid min-h-11 min-w-11 place-items-center self-start rounded-full text-[var(--coach-text-secondary)] focus-visible:outline-offset-[-3px]"
        aria-label={`Cancel ${session.topic || session.title}`}
        onClick={() => cancel.mutate()}
        disabled={start.isPending || cancel.isPending}
      >
        <X className="size-5" />
      </button>
      {start.isError || cancel.isError ? (
        <p className="col-span-2 px-[18px] pb-3 text-xs text-[var(--danger)]" role="alert">
          Could not update this session. Try again.
        </p>
      ) : null}
    </article>
  )
}

function SessionView({
  sessionId,
  scheduled,
}: {
  sessionId: string
  scheduled: Awaited<ReturnType<typeof coachApi.home>>['scheduled_sessions']
}) {
  const queryClient = useQueryClient()
  const thread = useQuery({
    queryKey: ['volo-session', sessionId],
    queryFn: () => coachApi.get(sessionId),
  })
  const [messages, setMessages] = useState<VoloMessage[] | null>(null)
  const [cards, setCards] = useState<VoloCard[] | null>(null)
  const [streamText, setStreamText] = useState('')
  const [sending, setSending] = useState(false)
  const [failed, setFailed] = useState<{ body: string; clientTempId: string } | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  const displayMessages = useMemo(
    () => messages ?? thread.data?.messages ?? [],
    [messages, thread.data?.messages],
  )
  const displayCards = useMemo(() => cards ?? thread.data?.cards ?? [], [cards, thread.data?.cards])
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [displayMessages, displayCards, streamText])

  async function send(body: string, retryId?: string) {
    const clientTempId = retryId ?? crypto.randomUUID()
    const optimistic: VoloMessage = {
      id: `local-${clientTempId}`,
      role: 'user',
      body,
      sequence: displayMessages.length + 1,
      client_temp_id: clientTempId,
      created_at: new Date().toISOString(),
    }
    if (!retryId)
      setMessages((current) => [...(current ?? thread.data?.messages ?? []), optimistic])
    setFailed(null)
    setSending(true)
    setStreamText('')
    try {
      await coachApi.stream(sessionId, { body, clientTempId }, (event) => {
        if (event.event === 'user_message_stored') {
          const stored = event.data as { message_id: string; sequence: number }
          setMessages((current) =>
            (current ?? thread.data?.messages ?? []).map((message) =>
              message.id === `local-${clientTempId}`
                ? { ...message, id: stored.message_id, sequence: stored.sequence }
                : message,
            ),
          )
        }
        if (event.event === 'assistant_delta') {
          setStreamText((current) => current + String((event.data as { text?: string }).text ?? ''))
        }
        if (event.event === 'assistant_message_done') {
          setMessages((current) => [
            ...(current ?? thread.data?.messages ?? []),
            event.data as VoloMessage,
          ])
          setStreamText('')
        }
        if (event.event === 'card_created')
          setCards((current) => [...(current ?? thread.data?.cards ?? []), event.data as VoloCard])
        if (event.event === 'error')
          throw new Error(String((event.data as { message?: string }).message))
      })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['volo-session', sessionId] }),
        queryClient.invalidateQueries({ queryKey: ['volo-coach-home'] }),
      ])
    } catch {
      setFailed({ body, clientTempId })
    } finally {
      setSending(false)
      setStreamText('')
    }
  }

  if (thread.isPending) return <CoachLoading />
  if (thread.isError || !thread.data) return <CoachError onRetry={() => void thread.refetch()} />
  const visibleCards = displayCards.filter((card) => card.status === 'pending')
  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <header className="safe-top grid h-16 shrink-0 grid-cols-[2.75rem_1fr_2.75rem] items-center px-3">
        <span />
        <p className="truncate text-center text-base font-semibold">
          {thread.data.session.title || 'Coach'}
        </p>
        <span />
      </header>
      <div className="coach-scrollbar-none min-h-0 flex-1 overflow-y-auto px-5 pb-6">
        <ScheduledSessionStack
          sessions={scheduled.filter((session) => session.id !== sessionId)}
          className="mb-6 pt-1"
        />
        <div className="space-y-6" aria-live="polite">
          {displayMessages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {streamText ? (
            <p className="whitespace-pre-wrap pr-3 text-base font-medium leading-6">{streamText}</p>
          ) : null}
          {visibleCards.map((card) => (
            <CoachCard key={card.id} card={card} sessionId={sessionId} />
          ))}
          {failed ? (
            <button
              className="flex min-h-touch items-center gap-2 text-sm text-[var(--coach-accent)]"
              onClick={() => void send(failed.body, failed.clientTempId)}
            >
              <RefreshCw className="size-4" /> Message failed. Retry
            </button>
          ) : null}
          {!sending &&
          thread.data.session.status === 'ongoing' &&
          !visibleCards.some(
            (card) => card.type === 'session_end' || card.type === 'session_end_offer',
          ) ? (
            <EndConversation sessionId={sessionId} />
          ) : null}
          <div ref={endRef} />
        </div>
      </div>
      {thread.data.session.status === 'ongoing' ? (
        <BeautifulPromptComposer
          placeholder="Say what feels present…"
          showInspirations
          onSend={(body) => void send(body)}
        />
      ) : (
        <p className="safe-bottom px-5 py-5 text-center text-sm text-[var(--coach-text-secondary)]">
          This conversation is complete.
        </p>
      )}
    </main>
  )
}

function MessageBubble({ message }: { message: VoloMessage }) {
  return message.role === 'user' ? (
    <div className="flex justify-end pl-12">
      <p className="max-w-[18.5rem] text-pretty rounded-[22px] bg-[var(--coach-user-bubble)] px-4 py-3 text-base font-medium leading-5 text-[var(--coach-text-warm)]">
        {message.body}
      </p>
    </div>
  ) : (
    <p className="text-pretty whitespace-pre-wrap pr-3 text-base font-medium leading-6">
      {message.body}
    </p>
  )
}

function CoachCard({ card, sessionId }: { card: VoloCard; sessionId: string }) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(card.payload.description ?? '')
  const [topicToExplore, setTopicToExplore] = useState(card.payload.topic_to_explore ?? '')
  const [takeaway, setTakeaway] = useState(card.payload.takeaway ?? '')
  const [move, setMove] = useState<VoloMove | null>(null)
  const confirm = useMutation({
    mutationFn: () =>
      coachApi.confirmCard(
        card.id,
        card.type === 'session_end'
          ? { topic_to_explore: topicToExplore, takeaway }
          : { description: value },
      ),
    onSuccess: async (result) => {
      setMove(result.move)
      await queryClient.invalidateQueries({ queryKey: ['volo-session', sessionId] })
    },
  })
  const reject = useMutation({
    mutationFn: () => coachApi.rejectCard(card.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['volo-session', sessionId] }),
  })
  const acceptEnd = useMutation({
    mutationFn: () => coachApi.acceptEndOffer(card.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['volo-session', sessionId] }),
  })

  if (move) return <ScheduleEditor move={move} />
  if (card.type === 'session_end_offer') {
    return (
      <article className="rounded-[22px] bg-[var(--coach-surface-glass-strong)] p-4 shadow-[var(--coach-shadow)]">
        <p className="text-base font-medium">This feels like a useful place to pause.</p>
        <p className="mt-2 text-sm leading-5 text-[var(--coach-text-secondary)]">
          Pause here to shape an editable topic and takeaway, or keep exploring.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            className="rounded-full bg-[var(--coach-accent)] text-white hover:bg-[var(--coach-accent)]/90"
            onClick={() => acceptEnd.mutate()}
            disabled={acceptEnd.isPending}
          >
            Pause
          </Button>
          <Button
            className="rounded-full"
            variant="ghost"
            onClick={() => reject.mutate()}
            disabled={reject.isPending}
          >
            Continue
          </Button>
        </div>
        {acceptEnd.isError || reject.isError ? (
          <p className="mt-3 text-sm text-[var(--danger)]" role="alert">
            The choice could not be saved. Try again.
          </p>
        ) : null}
      </article>
    )
  }
  if (card.type === 'session_end') {
    return (
      <article className="rounded-[22px] bg-[var(--coach-surface-glass-strong)] px-[14px] py-4 shadow-[var(--coach-shadow)]">
        <label className="block">
          <span className="text-[11px] font-medium text-[var(--coach-text-tertiary)]">
            TOPIC TO EXPLORE
          </span>
          <textarea
            className="mt-2 min-h-[54px] w-full resize-none border-0 border-b border-[var(--coach-border-strong)] bg-transparent px-0 pb-3 text-base leading-6 outline-none"
            maxLength={120}
            value={topicToExplore}
            onChange={(event) => setTopicToExplore(event.target.value)}
          />
        </label>
        <label className="mt-3 block">
          <span className="text-[11px] font-medium text-[var(--coach-text-tertiary)]">
            TAKE AWAY
          </span>
          <textarea
            className="mt-2 min-h-[70px] w-full resize-y bg-transparent px-0 text-base leading-5 outline-none"
            maxLength={500}
            value={takeaway}
            onChange={(event) => setTakeaway(event.target.value)}
          />
        </label>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            className="rounded-full bg-[var(--coach-accent)] text-white hover:bg-[var(--coach-accent)]/90"
            onClick={() => confirm.mutate()}
            disabled={!topicToExplore.trim() || !takeaway.trim() || confirm.isPending}
          >
            <Check /> Confirm
          </Button>
          <Button
            className="rounded-full"
            variant="ghost"
            onClick={() => reject.mutate()}
            disabled={reject.isPending}
          >
            Continue
          </Button>
        </div>
        {confirm.isError || reject.isError ? (
          <p className="mt-3 text-sm text-[var(--danger)]" role="alert">
            The pause card could not be saved. Try again.
          </p>
        ) : null}
      </article>
    )
  }
  return (
    <div>
      <p className="mb-3 text-base font-medium">Here’s a Move that reflects what matters:</p>
      <MoveCardSurface
        schedule="Optional check plan"
        source="From this Coach conversation"
        dueLabel=""
      >
        {editing ? (
          <textarea
            className="w-full resize-none rounded-lg bg-[var(--coach-surface-muted)] p-3"
            rows={3}
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        ) : (
          value
        )}
      </MoveCardSurface>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={() => confirm.mutate()} disabled={!value.trim() || confirm.isPending}>
          Add Move
        </Button>
        <Button variant="ghost" onClick={() => setEditing((current) => !current)}>
          <Pencil /> Edit
        </Button>
        <Button variant="ghost" onClick={() => reject.mutate()}>
          Skip
        </Button>
      </div>
    </div>
  )
}

function ScheduleEditor({ move }: { move: VoloMove }) {
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [time, setTime] = useState('21:00')
  const [saved, setSaved] = useState(false)
  const schedule = useMutation({
    mutationFn: () =>
      dailyApi.scheduleMove(move.id, {
        rule:
          frequency === 'weekly'
            ? { frequency: 'weekly', weekdays: [new Date().getDay() || 7] }
            : frequency === 'monthly'
              ? { frequency: 'monthly', day: Math.min(new Date().getDate(), 28) }
              : { frequency: 'daily' },
        startLocalDate: today(),
        times: [time],
      }),
    onSuccess: () => setSaved(true),
  })
  if (saved)
    return (
      <p className="flex items-center gap-2 text-sm text-[var(--coach-success)]">
        <Check className="size-4" /> Move and check plan saved.
      </p>
    )
  return (
    <div className="rounded-xl bg-[var(--coach-surface)] p-4">
      <p className="font-medium">Move saved. Add an optional check plan?</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <select
          className="h-11 rounded-lg bg-[var(--coach-surface-muted)] px-3"
          value={frequency}
          onChange={(event) => setFrequency(event.target.value as typeof frequency)}
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
        <Input type="time" value={time} onChange={(event) => setTime(event.target.value)} />
      </div>
      <Button className="mt-3" onClick={() => schedule.mutate()} disabled={schedule.isPending}>
        Save check plan
      </Button>
    </div>
  )
}

function EndConversation({ sessionId }: { sessionId: string }) {
  const queryClient = useQueryClient()
  const end = useMutation({
    mutationFn: () => coachApi.endSuggestion(sessionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['volo-session', sessionId] }),
  })
  return (
    <div className="pt-2 text-center">
      <button
        className="min-h-touch rounded-full px-5 text-sm font-medium text-[var(--coach-text-secondary)]"
        onClick={() => end.mutate()}
        disabled={end.isPending}
      >
        {end.isPending ? 'Finding the words…' : 'Pause and reflect'}
      </button>
    </div>
  )
}

function CoachLoading() {
  return (
    <div className="app-canvas grid min-h-0 flex-1 place-items-center text-sm text-[var(--coach-text-secondary)]">
      Listening for your place…
    </div>
  )
}

function CoachError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="app-canvas grid min-h-0 flex-1 place-items-center px-8 text-center">
      <div>
        <p className="font-medium">Coach could not open.</p>
        <Button className="mt-4" onClick={onRetry}>
          <RefreshCw /> Retry
        </Button>
      </div>
    </div>
  )
}

function formatAppointment(value: string | null | undefined) {
  if (!value) return 'Time not set'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}
