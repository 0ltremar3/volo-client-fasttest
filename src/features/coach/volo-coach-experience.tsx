import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarClock, Check, ChevronDown, Pencil, RefreshCw, X } from 'lucide-react'
import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import {
  getGetV2DailyQueryKey,
  getGetV2MovesQueryKey,
  usePostV2CoachCardsIdConfirm,
  usePostV2CoachCardsIdReject,
} from '@/api/generated/endpoints'
import { VoloCoachStreamError } from '@/api/sse'
import { authApi, coachApi, dailyApi, type VoloCard, type VoloMessage } from '@/api/volo'
import { BeautifulPromptComposer } from '@/components/ai/beautiful-prompt-composer'
import { StreamingText } from '@/components/ai/beautiful-ui/streaming-text'
import { MoveCardSurface } from '@/components/cards/move-card-surface'
import { AppAtmosphere } from '@/components/layout/app-atmosphere'
import { AppBottomNavigation } from '@/components/layout/app-bottom-navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CoachOrb } from '@/features/coach/coach-orb'
import {
  CoachConversationHeader,
  CoachFocusCard,
  CoachPauseDialog,
  type CoachPausePayload,
} from '@/features/coach/coach-conversation-ui'
import {
  canRequestCoachEnd,
  findPendingSessionEnd,
} from '@/features/coach/coach-conversation-state'
import {
  buildCoachTimeline,
  coachTurnReducer,
  createCoachTurnState,
} from '@/features/coach/coach-turn-state'
import { resolveScheduledSessionDestination, singleFlight } from '@/features/coach/schedule-routing'

const today = () => new Date().toLocaleDateString('en-CA')

export function VoloCoachExperience() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session')
  const home = useQuery({ queryKey: ['volo-coach-home'], queryFn: coachApi.home })
  const profile = useQuery({ queryKey: ['me'], queryFn: authApi.me })

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
        <SessionView
          key={sessionId}
          sessionId={sessionId}
          scheduled={home.data.scheduled_sessions}
        />
      ) : (
        <CoachStart
          scheduled={home.data.scheduled_sessions}
          displayName={profile.data?.profile.display_name ?? 'there'}
        />
      )}
      <AppBottomNavigation onCoach={() => void navigate('/chat')} />
    </div>
  )
}

