import { Check, Copy, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'

export type StreamingTextStatus = 'streaming' | 'complete' | 'failed'

export function StreamingText({
  text,
  status,
  tail = '',
  onCopy,
  onRetry,
}: {
  text: string
  status: StreamingTextStatus
  tail?: string
  onCopy: () => Promise<void> | void
  onRetry?: () => void
}) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copying' | 'copied' | 'failed'>('idle')
  const streaming = status === 'streaming'
  const showActions = status === 'complete' || status === 'failed'
  const appendedText = streaming && tail && text.endsWith(tail) ? tail : ''
  const stableText = appendedText ? text.slice(0, -appendedText.length) : text

  useEffect(() => {
    if (copyStatus !== 'copied') return
    const timeout = window.setTimeout(() => setCopyStatus('idle'), 2000)
    return () => window.clearTimeout(timeout)
  }, [copyStatus])

  async function copyResponse(trigger: HTMLButtonElement) {
    setCopyStatus('copying')
    try {
      await onCopy()
      setCopyStatus('copied')
    } catch {
      setCopyStatus('failed')
    } finally {
      trigger.focus({ preventScroll: true })
    }
  }

  if (streaming && !text) return <CoachThinkingState />

  return (
    <div className="min-w-0 pr-3">
      <p
        className="text-pretty whitespace-pre-wrap break-words text-base font-medium leading-6"
        aria-hidden={streaming || undefined}
      >
        {stableText}
        {appendedText ? (
          <span
            key={text.length}
            className="animate-[coach-stream-delta_160ms_var(--ease-standard)_both]"
          >
            {appendedText}
          </span>
        ) : null}
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
              className="flex size-touch items-center justify-start rounded-full transition-colors hover:text-[var(--coach-ink)] disabled:opacity-45"
              onClick={(event) => void copyResponse(event.currentTarget)}
              disabled={copyStatus === 'copying'}
              aria-label={copyStatus === 'copied' ? 'Response copied' : 'Copy response'}
              title={copyStatus === 'copied' ? 'Copied' : 'Copy response'}
            >
              {copyStatus === 'copied' ? (
                <Check className="size-4 text-[var(--coach-success)]" />
              ) : (
                <Copy className="size-4" />
              )}
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
          {copyStatus === 'failed' ? (
            <span className="text-xs text-[var(--danger)]" role="alert">
              Couldn’t copy
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

const driveDelays = [90, 180, 270, 0, 90, 180, 90, 180, 270]

function CoachThinkingState() {
  return (
    <div role="status" className="flex min-h-6 w-fit items-center gap-2.5 text-sm">
      <span aria-hidden="true" className="grid shrink-0 grid-cols-[repeat(3,4px)] gap-[1.5px]">
        {driveDelays.map((delay, index) => (
          <span
            key={index}
            className="coach-thinking-cell size-1 rounded-[1px] bg-[var(--coach-ink)]"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </span>
      <span className="font-medium text-[var(--coach-text-secondary)]">Reflecting</span>
    </div>
  )
}
