import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { Input } from '@/components/ui/input'
import type { MoveScheduleFrequency } from '@/features/coach/coach-model'
import { CoachOrb } from '@/features/coach/coach-orb'
import { cn } from '@/lib/utils'

export type CoachPausePayload = {
  topic_to_explore: string
  takeaway: string
}

const moveScheduleOptions: Array<{ value: MoveScheduleFrequency; label: string }> = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

export function MoveScheduleFields({
  frequency,
  time,
  disabled = false,
  onFrequencyChange,
  onTimeChange,
}: {
  frequency: MoveScheduleFrequency
  time: string
  disabled?: boolean
  onFrequencyChange: (frequency: MoveScheduleFrequency) => void
  onTimeChange: (time: string) => void
}) {
  return (
    <fieldset className="mt-5 border-t border-[var(--coach-border-warm-subtle)] pt-4">
      <legend className="sr-only">Move check plan</legend>
      <p className="text-xs font-semibold text-[var(--coach-text-tertiary)]">REPEAT</p>
      <div
        className="mt-2 grid grid-cols-3 rounded-xl bg-[var(--coach-surface-muted)] p-1"
        role="group"
        aria-label="Move check frequency"
      >
        {moveScheduleOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={cn(
              'min-h-11 rounded-lg px-2 text-sm font-medium transition-[background-color,box-shadow,opacity]',
              frequency === option.value
                ? 'bg-[var(--coach-surface-glass-strong)] text-[var(--coach-ink)] shadow-sm'
                : 'text-[var(--coach-text-secondary)]',
            )}
            aria-pressed={frequency === option.value}
            disabled={disabled}
            onClick={() => onFrequencyChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <label className="mt-3 block">
        <span className="text-xs font-semibold text-[var(--coach-text-tertiary)]">TIME</span>
        <Input
          type="time"
          className="mt-2 bg-[var(--coach-surface-glass-strong)]"
          value={time}
          disabled={disabled}
          required
          onChange={(event) => onTimeChange(event.target.value)}
        />
      </label>
    </fieldset>
  )
}

export function CoachConversationHeader({
  onDone,
  disabled = false,
  busy = false,
  showDone = true,
}: {
  onDone: () => void
  disabled?: boolean
  busy?: boolean
  showDone?: boolean
}) {
  return (
    <header className="safe-top relative z-30 grid min-h-16 shrink-0 grid-cols-[57px_1fr_57px] items-center px-5 backdrop-blur-[15px]">
      <span aria-hidden="true" />
      <p className="text-center text-base font-semibold text-[var(--coach-ink)]">Coach</p>
      {showDone ? (
        <button
          type="button"
          className="flex h-11 w-[57px] items-center rounded-full text-sm font-medium text-[var(--coach-on-dark)] transition-[opacity,transform] enabled:active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45"
          onClick={onDone}
          disabled={disabled}
          aria-busy={busy || undefined}
        >
          <span className="block h-[30px] w-[57px] rounded-full bg-[var(--coach-chrome-dark)] px-[10px] leading-[30px] shadow-[0_2px_2px_rgb(61_59_54/10%)]">
            Done
          </span>
        </button>
      ) : (
        <span aria-hidden="true" />
      )}
    </header>
  )
}

export function CoachFocusCard({ title, topics = [] }: { title: string; topics?: string[] }) {
  return (
    <article className="min-h-[175px] rounded-[22px] border border-white/80 bg-[var(--coach-focus)] px-[22px] py-5 shadow-[var(--coach-card-shadow)] backdrop-blur-sm">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--coach-text-tertiary)]">
        FOCUS
      </p>
      <h1 className="mt-4 max-w-[15.625rem] text-balance font-display text-[22px] font-semibold leading-[30px] text-[var(--coach-ink)]">
        {title}
      </h1>
      {topics.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {topics.map((topic) => (
            <span
              key={topic}
              className="inline-flex h-[22px] items-center rounded-full border border-[var(--coach-border-warm-subtle)] bg-[var(--coach-surface-glass-strong)] px-[10px] text-[11px] font-medium text-[var(--coach-ink)]"
            >
              {topic}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  )
}

export function CoachPauseDialog({
  initialPayload,
  confirming,
  continuing,
  error,
  onConfirm,
  onKeepTalking,
}: {
  initialPayload: CoachPausePayload
  confirming: boolean
  continuing: boolean
  error?: string | null
  onConfirm: (payload: CoachPausePayload) => void
  onKeepTalking: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [topic, setTopic] = useState(initialPayload.topic_to_explore)
  const [takeaway, setTakeaway] = useState(initialPayload.takeaway)
  const busy = confirming || continuing
  const canConfirm = topic.trim().length > 0 && takeaway.trim().length > 0 && !busy

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || dialog.open) return
    dialog.showModal()
    return () => {
      if (dialog.open) dialog.close()
    }
  }, [])

  if (typeof document === 'undefined') return null

  return createPortal(
    <dialog
      ref={dialogRef}
      className="coach-pause-dialog m-0 max-h-none max-w-none p-0 text-[var(--coach-ink)]"
      aria-labelledby="coach-pause-title"
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onKeepTalking()
      }}
    >
      <div className="coach-scrollbar-none flex h-full min-h-0 flex-col overflow-y-auto px-5 pb-[max(67px,env(safe-area-inset-bottom))]">
        <span
          className="mx-auto mt-3 h-1 w-[60px] shrink-0 rounded-full bg-[var(--coach-sheet-handle)]"
          aria-hidden="true"
        />

        <CoachOrb size="pause" className="mx-auto mt-[69px] shrink-0" />
        <h2 id="coach-pause-title" className="mt-[38px] text-center text-base font-medium">
          A Good Place to Pause
        </h2>

        <div className="mx-[18px] mt-[70px] shrink-0">
          <label className="block">
            <span className="text-xs font-semibold text-[var(--coach-text-tertiary)]">
              TOPIC TO EXPLORE
            </span>
            <textarea
              autoFocus
              className="mt-3 min-h-12 w-full resize-none border-0 border-b border-[var(--coach-border-strong)] bg-transparent px-0 pb-3 text-lg font-medium leading-6 outline-none"
              maxLength={120}
              value={topic}
              disabled={busy}
              onChange={(event) => setTopic(event.target.value)}
              aria-invalid={!topic.trim() || undefined}
            />
          </label>
          <label className="mt-4 block">
            <span className="text-xs font-semibold text-[var(--coach-text-tertiary)]">
              TAKE AWAY
            </span>
            <textarea
              className="mt-2 min-h-[78px] w-full resize-none bg-transparent px-0 text-base leading-5 outline-none"
              maxLength={500}
              value={takeaway}
              disabled={busy}
              onChange={(event) => setTakeaway(event.target.value)}
              aria-invalid={!takeaway.trim() || undefined}
            />
          </label>
        </div>

        <div className="mx-[5px] mt-auto pt-8">
          {error ? (
            <p className="mb-3 text-center text-sm text-[var(--danger)]" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="button"
            className="h-[50px] w-full rounded-full bg-[var(--coach-surface)] text-base font-medium text-[var(--coach-ink)] shadow-[var(--coach-shadow)] transition-transform enabled:active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!canConfirm}
            onClick={() => onConfirm({ topic_to_explore: topic.trim(), takeaway: takeaway.trim() })}
          >
            {confirming ? 'Taking this with you…' : 'Into Your Day'}
          </button>
          <button
            type="button"
            className="mt-2 min-h-11 w-full rounded-full px-5 text-sm font-medium text-[var(--coach-text-tertiary)] transition-colors hover:text-[var(--coach-ink)] disabled:cursor-not-allowed disabled:opacity-45"
            disabled={busy}
            onClick={onKeepTalking}
          >
            {continuing ? 'Returning…' : 'Keep talking'}
          </button>
        </div>
      </div>
    </dialog>,
    document.body,
  )
}
