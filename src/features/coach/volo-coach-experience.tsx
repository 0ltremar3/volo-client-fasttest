import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarClock, Check, ChevronDown, Pencil, RefreshCw, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'

import {
  getGetV2DailyQueryKey,
  getGetV2MovesQueryKey,
  useGetV2Moves,
  usePostV2CoachCardsIdConfirm,
  usePostV2CoachCardsIdReject,
} from '@/api/generated/endpoints'
import { VoloCoachStreamError } from '@/api/sse'
import { coachApi, voiceApi, type MoveSchedule, type VoloCard, type VoloMessage } from '@/api/volo'
import { BeautifulPromptComposer } from '@/components/ai/beautiful-prompt-composer'
import { StreamingText } from '@/components/ai/beautiful-ui/streaming-text'
import { MoveCardSurface } from '@/components/cards/move-card-surface'
import { AppAtmosphere } from '@/components/layout/app-atmosphere'
import { AppBottomNavigation } from '@/components/layout/app-bottom-navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CoachOrb } from '@/features/coach/coach-orb'
import {
  CoachComposeFab,
  CoachNewSessionPanel,
  CoachNextSessionHero,
} from '@/features/coach/coach-landing-ui'
import {
  CoachConversationHeader,
  CoachFocusCard,
  CoachPauseDialog,
  MoveScheduleFields,
  type CoachPausePayload,
} from '@/features/coach/coach-conversation-ui'
import {
  buildMoveScheduleRule,
  formatCoachAppointment,
  resolveMoveScheduleDraft,
  type MoveScheduleFrequency,
} from '@/features/coach/coach-model'
import {
  canRequestCoachEnd,
  findPendingSessionEnd,
  isEmptyCoachConversation,
  resolveCoachStartView,
  type CoachStartView,
} from '@/features/coach/coach-conversation-state'
import {
  buildCoachTimeline,
  coachTurnReducer,
  createCoachTurnState,
  getCoachCardPresentation,
} from '@/features/coach/coach-turn-state'
import {
  resolveScheduledSessionDestination,
  singleFlight,
  sortScheduledSessionsByTime,
} from '@/features/coach/schedule-routing'
import { VoiceOverlay } from '@/features/coach/voice-overlay'
import { canStartVoice, retryVoiceSession } from '@/features/coach/voice-state'
import { currentAppLocale } from '@/i18n'

const today = () => new Date().toLocaleDateString('en-CA')

function formatMoveScheduleSummary(
  draft: { frequency: MoveScheduleFrequency; time: string },
  labels: Record<MoveScheduleFrequency, string>,
) {
  return `${labels[draft.frequency]} · ${draft.time}`
}

async function copyText(text: string) {
  const activeElement =
    document.activeElement instanceof HTMLElement ? document.activeElement : null
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.append(textarea)
  textarea.select()
  let selectionCopied: boolean
  try {
    selectionCopied = document.execCommand('copy')
  } catch {
    selectionCopied = false
  } finally {
    textarea.remove()
    activeElement?.focus({ preventScroll: true })
  }

  let clipboardCopied = false
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text)
      clipboardCopied = true
    }
  } catch {
    // The selection path above covers browsers where Clipboard API access is unavailable.
  }

  if (!selectionCopied && !clipboardCopied) throw new Error('Copy failed')
}

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

  const scheduled = sortScheduledSessionsByTime(home.data.scheduled_sessions)

  return (
    <div className="app-canvas relative isolate flex h-dvh min-h-0 w-full flex-col overflow-hidden text-[var(--coach-ink)]">
      <AppAtmosphere />
      {sessionId ? (
        <>
          <SessionView key={sessionId} sessionId={sessionId} />
          <AppBottomNavigation onCoach={() => void navigate('/chat')} />
        </>
      ) : (
        <CoachStart scheduled={scheduled} />
      )}
    </div>
  )
}

