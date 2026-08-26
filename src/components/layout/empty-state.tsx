import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center border-y border-border-subtle py-12 text-center">
      <span className="mb-4 grid size-10 place-items-center rounded-lg bg-surface-subtle text-text-secondary">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <h2 className="font-display text-base font-semibold text-foreground">{title}</h2>
      <p className="mt-1.5 max-w-xs text-wrap-pretty text-sm text-text-secondary">{description}</p>
    </div>
  )
}
