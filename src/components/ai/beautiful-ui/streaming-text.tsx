import { Copy, RefreshCw } from 'lucide-react'

export type StreamingTextStatus = 'streaming' | 'complete' | 'failed'

export function StreamingText({
  text,
  status,
  onCopy,
  onRetry,
}: {
  text: string
  status: StreamingTextStatus
  onCopy: () => void
  onRetry?: () => void
}) {
  const streaming = status === 'streaming'
  const showActions = status === 'complete' || status === 'failed'

  return (
    <div className="min-w-0 pr-3">
      <p
        className="text-pretty whitespace-pre-wrap break-words text-base font-medium leading-6"
        aria-hidden={streaming || undefined}
      >
        {text}
        {streaming ? (
          <span
            className="ml-1 inline-block h-[1em] w-px translate-y-[0.15em] bg-[var(--coach-accent)] motion-safe:animate-pulse"
            aria-hidden="true"
          />
        ) : null}
      </p>
      {status === 'failed' ? (
        <p className="mt-2 text-sm text-[var(--danger)]" role="alert">
          Response interrupted.
        </p>
      ) : null}
      {showActions ? (
        <div className="mt-1 flex min-h-touch items-center gap-1 text-[var(--coach-text-tertiary)]">
          {text ? (
            <button
              type="button"
              className="grid size-touch place-items-center rounded-full transition-colors hover:bg-[var(--coach-surface-muted)] hover:text-[var(--coach-ink)]"
              onClick={onCopy}
              aria-label="Copy response"
              title="Copy response"
            >
              <Copy className="size-4" />
            </button>
          ) : null}
          {status === 'failed' && onRetry ? (
            <button
              type="button"
              className="flex min-h-touch items-center gap-2 rounded-full px-3 text-sm font-medium text-[var(--coach-accent)] transition-colors hover:bg-[var(--coach-accent-muted)]"
              onClick={onRetry}
            >
              <RefreshCw className="size-4" /> Retry
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