function CoachStart({
  scheduled,
  displayName,
}: {
  scheduled: Awaited<ReturnType<typeof coachApi.home>>['scheduled_sessions']
  displayName: string
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
    <main className="coach-scrollbar-none min-h-0 flex-1 overflow-y-auto px-[15px] pb-8">
      {scheduled.length ? (
        <>
          <header className="safe-top flex h-[104px] items-end px-[21px] pb-[10px]">
            <h1 className="text-lg font-semibold">Coach Schedule</h1>
          </header>
          <ScheduledSessionStack sessions={scheduled} />
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
        <section className="pt-[200px] text-center">
          <CoachOrb className="mx-auto" />
          <h1 className="mx-auto mt-[35px] max-w-[21rem] text-wrap-balance font-display text-4xl font-medium leading-none">
            Hello, {displayName}.
          </h1>
          <p className="mx-auto mt-2 max-w-[20rem] text-[26px] font-semibold leading-8">
            I’m here to help you hear yourself.
          </p>
          <p className="mx-auto mt-5 max-w-[20rem] text-base leading-[18px] text-[var(--coach-text-secondary)]">
            Make a little space for this conversation.
            <br />
            20–40 minutes is usually enough.
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
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const thread = useQuery({
    queryKey: ['volo-session', sessionId],
    queryFn: () => coachApi.get(sessionId),
  })
  const [turnState, dispatch] = useReducer(coachTurnReducer, undefined, () =>
    createCoachTurnState(),
  )
  const streamControllerRef = useRef<AbortController | null>(null)
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const timeline = useMemo(() => buildCoachTimeline(turnState), [turnState])
  const sending = turnState.active !== null
  const conversationRef = useRef<HTMLDivElement>(null)
  const adjustmentMode = Boolean(thread.data?.session.related_move_id)
  const pauseCard = adjustmentMode ? null : findPendingSessionEnd(turnState.cards)

  useEffect(() => {
    const conversation = conversationRef.current
    conversation?.scrollTo({ top: conversation.scrollHeight, behavior: 'smooth' })
  }, [timeline])

  useEffect(() => {
    if (thread.data) {
      dispatch({ type: 'hydrate', messages: thread.data.messages, cards: thread.data.cards })
    }
  }, [thread.data])

  useEffect(
    () => () => {
      streamControllerRef.current?.abort()
    },
    [],
  )

  const prepareEnd = useMutation({
    mutationFn: () => coachApi.endSuggestion(sessionId),
    onSuccess: async (result) => {
      dispatch({ type: 'card_changed', card: result.card })
      await queryClient.invalidateQueries({ queryKey: ['volo-session', sessionId] })
    },
  })

  const confirmEnd = useMutation({
    mutationFn: (payload: CoachPausePayload) => {
      if (!pauseCard) throw new Error('Pause card is no longer available')
      return coachApi.confirmCard(pauseCard.id, payload)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['volo-session', sessionId] }),
        queryClient.invalidateQueries({ queryKey: ['volo-coach-home'] }),
        queryClient.invalidateQueries({ queryKey: ['volo-daily'] }),
        queryClient.invalidateQueries({ queryKey: ['volo-review'] }),
        queryClient.invalidateQueries({ queryKey: ['volo-review-activity'] }),
      ])
      void navigate('/daily', { replace: true })
    },
  })

  const continueEnd = useMutation({
    mutationFn: () => {
      if (!pauseCard) throw new Error('Pause card is no longer available')
      return coachApi.rejectCard(pauseCard.id)
    },
    onSuccess: async (result) => {
      updateCard(result.card)
      await queryClient.invalidateQueries({ queryKey: ['volo-session', sessionId] })
      window.requestAnimationFrame(() => composerRef.current?.focus())
    },
  })

  function updateCard(nextCard: VoloCard) {
    dispatch({ type: 'card_changed', card: nextCard })
  }

  async function send(body: string, retryId?: string) {
    const clientTempId = retryId ?? crypto.randomUUID()
    const controller = new AbortController()
    streamControllerRef.current?.abort()
    streamControllerRef.current = controller
    dispatch({
      type: 'start',
      body,
      clientTempId,
      createdAt: new Date().toISOString(),
    })
    try {
      await coachApi.stream(
        sessionId,
        { body, clientTempId },
        (event) => dispatch({ type: 'event', event }),
        controller.signal,
      )
      dispatch({ type: 'success' })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['volo-session', sessionId] }),
        queryClient.invalidateQueries({ queryKey: ['volo-coach-home'] }),
      ])
    } catch (error) {
      if (controller.signal.aborted) {
        dispatch({ type: 'cancel' })
        return
      }
      dispatch({
        type: 'fail',
        code: error instanceof VoloCoachStreamError ? error.code : 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Message failed',
      })
    } finally {
      if (streamControllerRef.current === controller) streamControllerRef.current = null
    }
  }

  if (thread.isPending) return <CoachLoading />
  if (thread.isError || !thread.data) return <CoachError onRetry={() => void thread.refetch()} />
  const canPrepareEnd = canRequestCoachEnd({
    sessionStatus: thread.data.session.status,
    cards: turnState.cards,
    sending,
    preparing: prepareEnd.isPending,
  })
  const pauseError = confirmEnd.isError
    ? 'This pause could not be saved. Your words are still here.'
    : continueEnd.isError
      ? 'The conversation could not be resumed. Try again.'
      : null
  return (
    <>
      <main className="flex min-h-0 flex-1 flex-col">
        <CoachConversationHeader
          onDone={() => prepareEnd.mutate()}
          disabled={!canPrepareEnd}
          busy={prepareEnd.isPending}
          showDone={!adjustmentMode}
        />
        <div
          ref={conversationRef}
          className="coach-scrollbar-none min-h-0 flex-1 overflow-y-auto px-[15px] pb-6 pt-2"
        >
          <CoachFocusCard
            title={thread.data.session.topic || thread.data.session.title || 'What feels present'}
          />
          <div className="mt-6">
            <ScheduledSessionStack
              sessions={scheduled.filter((session) => session.id !== sessionId)}
              className="mb-6"
            />
            <div className="space-y-6 px-[5px]">
              {timeline.map((item) => {
                if (item.kind === 'message') {
                  return <MessageBubble key={item.id} message={item.message} />
                }
                if (item.kind === 'draft') {
                  return (
                    <StreamingText
                      key={item.id}
                      text={item.draft.text}
                      status={item.draft.status}
                      onCopy={() => void navigator.clipboard.writeText(item.draft.text)}
                      onRetry={
                        turnState.failed
                          ? () => void send(turnState.failed!.body, turnState.failed!.clientTempId)
                          : undefined
                      }
                    />
                  )
                }
                const card = item.card
                const visible =
                  card.status === 'pending' &&
                  (adjustmentMode ? card.type === 'move_revision' : card.type !== 'session_end')
                return visible ? (
                  <CoachCard
                    key={item.id}
                    card={card}
                    sessionId={sessionId}
                    adjustmentMode={adjustmentMode}
                    relatedLocalDate={thread.data.session.related_local_date}
                    onCardChanged={updateCard}
                  />
                ) : null
              })}
              {turnState.failed && !turnState.draft ? (
                <StreamingText
                  text=""
                  status="failed"
                  onCopy={() => undefined}
                  onRetry={() => void send(turnState.failed!.body, turnState.failed!.clientTempId)}
                />
              ) : null}
              {prepareEnd.isError ? (
                <p className="text-center text-sm text-[var(--danger)]" role="alert">
                  Couldn’t prepare your pause. Try Done again.
                </p>
              ) : null}
            </div>
          </div>
        </div>
        {thread.data.session.status === 'ongoing' ? (
          <BeautifulPromptComposer
            placeholder="Say what feels present…"
            showInspirations
            disabled={sending || prepareEnd.isPending || Boolean(pauseCard)}
            inputRef={composerRef}
            onSend={(body) => void send(body)}
          />
        ) : (
          <p className="safe-bottom px-5 py-5 text-center text-sm text-[var(--coach-text-secondary)]">
            This conversation is complete.
          </p>
        )}
      </main>
      {pauseCard ? (
        <CoachPauseDialog
          key={pauseCard.id}
          initialPayload={{
            topic_to_explore: pauseCard.payload.topic_to_explore ?? '',
            takeaway: pauseCard.payload.takeaway ?? '',
          }}
          confirming={confirmEnd.isPending}
          continuing={continueEnd.isPending}
          error={pauseError}
          onConfirm={(payload) => confirmEnd.mutate(payload)}
          onKeepTalking={() => continueEnd.mutate()}
        />
      ) : null}
    </>
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
    <StreamingText
      text={message.body}
      status="complete"
      onCopy={() => void navigator.clipboard.writeText(message.body)}
    />
  )
}