function CoachStart({
  scheduled,
}: {
  scheduled: Awaited<ReturnType<typeof coachApi.home>>['scheduled_sessions']
}) {
  const { t, i18n } = useTranslation('coach')
  const locale = currentAppLocale(i18n.language)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [entry, setEntry] = useState<CoachStartView>(scheduled.length ? 'home' : 'new')
  const [topic, setTopic] = useState('')
  const [date, setDate] = useState(today())
  const [time, setTime] = useState('21:00')
  const create = useMutation({
    mutationFn: coachApi.create,
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['volo-coach-home'] })
      if (result.session.status === 'ongoing') void navigate(`/chat?session=${result.session.id}`)
      else setEntry('home')
    },
  })

  const next = scheduled[0]
  const view = resolveCoachStartView(entry, scheduled.length)
  if (view === 'new') {
    return (
      <CoachNewSessionPanel
        onFindTime={() => {
          create.reset()
          setEntry('schedule')
        }}
        onStartNow={() => create.mutate({ startType: 'instant' })}
        onClose={scheduled.length ? () => setEntry('home') : undefined}
        startPending={create.isPending}
        startError={create.isError ? t('sessionStartError') : null}
      />
    )
  }

  if (view === 'schedule') {
    return (
      <form
        className="flex min-h-0 flex-1 flex-col px-6 pb-10"
        onSubmit={(event) => {
          event.preventDefault()
          create.mutate({
            startType: 'scheduled',
            topic,
            scheduledAt: new Date(`${date}T${time}:00`).toISOString(),
          })
        }}
      >
        <div className="relative flex h-12 items-center justify-center">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute left-[-0.5rem]"
            onClick={() => {
              create.reset()
              setEntry('new')
            }}
            aria-label={t('closeScheduling')}
          >
            <X />
          </Button>
          <h1 className="text-base font-semibold">{t('findATime')}</h1>
        </div>
        <CoachOrb className="mx-auto mt-2" />
        <p className="mx-auto mt-4 max-w-[16rem] text-center text-base leading-5 text-[var(--coach-ink)]">
          {t('chooseUnrushed')}
        </p>
        <div className="mt-9 space-y-4">
          <Input
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder={t('placeholderMind')}
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
        </div>
        <Button
          type="submit"
          disabled={create.isPending}
          className="mt-auto h-[50px] rounded-full bg-[var(--coach-surface)] text-base text-[var(--coach-ink)] shadow-[var(--coach-shadow)] hover:bg-[var(--coach-surface-glass-strong)]"
        >
          {t('schedule')}
        </Button>
        {create.isError ? (
          <p className="mt-3 text-center text-sm text-[var(--danger)]" role="alert">
            {t('sessionStartError')}
          </p>
        ) : null}
      </form>
    )
  }

  return (
    <>
      <main className="relative min-h-0 flex-1">
        <div className="coach-scrollbar-none h-full overflow-y-auto px-[15px] pb-24 pt-[62px]">
          <ScheduledSessionStack sessions={scheduled} />
          {next ? (
            <div className="mt-9">
              <CoachNextSessionHero
                topic={next.topic || next.title}
                when={formatCoachAppointment(next.scheduled_at, locale, t('timeNotSet'))}
                onOpen={() => void navigate(`/chat/scheduled/${next.id}`)}
              />
            </div>
          ) : null}
        </div>
        <CoachComposeFab
          onClick={() => {
            create.reset()
            setEntry('new')
          }}
        />
      </main>
      <AppBottomNavigation onCoach={() => void navigate('/chat')} />
    </>
  )
}

type ScheduledSessionValue = Awaited<ReturnType<typeof coachApi.home>>['scheduled_sessions'][number]

