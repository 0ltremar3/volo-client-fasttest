import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'

import { coachApi } from '@/api/volo'
import { AppAtmosphere } from '@/components/layout/app-atmosphere'
import { Button } from '@/components/ui/button'
import { CoachOrb } from '@/features/coach/coach-orb'
import { voloCoachHomeQueryKey } from '@/features/coach/coach-session-query'
import { singleFlight } from '@/features/coach/schedule-routing'
import { currentAppLocale } from '@/i18n'
import { toBcp47 } from '@/lib/locale'

export function ScheduledCoachPage() {
  const { t, i18n } = useTranslation('coach')
  const locale = currentAppLocale(i18n.language)
  const { sessionId = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const home = useQuery({ queryKey: voloCoachHomeQueryKey, queryFn: coachApi.home })
  const session = home.data?.scheduled_sessions.find((item) => item.id === sessionId)
  const startOnce = useMemo(() => singleFlight(() => coachApi.start(sessionId)), [sessionId])
  const start = useMutation({
    mutationFn: startOnce,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: voloCoachHomeQueryKey })
      void navigate(`/chat?session=${sessionId}`, { replace: true })
    },
  })

  if (home.isPending) return <div className="app-canvas h-dvh" />
  if (!session) {
    return (
      <div className="app-canvas grid h-dvh place-items-center px-6 text-center">
        <div>
          <p>{t('scheduledUnavailable')}</p>
          <Button className="mt-4 rounded-full" onClick={() => void navigate('/chat')}>
            {t('returnToCoach')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <main className="app-canvas relative isolate flex h-dvh flex-col overflow-hidden text-[var(--coach-ink)]">
      <AppAtmosphere />
      <section className="relative z-10 flex flex-1 flex-col items-center px-[25px] pt-[22vh] text-center">
        <p className="text-lg font-semibold">{t('timeForSession')}</p>
        <CoachOrb className="mt-14" />
        <h1 className="mt-8 text-wrap-balance text-4xl font-semibold leading-none">
          {session.topic || session.title}
        </h1>
        <p className="mt-3 text-sm font-medium text-[var(--coach-text-secondary)]">
          {new Intl.DateTimeFormat(toBcp47(locale), {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          }).format(new Date(session.scheduled_at!))}
        </p>
        <div className="mt-14 w-full space-y-2">
          <Button
            className="h-[50px] w-full rounded-full bg-[var(--coach-surface)] text-[var(--coach-ink)] shadow-[0_6px_18px_rgb(52_51_48/8%)] hover:bg-[var(--coach-surface-glass-strong)]"
            disabled={start.isPending}
            onClick={() => start.mutate()}
          >
            {start.isPending ? t('starting') : t('startNow')}
          </Button>
          <Button
            variant="ghost"
            className="h-12 w-full rounded-full text-[var(--coach-text-tertiary)]"
            onClick={() => void navigate('/chat')}
          >
            {t('notNow')}
          </Button>
          {start.isError ? (
            <p className="text-sm text-[var(--danger)]" role="alert">
              {t('sessionStartError')}
            </p>
          ) : null}
        </div>
      </section>
    </main>
  )
}
