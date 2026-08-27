import { ChevronRight, Sparkles, X } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { mockSessions, type CoachSession } from '@/features/coach/coach-model'

type ConversationHistoryDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (session: CoachSession) => void
}

export function ConversationHistoryDialog({
  open,
  onOpenChange,
  onSelect,
}: ConversationHistoryDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      className="coach-dialog m-0 h-dvh max-h-none w-[min(22.5rem,calc(100vw-1rem))] max-w-none bg-[var(--coach-surface)] p-0 text-[var(--coach-ink)]"
      onClose={() => onOpenChange(false)}
      onCancel={(event) => {
        event.preventDefault()
        onOpenChange(false)
      }}
      aria-labelledby="conversation-history-title"
    >
      <div className="safe-top safe-bottom flex h-full flex-col">
        <div className="flex h-16 items-center gap-3 border-b border-[var(--coach-border)] px-4">
          <div className="min-w-0 flex-1">
            <h2 id="conversation-history-title" className="text-base font-semibold">
              Conversations
            </h2>
            <p className="text-xs text-[var(--coach-text-secondary)]">Local mock history</p>
          </div>
          <ThemeToggle />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            aria-label="Close conversation history"
          >
            <X />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {mockSessions.map((session) => (
            <button
              key={session.id}
              type="button"
              onClick={() => onSelect(session)}
              className="group mb-1 flex min-h-touch w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-[var(--coach-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-[var(--coach-accent-muted)] text-[var(--coach-accent)]">
                <Sparkles className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{session.title}</span>
                <span className="mt-0.5 block text-xs text-[var(--coach-text-tertiary)]">
                  {session.date}
                </span>
                <span className="mt-2 line-clamp-2 block text-xs leading-5 text-[var(--coach-text-secondary)]">
                  {session.preview}
                </span>
              </span>
              <ChevronRight
                className="mt-2 size-4 shrink-0 text-[var(--coach-text-tertiary)] transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </button>
          ))}
        </div>
      </div>
    </dialog>
  )
}
