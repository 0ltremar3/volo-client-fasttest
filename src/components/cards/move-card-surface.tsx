import type { MouseEvent, ReactNode } from 'react'

import { cn } from '@/lib/utils'

type MoveCardSurfaceProps = {
  schedule: string
  children: ReactNode
  source: string
  dueLabel: string
  status?: ReactNode
  variant?: 'default' | 'daily'
  actionLabel?: string
  onAction?: (event: MouseEvent<HTMLButtonElement>) => void
}

export function MoveCardSurface({
  schedule,
  children,
  source,
  dueLabel,
  status,
  variant = 'default',
  actionLabel,
  onAction,
}: MoveCardSurfaceProps) {
  return (
    <article
      className={cn(
        'relative border border-white/80 bg-[var(--coach-surface-glass)] shadow-[var(--coach-card-shadow)] backdrop-blur-sm',
        variant === 'daily'
          ? 'min-h-[128px] rounded-2xl px-3 py-3.5'
          : 'min-h-[146px] rounded-[22px] p-[18px]',
      )}
    >
      {actionLabel && onAction ? (
        <button
          type="button"
          className="absolute inset-0 z-10 rounded-2xl transition-colors active:bg-black/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={actionLabel}
          onClick={onAction}
        />
      ) : null}
      <div className="flex min-h-[15px] items-start gap-3 text-xs leading-[15px] text-[var(--coach-text-tertiary)]">
        <span className="min-w-0 flex-1">{schedule}</span>
        {status}
      </div>
      <div
        className={cn(
          'text-pretty font-medium text-[var(--coach-ink)]',
          variant === 'daily' ? 'mt-3 text-base leading-5' : 'mt-4 text-lg leading-6',
        )}
      >
        {children}
      </div>
      <div
        className={cn(
          'flex items-end gap-3 text-xs text-[var(--coach-text-tertiary)]',
          variant === 'daily' ? 'mt-3' : 'mt-4',
        )}
      >
        <p className="min-w-0 flex-1 truncate">{source}</p>
        <time className="shrink-0 font-semibold">{dueLabel}</time>
      </div>
    </article>
  )
}
