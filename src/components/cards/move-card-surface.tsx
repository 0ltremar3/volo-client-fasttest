import type { ReactNode } from 'react'

type MoveCardSurfaceProps = {
  schedule: string
  children: ReactNode
  source: string
  dueLabel: string
  status?: ReactNode
}

export function MoveCardSurface({
  schedule,
  children,
  source,
  dueLabel,
  status,
}: MoveCardSurfaceProps) {
  return (
    <article className="min-h-[146px] rounded-[22px] border border-white/80 bg-[var(--coach-surface-glass)] p-[18px] shadow-[var(--coach-card-shadow)] backdrop-blur-sm">
      <div className="flex min-h-[15px] items-center gap-3 text-xs leading-[15px] text-[var(--coach-text-tertiary)]">
        <span className="min-w-0 flex-1">{schedule}</span>
        {status}
      </div>
      <div className="mt-4 text-pretty text-lg font-medium leading-6 text-[var(--coach-ink)]">
        {children}
      </div>
      <div className="mt-4 flex items-end gap-3 text-xs text-[var(--coach-text-tertiary)]">
        <p className="min-w-0 flex-1 truncate">{source}</p>
        <time className="shrink-0 font-semibold">{dueLabel}</time>
      </div>
    </article>
  )
}
