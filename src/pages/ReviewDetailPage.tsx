import { useMutation, useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'

import { reviewApi } from '@/api/volo'
import { MoveCardSurface } from '@/components/cards/move-card-surface'
import { AppAtmosphere } from '@/components/layout/app-atmosphere'
import { AppBottomNavigation } from '@/components/layout/app-bottom-navigation'
import { Button } from '@/components/ui/button'
import { mockAuthEnabled } from '@/features/auth/mock-auth'
import { localizeCoachAssistantBody } from '@/features/coach/coach-message-copy'
import { mockReviewDetail } from '@/features/review/review-mock'

export function ReviewDetailPage() {
  const { t } = useTranslation('review')
  const { t: tCoach } = useTranslation('coach')
  const { sessionId = '' } = useParams()
  const navigate = useNavigate()
  const detail = useQuery({
    queryKey: ['volo-review-detail', sessionId],
    queryFn: () => reviewApi.detail(sessionId),
    enabled: !mockAuthEnabled,
  })
  const data = mockAuthEnabled ? mockReviewDetail(sessionId) : detail.data
  const continueConversation = useMutation({
    mutationFn: () => reviewApi.continue(sessionId),
    onSuccess: (result) => void navigate(`/chat?session=${result.session.id}`),
  })

  if (!data && detail.isPending && !mockAuthEnabled) return <div className="app-canvas h-dvh" />
  if (!data) {
    return (
      <div className="app-canvas grid h-dvh place-items-center px-6 text-center">
        <div>
          <p>{t('unavailable')}</p>
          <Button className="mt-4" onClick={() => void navigate('/review')}>
            {t('return')}
          </Button>
        </div>
      </div>
    )
  }

  const isEcho = data.type === 'echo'
  const topic = isEcho ? data.summary : (data.pause?.topic_to_explore ?? data.title)
  const takeaway = isEcho ? data.takeaways?.[0] : (data.pause?.takeaway ?? data.summary)
  const additionalTakeaways = isEcho ? data.takeaways?.slice(1) : []
  return (
    <div className="app-canvas relative isolate flex h-dvh min-h-0 flex-col overflow-hidden text-[var(--coach-ink)]">
      <AppAtmosphere />
      <header className="safe-top relative z-10 grid min-h-16 shrink-0 grid-cols-[44px_1fr_44px] items-center px-3">
        <button
          type="button"
          className="grid size-11 place-items-center rounded-full"
          onClick={() => void navigate('/review')}
          aria-label={t('back')}
        >
          <X className="size-5" />
        </button>
        <p className="truncate text-center text-base font-semibold">
          {data.type === 'echo' ? t('dailyEcho') : t('coach')}
        </p>
        <span />
      </header>
      <main className="coach-scrollbar-none relative z-10 min-h-0 flex-1 overflow-y-auto px-[18px] pb-8 pt-5">
        <article className="rounded-[22px] bg-[var(--coach-surface-glass-strong)] p-4 shadow-[var(--coach-shadow)]">
          <p className="text-[11px] font-medium text-[var(--coach-text-tertiary)]">
            {data.type === 'echo' ? t('summary') : t('topicToExplore')}
          </p>
          <p className="mt-3 border-b border-[var(--coach-border-strong)] pb-3 text-lg leading-6">
            {topic}
          </p>
          <p className="mt-3 text-[11px] font-medium text-[var(--coach-text-tertiary)]">
            {t('takeAway')}
          </p>
          <p className="mt-2 text-base leading-5">{takeaway}</p>
          {additionalTakeaways?.map((item) => (
            <p key={item} className="mt-2 text-sm text-[var(--coach-text-secondary)]">
              {item}
            </p>
          ))}
        </article>

        {data.moves.map((move) => (
          <div key={move.id} className="mt-5">
            <MoveCardSurface
              schedule={t('confirmedMove')}
              source={t('fromConversation')}
              dueLabel=""
            >
              {move.description}
            </MoveCardSurface>
          </div>
        ))}

        <div className="mt-7 space-y-6">
          {data.messages.map((message) =>
            message.role === 'user' ? (
              <div key={message.id} className="flex justify-end pl-12">
                <p className="max-w-[18.5rem] rounded-[22px] bg-[var(--coach-user-bubble)] px-4 py-3 text-base font-medium leading-5 text-[var(--coach-text-warm)]">
                  {message.body}
                </p>
              </div>
            ) : (
              <p
                key={message.id}
                className="whitespace-pre-wrap pr-3 text-base font-medium leading-6"
              >
                {localizeCoachAssistantBody(message.body, tCoach)}
              </p>
            ),
          )}
        </div>
        <Button
          className="mt-10 h-[50px] w-full rounded-full bg-[var(--coach-surface-glass-strong)] text-[var(--coach-ink)] shadow-[var(--coach-shadow)]"
          onClick={() => (mockAuthEnabled ? void navigate('/chat') : continueConversation.mutate())}
          disabled={continueConversation.isPending}
        >
          {continueConversation.isPending ? t('opening') : t('continueConversation')}
        </Button>
        {continueConversation.isError ? (
          <p className="mt-3 text-center text-sm text-[var(--danger)]" role="alert">
            {t('continueError')}
          </p>
        ) : null}
      </main>
      <AppBottomNavigation />
    </div>
  )
}