function CoachCard({
  card,
  sessionId,
  adjustmentMode,
  relatedLocalDate,
  onCardChanged,
}: {
  card: VoloCard
  sessionId: string
  adjustmentMode: boolean
  relatedLocalDate: string | null
  onCardChanged: (card: VoloCard) => void
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(card.payload.description ?? '')
  const [move, setMove] = useState<{ id: string } | null>(null)
  const confirm = usePostV2CoachCardsIdConfirm({
    mutation: {
      onSuccess: async (result) => {
        onCardChanged(result.card)
        if (card.type === 'move_revision') {
          const returnDate = result.session.related_local_date ?? relatedLocalDate ?? today()
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['volo-session', sessionId] }),
            queryClient.invalidateQueries({ queryKey: ['volo-coach-home'] }),
            queryClient.invalidateQueries({ queryKey: getGetV2MovesQueryKey() }),
            queryClient.invalidateQueries({
              queryKey: getGetV2DailyQueryKey({ date: returnDate }),
            }),
          ])
          void navigate(`/daily?date=${encodeURIComponent(returnDate)}`, { replace: true })
          return
        }
        setMove(result.move)
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['volo-session', sessionId] }),
          queryClient.invalidateQueries({ queryKey: getGetV2MovesQueryKey() }),
        ])
      },
    },
  })
  const reject = usePostV2CoachCardsIdReject({
    mutation: {
      onSuccess: async (result) => {
        onCardChanged(result.card)
        await queryClient.invalidateQueries({ queryKey: ['volo-session', sessionId] })
      },
    },
  })
  const acceptEnd = useMutation({
    mutationFn: () => coachApi.acceptEndOffer(card.id),
    onSuccess: async (result) => {
      onCardChanged({ ...card, status: 'rejected' })
      onCardChanged(result.card)
      await queryClient.invalidateQueries({ queryKey: ['volo-session', sessionId] })
    },
  })

  if (move && !adjustmentMode) return <ScheduleEditor move={move} />
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
            onClick={() => reject.mutate({ id: card.id })}
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
  if (card.type === 'session_end') return null
  return (
    <div>
      <p className="mb-3 text-base font-medium">Here’s a Move that reflects what matters:</p>
      <MoveCardSurface
        schedule={adjustmentMode ? 'Schedule unchanged' : 'Optional check plan'}
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
        <Button
          onClick={() =>
            confirm.mutate({
              id: card.id,
              data: { final_payload: { description: value.trim() } },
            })
          }
          disabled={!value.trim() || confirm.isPending}
        >
          {card.type === 'move_revision' ? 'Confirm Adjustment' : 'Add Move'}
        </Button>
        <Button variant="ghost" onClick={() => setEditing((current) => !current)}>
          <Pencil /> Edit
        </Button>
        <Button variant="ghost" onClick={() => reject.mutate({ id: card.id })}>
          {card.type === 'move_revision' ? 'Keep talking' : 'Skip'}
        </Button>
      </div>
      {confirm.isError || reject.isError ? (
        <p className="mt-3 text-sm text-[var(--danger)]" role="alert">
          {card.type === 'move_revision'
            ? 'This adjustment could not be saved. Try again.'
            : 'This Move could not be saved. Try again.'}
        </p>
      ) : null}
    </div>
  )
}

function ScheduleEditor({ move }: { move: { id: string } }) {
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
