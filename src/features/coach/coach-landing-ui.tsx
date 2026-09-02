import { ArrowRight, Plus, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { CoachOrb } from '@/features/coach/coach-orb'

export function CoachNewSessionPanel({
  onFindTime,
  onStartNow,
  onClose,
  startPending = false,
  startError,
}: {
  onFindTime: () => void
  onStartNow: () => void
  onClose?: () => void
  startPending?: boolean
  startError?: string | null
}) {
  const { t } = useTranslation('coach')
  return (
    <section className="relative flex flex-1 flex-col items-center px-[25px] pb-[145px] pt-[220px] text-center">
      {onClose ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="safe-top absolute left-3 top-3"
          onClick={onClose}
          aria-label={t('closeNewSession')}
        >
          <X />
        </Button>
      ) : null}
      <CoachOrb />
      <div className="mt-[35px] w-full">
        <h1 className="font-display text-4xl font-medium leading-none tracking-[-0.02em] text-[var(--coach-ink)]">
          {t('hello')}
        </h1>
        <p className="mx-auto mt-2 max-w-[19rem] text-[1.625rem] font-semibold leading-8 text-[var(--coach-ink)]">
          {t('tagline')}
        </p>
        <p className="mx-auto mt-5 max-w-[20rem] text-base leading-[18px] text-[var(--coach-text-secondary)]">
          {t('makeSpace')}
        </p>
      </div>

      <div className="mt-auto w-full pt-14">
        <Button
          type="button"
          onClick={onFindTime}
          disabled={startPending}
          className="h-[50px] w-full rounded-full bg-[var(--coach-surface)] text-base text-[var(--coach-ink)] shadow-[var(--coach-shadow)] hover:bg-[var(--coach-surface)]/90"
        >
          {t('findATimeTitle')}
        </Button>
        <button
          type="button"
          onClick={onStartNow}
          disabled={startPending}
          className="mt-2 min-h-touch px-5 text-sm font-medium text-[var(--coach-text-secondary)] transition-colors hover:text-[var(--coach-ink)] disabled:opacity-45"
        >
          {startPending ? t('starting') : t('startNowTitle')}
        </button>
        {startError ? (
          <p className="mt-2 text-sm text-[var(--danger)]" role="alert">
            {startError}
          </p>
        ) : null}
      </div>
    </section>
  )
}

export function CoachNextSessionHero({
  topic,
  when,
  onOpen,
}: {
  topic: string
  when: string
  onOpen: () => void
}) {
  const { t } = useTranslation('coach')
  return (
    <div className="flex flex-col items-center px-[10px] text-center">
      <h2 className="text-lg font-semibold text-[var(--coach-ink)]">{t('nextSession')}</h2>
      <CoachOrb className="mt-9" />
      <button
        type="button"
        onClick={onOpen}
        className="group mt-12 w-full min-h-touch text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`${topic}, ${when}`}
      >
        <span className="block text-wrap-balance text-4xl font-semibold leading-none tracking-[-0.03em] text-[var(--coach-ink)]">
          {topic}
        </span>
        <span className="mt-2.5 inline-flex items-center justify-center gap-1 text-sm font-medium text-[var(--coach-text-secondary)]">
          {when}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" />
        </span>
      </button>
    </div>
  )
}

export function CoachComposeFab({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation('coach')
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t('composeSession')}
      className="absolute bottom-[42px] right-[23px] z-20 grid size-14 place-items-center rounded-full bg-[var(--coach-surface)] text-[var(--coach-accent)] shadow-[var(--coach-shadow)] transition-transform duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Plus className="size-6" strokeWidth={2.25} aria-hidden="true" />
    </button>
  )
}