function ScheduledSessionStack({ sessions }: { sessions: ScheduledSessionValue[] }) {
  const { t } = useTranslation('coach')
  const [expanded, setExpanded] = useState(false)
  if (!sessions.length) return null
  return (
    <section aria-label={t('scheduledSessions')}>
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
          {expanded ? t('showLatest') : t('showAll', { count: sessions.length })}
          <ChevronDown className={`size-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      ) : null}
    </section>
  )
}

function ScheduledSession({ session }: { session: ScheduledSessionValue }) {
  const { t, i18n } = useTranslation('coach')
  const locale = currentAppLocale(i18n.language)
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
  const open = () => {
    if (start.isPending) return
    if (resolveScheduledSessionDestination(session.scheduled_at) === 'start') start.mutate()
    else void navigate(`/chat/scheduled/${session.id}`)
  }
  return (
    <article className="relative z-10 mx-1 min-h-[116px] w-[calc(100%-8px)] overflow-hidden rounded-[22px] bg-[var(--coach-surface-glass)] shadow-[var(--coach-shadow)] backdrop-blur-md">
      <button
        type="button"
        className="flex min-h-[116px] w-full min-w-0 flex-col items-start px-[18px] py-[18px] text-left focus-visible:outline-offset-[-3px]"
        onClick={open}
        disabled={start.isPending}
      >
        <span className="block text-pretty text-lg font-medium leading-6">
          {session.topic || session.title}
        </span>
        <span className="mt-3 block text-xs text-[var(--coach-text-tertiary)]">
          {formatCoachAppointment(session.scheduled_at, locale, t('timeNotSet'))}
          {session.schedule_state === 'expired' ? t('passedStillAvailable') : ''}
        </span>
      </button>
      {start.isError ? (
        <p className="px-[18px] pb-3 text-xs text-[var(--danger)]" role="alert">
          {t('startError')}
        </p>
      ) : null}
    </article>
  )
}

function SessionView({ sessionId }: { sessionId: string }) {
  const { t } = useTranslation('coach')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const thread = useQuery({
    queryKey: ['volo-session', sessionId],
    queryFn: () => coachApi.get(sessionId),
  })
  const [turnState, dispatch] = useReducer(coachTurnReducer, undefined, () =>
    createCoachTurnState(),
  )
  const [voiceOpen, setVoiceOpen] = useState(false)
  const streamControllerRef = useRef<AbortController | null>(null)
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const timeline = useMemo(() => buildCoachTimeline(turnState), [turnState])
  const sending = turnState.active !== null
  const conversationRef = useRef<HTMLDivElement>(null)
  const adjustmentMode = Boolean(thread.data?.session.related_move_id)
  const pauseCard = adjustmentMode ? null : findPendingSessionEnd(turnState.cards)
  // A revision card carries no schedule, so seed its editor from the Move the
  // adjustment targets instead of guessing.
  const relatedMoveId = thread.data?.session.related_move_id ?? null
  const moves = useGetV2Moves({ query: { enabled: adjustmentMode } })
  const relatedSchedule =
    (relatedMoveId && moves.data?.items.find((item) => item.id === relatedMoveId)?.schedule) || null

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

  const discardEmptySession = useMutation({
    mutationFn: () => coachApi.cancel(sessionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['volo-coach-home'] })
      void navigate('/daily', { replace: true })
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

  const voiceSession = useMutation({ mutationFn: () => voiceApi.create(sessionId) })

  const refreshCanonicalThread = useCallback(() => {
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ['volo-session', sessionId] }),
      queryClient.invalidateQueries({ queryKey: ['volo-coach-home'] }),
    ])
  }, [queryClient, sessionId])

  function updateCard(nextCard: VoloCard) {
    dispatch({ type: 'card_changed', card: nextCard })
  }

  async function send(body: string, retryId?: string) {
    if (voiceOpen) return
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

  function retryFailedTurn() {
    if (turnState.failed) void send(turnState.failed.body, turnState.failed.clientTempId)
  }

  if (thread.isPending) return <CoachLoading />
  if (thread.isError || !thread.data) return <CoachError onRetry={() => void thread.refetch()} />
  const ending = prepareEnd.isPending || discardEmptySession.isPending
  const canPrepareEnd = canRequestCoachEnd({
    sessionStatus: thread.data.session.status,
    cards: turnState.cards,
    sending,
    preparing: ending || voiceOpen,
  })
  const voiceAvailable = canStartVoice({
    sessionStatus: thread.data.session.status,
    sending,
    pauseBlocked: Boolean(pauseCard),
    ending,
    voiceOpen,
  })
  const pauseError = confirmEnd.isError
    ? t('pauseSaveError')
    : continueEnd.isError
      ? t('resumeError')
      : null
  return (
    <>
      <main className="flex min-h-0 flex-1 flex-col">
        <CoachConversationHeader
          onDone={() =>
            isEmptyCoachConversation(turnState.messages)
              ? discardEmptySession.mutate()
              : prepareEnd.mutate()
          }
          disabled={!canPrepareEnd}
          busy={ending}
          showDone={!adjustmentMode}
        />
        <div
          ref={conversationRef}
          className="coach-scrollbar-none min-h-0 flex-1 overflow-y-auto px-[15px] pb-6 pt-2"
        >
          <CoachFocusCard
            title={thread.data.session.topic || thread.data.session.title || t('defaultFocus')}
          />
          <div className="mt-6 space-y-6 px-[5px]">
            {timeline.map((item) => {
              if (item.kind === 'message') {
                return <MessageBubble key={item.id} message={item.message} />
              }
              if (item.kind === 'draft') {
                return (
                  <StreamingText
                    key={item.id}
                    text={item.draft.text}
                    tail={item.draft.tail}
                    status={item.draft.status}
                    onCopy={() => copyText(item.draft.text)}
                    onRetry={turnState.failed ? retryFailedTurn : undefined}
                  />
                )
              }
              const card = item.card
              const presentation = getCoachCardPresentation(card, adjustmentMode)
              return presentation ? (
                <CoachCard
                  key={item.id}
                  card={card}
                  presentation={presentation}
                  sessionId={sessionId}
                  adjustmentMode={adjustmentMode}
                  currentSchedule={relatedSchedule}
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
                onRetry={retryFailedTurn}
              />
            ) : null}
            {prepareEnd.isError || discardEmptySession.isError ? (
              <p className="text-center text-sm text-[var(--danger)]" role="alert">
                {t('endError')}
              </p>
            ) : null}
          </div>
        </div>
        {thread.data.session.status === 'ongoing' ? (
          <BeautifulPromptComposer
            placeholder={t('placeholderPresent')}
            showInspirations
            disabled={sending || ending || Boolean(pauseCard) || voiceOpen}
            inputRef={composerRef}
            onSend={(body) => void send(body)}
            onVoice={
              voiceAvailable
                ? () => {
                    setVoiceOpen(true)
                    voiceSession.mutate()
                  }
                : undefined
            }
          />
        ) : (
          <p className="safe-bottom px-5 py-5 text-center text-sm text-[var(--coach-text-secondary)]">
            {t('complete')}
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
      {voiceOpen ? (
        <VoiceOverlay
          details={voiceSession.data ?? null}
          loading={voiceSession.isPending}
          requestError={voiceSession.isError}
          onRetry={() => {
            retryVoiceSession(voiceSession)
          }}
          onCanonicalChange={refreshCanonicalThread}
          onClose={() => {
            refreshCanonicalThread()
            voiceSession.reset()
            setVoiceOpen(false)
            window.requestAnimationFrame(() => composerRef.current?.focus())
          }}
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
    <StreamingText text={message.body} status="complete" onCopy={() => copyText(message.body)} />
  )
}

function CoachCard({
  card,
  presentation,
  sessionId,
  adjustmentMode,
  currentSchedule,
  relatedLocalDate,
  onCardChanged,
}: {
  card: VoloCard
  presentation: 'interactive' | 'confirmed'
  sessionId: string
  adjustmentMode: boolean
  currentSchedule: MoveSchedule | null
  relatedLocalDate: string | null
  onCardChanged: (card: VoloCard) => void
}) {
  const { t } = useTranslation('coach')
  const scheduleLabels: Record<MoveScheduleFrequency, string> = {
    none: t('noRepeat'),
    daily: t('daily'),
    weekly: t('weekly'),
    monthly: t('monthly'),
  }
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(card.payload.description ?? '')
  const readOnly = presentation === 'confirmed'
  const settledReadOnly = readOnly
  const initialSchedule = useMemo(
    () =>
      card.payload.suggested_schedule
        ? resolveMoveScheduleDraft(card.payload.suggested_schedule)
        : currentSchedule
          ? { frequency: currentSchedule.rule.frequency, time: currentSchedule.local_time }
          : resolveMoveScheduleDraft(),
    [card.payload.suggested_schedule, currentSchedule],
  )
  // Only the user's override lives in state, so an untouched editor keeps
  // following the seed even though the related Move arrives after mount. An
  // untouched revision card must not overwrite a schedule the user already owns.
  const [scheduleOverride, setScheduleOverride] = useState<{
    frequency: MoveScheduleFrequency
    time: string
  } | null>(null)
  const [schedulePanelOpen, setSchedulePanelOpen] = useState(false)
  const scheduleDraft = scheduleOverride ?? initialSchedule
  const sendsSchedule = adjustmentMode ? scheduleOverride !== null : true
  const finalSchedule = {
    rule: buildMoveScheduleRule(scheduleDraft.frequency, new Date(), currentSchedule?.rule),
    local_time: scheduleDraft.time,
  }

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

  if (card.type === 'session_end_offer') {
    return (
      <article className="rounded-[22px] bg-[var(--coach-surface-glass-strong)] p-4 shadow-[var(--coach-shadow)]">
        <p className="text-base font-medium">{t('pauseOfferTitle')}</p>
        <p className="mt-2 text-sm leading-5 text-[var(--coach-text-secondary)]">
          {t('pauseOfferBody')}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            className="rounded-full bg-[var(--coach-accent)] text-white hover:bg-[var(--coach-accent)]/90"
            onClick={() => acceptEnd.mutate()}
            disabled={acceptEnd.isPending}
          >
            {t('pause')}
          </Button>
          <Button
            className="rounded-full"
            variant="ghost"
            onClick={() => reject.mutate({ id: card.id })}
            disabled={reject.isPending}
          >
            {t('continue')}
          </Button>
        </div>
        {acceptEnd.isError || reject.isError ? (
          <p className="mt-3 text-sm text-[var(--danger)]" role="alert">
            {t('choiceError')}
          </p>
        ) : null}
      </article>
    )
  }
  if (card.type === 'session_end') return null
  return (
    <div
      className={settledReadOnly ? 'opacity-70' : undefined}
      aria-disabled={settledReadOnly || undefined}
    >
      <p className="mb-3 text-base font-medium">{t('moveIntro')}</p>
      <MoveCardSurface
        schedule={
          settledReadOnly
            ? card.type === 'move_revision'
              ? t('moveUpdated')
              : t('moveAdded')
            : sendsSchedule
              ? formatMoveScheduleSummary(scheduleDraft, scheduleLabels)
              : t('scheduleUnchanged')
        }
        source={t('fromConversation')}
        dueLabel=""
        status={
          settledReadOnly ? (
            <span className="inline-flex items-center gap-1 font-medium text-[var(--coach-text-secondary)]">
              <Check className="size-3.5" />
              {card.type === 'move_revision' ? t('adjusted') : t('added')}
            </span>
          ) : null
        }
      >
        {editing && !readOnly ? (
          <textarea
            className="w-full resize-none rounded-lg bg-[var(--coach-surface-muted)] p-3"
            rows={3}
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        ) : (
          value
        )}
        {!readOnly && (sendsSchedule || schedulePanelOpen) ? (
          <MoveScheduleFields
            frequency={scheduleDraft.frequency}
            time={scheduleDraft.time}
            disabled={confirm.isPending}
            onFrequencyChange={(frequency) => setScheduleOverride({ ...scheduleDraft, frequency })}
            onTimeChange={(time) => setScheduleOverride({ ...scheduleDraft, time })}
          />
        ) : null}
      </MoveCardSurface>
      {!readOnly ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            onClick={() =>
              confirm.mutate({
                id: card.id,
                data: {
                  final_payload: {
                    description: value.trim(),
                    ...(sendsSchedule ? { schedule: finalSchedule } : {}),
                  },
                },
              })
            }
            disabled={!value.trim() || confirm.isPending}
          >
            {card.type === 'move_revision'
              ? t('confirmAdjustment')
              : confirm.isPending
                ? t('savingMove')
                : t('addMove')}
          </Button>
          <Button variant="ghost" onClick={() => setEditing((current) => !current)}>
            <Pencil /> {t('actions.edit', { ns: 'common' })}
          </Button>
          {adjustmentMode && !sendsSchedule && !schedulePanelOpen ? (
            <Button variant="ghost" onClick={() => setSchedulePanelOpen(true)}>
              <CalendarClock /> {t('changeSchedule')}
            </Button>
          ) : null}
          <Button variant="ghost" onClick={() => reject.mutate({ id: card.id })}>
            {card.type === 'move_revision' ? t('keepTalking') : t('skip')}
          </Button>
        </div>
      ) : null}
      {!readOnly && (confirm.isError || reject.isError) ? (
        <p className="mt-3 text-sm text-[var(--danger)]" role="alert">
          {card.type === 'move_revision' ? t('adjustmentError') : t('moveSaveError')}
        </p>
      ) : null}
    </div>
  )
}

function CoachLoading() {
  const { t } = useTranslation('coach')
  return (
    <div className="app-canvas grid min-h-0 flex-1 place-items-center text-sm text-[var(--coach-text-secondary)]">
      {t('listeningPlace')}
    </div>
  )
}

function CoachError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation('coach')
  const { t: tCommon } = useTranslation('common')
  return (
    <div className="app-canvas grid min-h-0 flex-1 place-items-center px-8 text-center">
      <div>
        <p className="font-medium">{t('openError')}</p>
        <Button className="mt-4" onClick={onRetry}>
          <RefreshCw /> {tCommon('actions.retry')}
        </Button>
      </div>
    </div>
  )
}
