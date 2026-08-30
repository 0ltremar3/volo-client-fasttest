import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { MoveCardSurface } from '@/components/cards/move-card-surface'
import { getPeriodMoveStatusLabel, type PeriodMoveStatus } from '@/features/daily/daily-model'
import { cn } from '@/lib/utils'

export type { PeriodMoveStatus } from '@/features/daily/daily-model'

export type PeriodMoveItem = {
  id: string
  schedule: string
  text: string
  source: string
  dueLabel: string
  status: PeriodMoveStatus
}

type PeriodMovesProps = {
  items: PeriodMoveItem[]
  onStatusChange: (
    item: PeriodMoveItem,
    status: Exclude<PeriodMoveStatus, null>,
  ) => Promise<void> | void
  onRethink: (item: PeriodMoveItem) => Promise<void> | void
  onDelete: (item: PeriodMoveItem) => Promise<void> | void
  onFindMove: () => void
}

const statusCopy = {
  progressing: {
    label: 'On Track',
    description: 'I’m moving in the right direction.',
  },
  stuck: {
    label: 'Drifting',
    description: 'I haven’t made much progress yet.',
  },
  needs_adjustment: {
    label: 'Needs a Rethink',
    description: 'I want to revisit this Move with Coach.',
  },
} as const

const selectableStatuses = ['progressing', 'stuck'] as const

