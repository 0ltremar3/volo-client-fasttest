import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarClock, Check, History, Pencil, RefreshCw, X } from 'lucide-react'
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

const today = () => new Date().toLocaleDateString('en-CA')

export function VoloCoachExperience() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session')
  const home = useQuery({ queryKey: ['volo-coach-home'], queryFn: coachApi.home })
  const history = useQuery({ queryKey: ['volo-coach-history'], queryFn: coachApi.list })
  const [historyOpen, setHistoryOpen] = useState(false)

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
      <AppBottomNavigation
        onCoach={() => void navigate('/chat')}
        onHistory={() => setHistoryOpen(true)}
      />
      <HistoryDialog
        open={historyOpen}
        sessions={history.data?.items ?? []}
        onClose={() => setHistoryOpen(false)}
        onSelect={(id) => {
          setHistoryOpen(false)
          void navigate(`/chat?session=${id}`)
        }}
      />
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

  return (
    <main className="coach-scrollbar-none min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-[10vh]">
      <CoachOrb className="mx-auto" />
      <div className="mt-8 text-center">
        <h1 className="font-display text-4xl font-medium leading-none">
          I’m here to help you hear yourself.
        </h1>
        <p className="mx-auto mt-5 max-w-[20rem] text-base leading-6 text-[var(--coach-text-secondary)]">
          Start now, or keep a quieter time for the conversation.
        </p>
      </div>

      {scheduled.length ? (
        <section className="mt-10 space-y-3" aria-labelledby="scheduled-heading">
          <h2 id="scheduled-heading" className="text-sm font-semibold">
            Scheduled conversations
          </h2>
          {scheduled.map((session) => (
            <ScheduledSession key={session.id} session={session} />
          ))}
        </section>
      ) : null}

      {scheduling ? (
        <form
          className="mt-10 space-y-4 rounded-xl bg-[var(--coach-surface)] p-4"
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
        <div className="mt-10 space-y-2">
          <Button
            type="button"
            className="h-[50px] w-full rounded-full"
            disabled={create.isPending}
            onClick={() => create.mutate({ startType: 'instant' })}
          >
            Start now
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-12 w-full rounded-full"
            onClick={() => setScheduling(true)}
          >
            <CalendarClock /> Find a time
          </Button>
        </div>
      )}
    </main>
  )
}

function ScheduledSession({
  session,
}: {
  session: Awaited<ReturnType<typeof coachApi.home>>['scheduled_sessions'][number]
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const start = useMutation({
    mutationFn: () => coachApi.start(session.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['volo-coach-home'] })
      void navigate(`/chat?session=${session.id}`)
    },
  })
  const cancel = useMutation({
    mutationFn: () => coachApi.cancel(session.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['volo-coach-home'] }),
  })
  return (
    <article className="rounded-xl bg-[var(--coach-surface)] px-4 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate font-medium">{session.topic || session.title}</p>
          <p className="mt-1 text-xs text-[var(--coach-text-tertiary)]">
            {session.scheduled_at
              ? new Date(session.scheduled_at).toLocaleString()
              : 'Time not set'}
            {session.schedule_state === 'expired' ? ' · passed, still available' : ''}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button onClick={() => start.mutate()} disabled={start.isPending}>
            Start
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Cancel scheduled conversation"
            onClick={() => cancel.mutate()}
          >
            <X />
          </Button>
        </div>
      </div>
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
        {scheduled.length ? (
          <div className="mb-6 space-y-2">
            {scheduled.slice(0, 2).map((session) => (
              <ScheduledSession key={session.id} session={session} />
            ))}
          </div>
        ) : null}
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
          {!sending && thread.data.session.status === 'ongoing' ? (
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
  const [value, setValue] = useState(
    card.type === 'session_end' ? (card.payload.title ?? '') : (card.payload.description ?? ''),
  )
  const [move, setMove] = useState<VoloMove | null>(null)
  const confirm = useMutation({
    mutationFn: () =>
      coachApi.confirmCard(
        card.id,
        card.type === 'session_end' ? { title: value } : { description: value },
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

  if (move) return <ScheduleEditor move={move} />
  if (card.type === 'session_end') {
    return (
      <article className="rounded-xl bg-[var(--coach-surface)] p-4">
        <p className="text-xs font-semibold text-[var(--coach-text-tertiary)]">
          A GOOD PLACE TO PAUSE
        </p>
        {editing ? (
          <Input
            className="mt-3"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        ) : (
          <p className="mt-3 text-lg font-semibold">{value}</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => confirm.mutate()} disabled={!value.trim() || confirm.isPending}>
            <Check /> Confirm title
          </Button>
          <Button variant="ghost" onClick={() => setEditing((current) => !current)}>
            <Pencil /> Edit
          </Button>
          <Button variant="ghost" onClick={() => reject.mutate()}>
            Continue
          </Button>
        </div>
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

function HistoryDialog({
  open,
  sessions,
  onClose,
  onSelect,
}: {
  open: boolean
  sessions: Awaited<ReturnType<typeof coachApi.list>>['items']
  onClose: () => void
  onSelect: (id: string) => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (open && !ref.current?.open) ref.current?.showModal()
    if (!open && ref.current?.open) ref.current.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      className="coach-dialog m-0 h-dvh max-h-none w-[min(22.5rem,calc(100vw-1rem))] max-w-none bg-[var(--coach-surface)] p-0"
      onClose={onClose}
    >
      <div className="safe-top safe-bottom flex h-full flex-col">
        <header className="flex h-16 items-center justify-between border-b border-[var(--coach-border)] px-4">
          <h2 className="font-semibold">Conversations</h2>
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close history">
            <X />
          </Button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {sessions.length ? (
            sessions.map((session) => (
              <button
                key={session.id}
                className="mb-1 flex min-h-touch w-full items-start gap-3 rounded-lg px-3 py-3 text-left hover:bg-[var(--coach-surface-muted)]"
                onClick={() => onSelect(session.id)}
              >
                <History className="mt-0.5 size-4 shrink-0" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{session.title}</span>
                  <span className="mt-1 block text-xs text-[var(--coach-text-tertiary)]">
                    {session.status} · {new Date(session.last_active_at).toLocaleString()}
                  </span>
                </span>
              </button>
            ))
          ) : (
            <p className="p-4 text-sm text-[var(--coach-text-secondary)]">
              Your Coach conversations will gather here.
            </p>
          )}
        </div>
      </div>
    </dialog>
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
