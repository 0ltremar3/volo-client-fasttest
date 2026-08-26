import { cn } from '@/lib/utils'

interface AppMarkProps {
  className?: string
}

export function AppMark({ className }: AppMarkProps) {
  return (
    <span
      className={cn(
        'grid size-8 grid-cols-2 gap-1 rounded-lg bg-primary-muted p-2 text-primary',
        className,
      )}
      aria-hidden="true"
    >
      <span className="rounded-full bg-current" />
      <span className="rounded-full bg-current opacity-55" />
      <span className="rounded-full bg-current opacity-55" />
      <span className="rounded-full bg-current" />
    </span>
  )
}