export function PeriodMoves({
  items,
  onStatusChange,
  onRethink,
  onDelete,
  onFindMove,
}: PeriodMovesProps) {
  const [expanded, setExpanded] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const contentId = useId()
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const collapseButtonRef = useRef<HTMLButtonElement>(null)
  const activeItem = items.find((item) => item.id === activeId) ?? null
  const deleteItem = items.find((item) => item.id === deleteId) ?? null

  async function run(action: () => Promise<void> | void, fallback: string) {
    setPending(true)
    setError(null)
    try {
      await action()
      return true
    } catch {
      setError(fallback)
      return false
    } finally {
      setPending(false)
    }
  }

  function restoreTrigger() {
    const trigger = triggerRef.current
    window.setTimeout(() => {
      if (trigger?.isConnected) trigger.focus()
      else collapseButtonRef.current?.focus()
    }, 50)
  }

  return (
    <section className="w-full" aria-labelledby={`${contentId}-title`}>
      <div className="flex min-h-11 items-center justify-between">
        <h2 id={`${contentId}-title`} className="text-base font-medium leading-5">
          Period Moves
        </h2>
        <button
          ref={collapseButtonRef}
          type="button"
          className="grid size-11 place-items-center rounded-full text-[var(--coach-text-secondary)] transition-colors hover:text-[var(--coach-ink)]"
          aria-expanded={expanded}
          aria-controls={contentId}
          aria-label={expanded ? 'Collapse Period Moves' : 'Expand Period Moves'}
          onClick={() => setExpanded((current) => !current)}
        >
          <ChevronDown
            className={cn('size-4 transition-transform', expanded && 'rotate-180')}
            aria-hidden="true"
          />
        </button>
      </div>

      <div id={contentId} hidden={!expanded}>
        {items.length ? (
          <div className="mt-2.5 space-y-3">
            {items.map((item) => (
              <MoveCardSurface
                key={item.id}
                variant="daily"
                schedule={item.schedule}
                source={item.source}
                dueLabel={item.dueLabel}
                actionLabel={`Check in for ${item.text}. Current status: ${getPeriodMoveStatusLabel(item.status)}`}
                onAction={(event) => {
                  triggerRef.current = event.currentTarget
                  setError(null)
                  if (item.status === 'needs_adjustment') {
                    if (!pending) {
                      void run(() => onRethink(item), 'Coach could not open this Move. Try again.')
                    }
                    return
                  }
                  setActiveId(item.id)
                }}
                status={
                  <span className="-my-3 -mr-2 grid min-h-11 shrink-0 place-items-center px-2">
                    <span
                      className={cn(
                        'rounded-full px-2 py-1 text-[11px] font-medium leading-none',
                        item.status === 'progressing' &&
                          'bg-[var(--daily-move-on-track)] text-[var(--daily-move-status-foreground)]',
                        item.status === 'stuck' &&
                          'bg-[var(--daily-move-drifting)] text-[var(--daily-move-status-foreground)]',
                        item.status === 'needs_adjustment' &&
                          'bg-[var(--coach-surface-glass-strong)] text-[var(--coach-ink)]',
                        item.status === null &&
                          'bg-[var(--coach-surface-muted)] text-[var(--coach-text-secondary)]',
                      )}
                    >
                      {getPeriodMoveStatusLabel(item.status)}
                    </span>
                  </span>
                }
              >
                {item.text}
              </MoveCardSurface>
            ))}
          </div>
        ) : (
          <div className="px-3 pb-1 pt-1 text-center">
            <p className="text-sm font-medium text-[var(--coach-text-secondary)]">
              What’s your next Move?
            </p>
            <p className="mx-auto mt-1 max-w-[18rem] text-sm leading-5 text-[var(--coach-text-tertiary)]">
              A conversation with Coach can help you find what feels right.
            </p>
            <button
              type="button"
              onClick={onFindMove}
              className="mt-3 min-h-11 w-full rounded-full bg-[var(--coach-surface-glass-strong)] px-5 text-sm font-medium shadow-[var(--coach-shadow)] transition-transform active:scale-[0.97]"
            >
              Find My Move
            </button>
          </div>
        )}
      </div>
      {error && !activeItem && !deleteItem ? (
        <p className="mt-2 text-center text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}

      {activeItem ? (
        <MoveStatusDialog
          item={activeItem}
          pending={pending}
          error={error}
          onClose={() => {
            if (!pending) {
              setActiveId(null)
              restoreTrigger()
            }
          }}
          onStatusChange={async (status) => {
            await run(
              () => onStatusChange(activeItem, status),
              'Your Move status could not be updated. Try again.',
            )
          }}
          onRethink={async () => {
            await run(() => onRethink(activeItem), 'Coach could not open this Move. Try again.')
          }}
          onDelete={() => {
            setError(null)
            setDeleteId(activeItem.id)
            setActiveId(null)
          }}
        />
      ) : null}

      {deleteItem ? (
        <DeleteMoveDialog
          pending={pending}
          error={error}
          onCancel={() => {
            if (!pending) {
              setDeleteId(null)
              restoreTrigger()
            }
          }}
          onConfirm={async () => {
            const deleted = await run(
              () => onDelete(deleteItem),
              'This Move could not be deleted. Try again.',
            )
            if (deleted) {
              setDeleteId(null)
              window.setTimeout(() => collapseButtonRef.current?.focus(), 0)
            }
          }}
        />
      ) : null}
    </section>
  )
}

function MoveStatusDialog({
  item,
  pending,
  error,
  onClose,
  onStatusChange,
  onRethink,
  onDelete,
}: {
  item: PeriodMoveItem
  pending: boolean
  error: string | null
  onClose: () => void
  onStatusChange: (status: Exclude<PeriodMoveStatus, null>) => Promise<void>
  onRethink: () => Promise<void>
  onDelete: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || dialog.open) return
    dialog.showModal()
  }, [])

  if (typeof document === 'undefined') return null

  return createPortal(
    <dialog
      ref={dialogRef}
      className="move-status-dialog m-0 max-h-none max-w-none p-0 text-[var(--coach-ink)]"
      aria-labelledby="move-status-title"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault()
        if (!pending) dialogRef.current?.close()
      }}
    >
      <div className="safe-bottom flex h-full flex-col px-5 pb-5">
        <span
          className="mx-auto mt-3 h-1 w-[60px] rounded-full bg-[var(--coach-sheet-handle)]"
          aria-hidden="true"
        />
        <div className="mt-5 flex min-h-11 items-center justify-between">
          <p className="text-base font-semibold">Move Check-in</p>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            disabled={pending}
            className="min-h-11 rounded-full bg-[var(--coach-surface-glass-strong)] px-4 text-sm font-medium shadow-[var(--coach-shadow)] disabled:opacity-45"
          >
            Done
          </button>
        </div>
        <h2 id="move-status-title" className="mt-2 font-display text-[28px] font-medium leading-9">
          How’s this Move going?
        </h2>
        <p className="mt-1 text-sm leading-5 text-[var(--coach-text-secondary)]">
          Choose what best describes where you are right now.
        </p>

        <div className="mt-4 space-y-2">
          {selectableStatuses.map((status) => {
            const selected = item.status === status
            return (
              <button
                key={status}
                type="button"
                aria-pressed={selected}
                disabled={pending}
                onClick={() => void onStatusChange(status)}
                className={cn(
                  'flex min-h-[64px] w-full items-center gap-4 rounded-2xl border border-[var(--coach-border-warm-subtle)] px-4 text-left transition-colors disabled:opacity-45',
                  selected &&
                    status === 'progressing' &&
                    'border-transparent bg-[var(--daily-move-on-track)] text-[var(--daily-move-status-foreground)]',
                  selected &&
                    status === 'stuck' &&
                    'border-transparent bg-[var(--daily-move-drifting)] text-[var(--daily-move-status-foreground)]',
                  !selected && 'bg-[var(--coach-surface-glass)]',
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-semibold">{statusCopy[status].label}</span>
                  <span
                    className={cn(
                      'mt-0.5 block text-xs',
                      selected ? 'text-current opacity-85' : 'text-[var(--coach-text-tertiary)]',
                    )}
                  >
                    {statusCopy[status].description}
                  </span>
                </span>
                {selected ? <Check className="size-5 shrink-0" aria-hidden="true" /> : null}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          disabled={pending}
          onClick={() => void onRethink()}
          className="mt-auto min-h-11 w-full rounded-full bg-[var(--coach-surface-glass-strong)] px-5 text-base font-medium shadow-[var(--coach-shadow)] transition-transform enabled:active:scale-[0.97] disabled:opacity-45"
        >
          {pending ? 'Updating…' : 'Needs a Rethink'}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onDelete}
          className="mt-2 min-h-11 w-full rounded-full px-5 text-sm text-[var(--coach-text-tertiary)] disabled:opacity-45"
        >
          Delete Move
        </button>
        {error ? (
          <p className="mt-1 text-center text-sm text-[var(--danger)]" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </dialog>,
    document.body,
  )
}

function DeleteMoveDialog({
  pending,
  error,
  onCancel,
  onConfirm,
}: {
  pending: boolean
  error: string | null
  onCancel: () => void
  onConfirm: () => Promise<void>
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || dialog.open) return
    dialog.showModal()
  }, [])

  if (typeof document === 'undefined') return null

  return createPortal(
    <dialog
      ref={dialogRef}
      className="move-delete-dialog m-auto p-0 text-[var(--coach-ink)]"
      aria-labelledby="move-delete-title"
      onClose={onCancel}
      onCancel={(event) => {
        event.preventDefault()
        if (!pending) dialogRef.current?.close()
      }}
    >
      <div className="px-6 pb-5 pt-6 text-center">
        <h2 id="move-delete-title" className="text-lg font-medium">
          Delete this Move?
        </h2>
        <p className="mt-1 text-sm text-[var(--coach-text-secondary)]">This can’t be undone.</p>
        {error ? (
          <p className="mt-3 text-sm text-[var(--danger)]" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      <div className="grid grid-cols-2 border-t border-[var(--coach-border)]">
        <button
          type="button"
          disabled={pending}
          onClick={() => dialogRef.current?.close()}
          className="min-h-12 border-r border-[var(--coach-border)] text-sm font-medium disabled:opacity-45"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => void onConfirm()}
          className="min-h-12 text-sm font-medium text-[var(--danger)] disabled:opacity-45"
        >
          {pending ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </dialog>,
    document.body,
  )
}
