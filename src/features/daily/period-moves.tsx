import { Check, ChevronDown, Pencil } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

import { MoveCardSurface } from '@/components/cards/move-card-surface'
import { Input } from '@/components/ui/input'
import type { RepeatRule } from '@/api/volo'
import { buildMoveScheduleRule } from '@/features/coach/coach-model'
import { getPeriodMoveStatusLabel, type PeriodMoveStatus } from '@/features/daily/daily-model'
import { currentAppLocale } from '@/i18n'
import { cn } from '@/lib/utils'

export type { PeriodMoveStatus } from '@/features/daily/daily-model'

export type PeriodMoveItem = {
  id: string
  schedule: string
  text: string
  source: string
  dueLabel: string
  status: PeriodMoveStatus
  scheduleValue: {
    startLocalDate: string
    localTime: string
    rule: RepeatRule
    alarmEnabled: boolean
  }
}

type PeriodMovesProps = {
  items: PeriodMoveItem[]
  onStatusChange: (
    item: PeriodMoveItem,
    status: Exclude<PeriodMoveStatus, null>,
  ) => Promise<void> | void
  onRethink: (item: PeriodMoveItem) => Promise<void> | void
  onScheduleChange: (
    item: PeriodMoveItem,
    schedule: PeriodMoveItem['scheduleValue'],
  ) => Promise<void> | void
  onDelete: (item: PeriodMoveItem) => Promise<void> | void
  onFindMove: () => void
}

const selectableStatuses = ['progressing', 'stuck'] as const
const isoWeekdayLetters = {
  en: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
  zh: ['一', '二', '三', '四', '五', '六', '日'],
} as const

export function PeriodMoves({
  items,
  onStatusChange,
  onRethink,
  onScheduleChange,
  onDelete,
  onFindMove,
}: PeriodMovesProps) {
  const { t, i18n } = useTranslation('daily')
  const locale = currentAppLocale(i18n.language)
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
          {t('moves.title')}
        </h2>
        <button
          ref={collapseButtonRef}
          type="button"
          className="grid size-11 place-items-center rounded-full text-[var(--coach-text-secondary)] transition-colors hover:text-[var(--coach-ink)]"
          aria-expanded={expanded}
          aria-controls={contentId}
          aria-label={expanded ? t('moves.collapse') : t('moves.expand')}
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
                actionLabel={t('moves.checkInAria', {
                  text: item.text,
                  status: getPeriodMoveStatusLabel(item.status, locale),
                })}
                onAction={(event) => {
                  triggerRef.current = event.currentTarget
                  setError(null)
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
                        item.status === null &&
                          'bg-[var(--coach-surface-muted)] text-[var(--coach-text-secondary)]',
                      )}
                    >
                      {getPeriodMoveStatusLabel(item.status, locale)}
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
              {t('moves.emptyTitle')}
            </p>
            <p className="mx-auto mt-1 max-w-[18rem] text-sm leading-5 text-[var(--coach-text-tertiary)]">
              {t('moves.emptyBody')}
            </p>
            <button
              type="button"
              onClick={onFindMove}
              className="mt-3 min-h-11 w-full rounded-full bg-[var(--coach-surface-glass-strong)] px-5 text-sm font-medium shadow-[var(--coach-shadow)] transition-transform active:scale-[0.97]"
            >
              {t('moves.find')}
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
            await run(() => onStatusChange(activeItem, status), t('moves.statusError'))
          }}
          onRethink={async () => {
            await run(() => onRethink(activeItem), t('moves.rethinkError'))
          }}
          onScheduleChange={async (schedule) =>
            run(() => onScheduleChange(activeItem, schedule), t('moves.scheduleError'))
          }
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
            const deleted = await run(() => onDelete(deleteItem), t('moves.deleteError'))
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
  onScheduleChange,
  onDelete,
}: {
  item: PeriodMoveItem
  pending: boolean
  error: string | null
  onClose: () => void
  onStatusChange: (status: Exclude<PeriodMoveStatus, null>) => Promise<void>
  onRethink: () => Promise<void>
  onScheduleChange: (schedule: PeriodMoveItem['scheduleValue']) => Promise<boolean>
  onDelete: () => void
}) {
  const { t } = useTranslation('daily')
  const dialogRef = useRef<HTMLDialogElement>(null)
  const editButtonRef = useRef<HTMLButtonElement>(null)
  const [scheduleOpen, setScheduleOpen] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || dialog.open) return
    dialog.showModal()
  }, [])

  if (typeof document === 'undefined') return null

  return (
    <>
      {createPortal(
        <dialog
          ref={dialogRef}
          className="move-status-dialog m-0 max-h-none max-w-none p-0 text-[var(--coach-ink)]"
          aria-labelledby="move-status-title"
          onClose={onClose}
          onCancel={(event) => {
            event.preventDefault()
            if (scheduleOpen || pending) return
            dialogRef.current?.close()
          }}
        >
          <div className="safe-bottom flex h-full flex-col overflow-y-auto px-5 pb-5">
            <span
              className="mx-auto mt-3 h-1 w-[60px] rounded-full bg-[var(--coach-sheet-handle)]"
              aria-hidden="true"
            />
            <div className="mt-5 flex min-h-11 items-center justify-between gap-2">
              <p className="text-base font-semibold">{t('moves.checkInTitle')}</p>
              <div className="flex items-center">
                <button
                  ref={editButtonRef}
                  type="button"
                  aria-label={t('moves.editSchedule')}
                  aria-haspopup="dialog"
                  aria-expanded={scheduleOpen}
                  disabled={pending}
                  onClick={() => setScheduleOpen(true)}
                  className="grid size-11 place-items-center rounded-full text-[var(--coach-text-secondary)] transition-colors hover:text-[var(--coach-ink)] disabled:opacity-45"
                >
                  <Pencil className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => dialogRef.current?.close()}
                  disabled={pending || scheduleOpen}
                  className="min-h-11 rounded-full bg-[var(--coach-surface-glass-strong)] px-4 text-sm font-medium shadow-[var(--coach-shadow)] disabled:opacity-45"
                >
                  {t('actions.done', { ns: 'common' })}
                </button>
              </div>
            </div>
            <h2
              id="move-status-title"
              className="mt-2 font-display text-[28px] font-medium leading-9"
            >
              {t('moves.howGoing')}
            </h2>
            <p className="mt-1 text-sm leading-5 text-[var(--coach-text-secondary)]">
              {t('moves.chooseBest')}
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
                      <span className="block text-base font-semibold">
                        {status === 'progressing' ? t('moves.onTrack') : t('moves.drifting')}
                      </span>
                      <span
                        className={cn(
                          'mt-0.5 block text-xs',
                          selected
                            ? 'text-current opacity-85'
                            : 'text-[var(--coach-text-tertiary)]',
                        )}
                      >
                        {status === 'progressing'
                          ? t('moves.onTrackDescription')
                          : t('moves.driftingDescription')}
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
              {pending ? t('moves.updating') : t('moves.needsRethink')}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={onDelete}
              className="mt-2 min-h-11 w-full rounded-full px-5 text-sm text-[var(--coach-text-tertiary)] disabled:opacity-45"
            >
              {t('moves.deleteMove')}
            </button>
            {error && !scheduleOpen ? (
              <p className="mt-1 text-center text-sm text-[var(--danger)]" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </dialog>,
        document.body,
      )}
      {scheduleOpen ? (
        <MoveScheduleDialog
          item={item}
          pending={pending}
          error={error}
          onClose={() => {
            setScheduleOpen(false)
            window.setTimeout(() => editButtonRef.current?.focus(), 50)
          }}
          onSave={onScheduleChange}
        />
      ) : null}
    </>
  )
}

function MoveScheduleDialog({
  item,
  pending,
  error,
  onClose,
  onSave,
}: {
  item: PeriodMoveItem
  pending: boolean
  error: string | null
  onClose: () => void
  onSave: (schedule: PeriodMoveItem['scheduleValue']) => Promise<boolean>
}) {
  const { t, i18n } = useTranslation('daily')
  const locale = currentAppLocale(i18n.language)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [schedule, setSchedule] = useState(item.scheduleValue)
  const canConfirm = Boolean(schedule.startLocalDate && schedule.localTime)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || dialog.open) return
    dialog.showModal()
  }, [])

  async function confirmAndClose() {
    if (pending || !canConfirm) return
    if (JSON.stringify(schedule) === JSON.stringify(item.scheduleValue)) {
      dialogRef.current?.close()
      return
    }
    const saved = await onSave(schedule)
    if (saved) dialogRef.current?.close()
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <dialog
      ref={dialogRef}
      className="move-schedule-dialog m-0 max-h-none max-w-none p-0 text-[var(--coach-ink)]"
      aria-labelledby="move-schedule-title"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault()
        if (!pending) dialogRef.current?.close()
      }}
    >
      <div className="safe-bottom flex h-full flex-col overflow-y-auto px-5 pb-5">
        <span
          className="mx-auto mt-3 h-1 w-[60px] rounded-full bg-[var(--coach-sheet-handle)]"
          aria-hidden="true"
        />
        <div className="mt-5 flex min-h-11 items-center justify-between">
          <h2 id="move-schedule-title" className="text-base font-semibold">
            {t('moves.schedule')}
          </h2>
          <button
            type="button"
            onClick={() => void confirmAndClose()}
            disabled={pending || !canConfirm}
            className="min-h-11 rounded-full bg-[var(--coach-surface-glass-strong)] px-4 text-sm font-medium shadow-[var(--coach-shadow)] disabled:opacity-45"
          >
            {pending ? t('moves.saving') : t('actions.done', { ns: 'common' })}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-xs font-medium text-[var(--coach-text-secondary)]">
            {t('moves.date')}
            <Input
              type="date"
              className="mt-1 bg-[var(--coach-surface-glass)]"
              value={schedule.startLocalDate}
              disabled={pending}
              onChange={(event) =>
                setSchedule((current) => ({
                  ...current,
                  startLocalDate: event.target.value,
                  rule: buildMoveScheduleRule(
                    current.rule.frequency,
                    new Date(`${event.target.value}T00:00:00`),
                    current.rule,
                  ),
                }))
              }
            />
          </label>
          <label className="text-xs font-medium text-[var(--coach-text-secondary)]">
            {t('moves.time')}
            <Input
              type="time"
              className="mt-1 bg-[var(--coach-surface-glass)]"
              value={schedule.localTime}
              disabled={pending}
              onChange={(event) =>
                setSchedule((current) => ({ ...current, localTime: event.target.value }))
              }
            />
          </label>
        </div>
        <label className="mt-3 block text-xs font-medium text-[var(--coach-text-secondary)]">
          {t('moves.repeat')}
          <select
            className="mt-1 min-h-11 w-full rounded-lg border border-[var(--coach-border)] bg-[var(--coach-surface-glass)] px-3 text-sm text-[var(--coach-ink)]"
            value={schedule.rule.frequency}
            disabled={pending}
            onChange={(event) =>
              setSchedule((current) => ({
                ...current,
                rule: buildMoveScheduleRule(
                  event.target.value as RepeatRule['frequency'],
                  new Date(`${current.startLocalDate}T00:00:00`),
                  current.rule,
                ),
              }))
            }
          >
            <option value="none">{t('moves.noRepeat')}</option>
            <option value="daily">{t('moves.daily')}</option>
            <option value="weekly">{t('moves.weekly')}</option>
            <option value="monthly">{t('moves.monthly')}</option>
          </select>
        </label>
        {schedule.rule.frequency === 'weekly' ? (
          <div className="mt-3">
            <p className="text-xs font-medium text-[var(--coach-text-secondary)]">
              {t('moves.weekdays')}
            </p>
            <div
              className="mt-1 grid grid-cols-7 gap-1"
              role="group"
              aria-label={t('moves.weekdays')}
            >
              {isoWeekdayLetters[locale].map((label, index) => {
                const day = index + 1
                const selected =
                  schedule.rule.frequency === 'weekly' && schedule.rule.weekdays.includes(day)
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={selected}
                    disabled={pending}
                    className={cn(
                      'aspect-square rounded-md text-xs font-semibold',
                      selected
                        ? 'bg-[var(--coach-accent)] text-white'
                        : 'bg-[var(--coach-surface-glass)] text-[var(--coach-text-secondary)]',
                    )}
                    onClick={() =>
                      setSchedule((current) => {
                        if (current.rule.frequency !== 'weekly') return current
                        const weekdays = current.rule.weekdays.includes(day)
                          ? current.rule.weekdays.filter((value) => value !== day)
                          : [...current.rule.weekdays, day].sort()
                        return weekdays.length
                          ? { ...current, rule: { frequency: 'weekly', weekdays } }
                          : current
                      })
                    }
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}
        {schedule.rule.frequency === 'monthly' ? (
          <label className="mt-3 block text-xs font-medium text-[var(--coach-text-secondary)]">
            {t('moves.dayOfMonth')}
            <Input
              type="number"
              min={1}
              max={31}
              className="mt-1 bg-[var(--coach-surface-glass)]"
              value={schedule.rule.day}
              disabled={pending}
              onChange={(event) => {
                const day = Math.min(31, Math.max(1, Number(event.target.value)))
                setSchedule((current) => ({
                  ...current,
                  rule: { frequency: 'monthly', day },
                }))
              }}
            />
          </label>
        ) : null}
        <label className="mt-3 flex min-h-11 items-center gap-3 text-sm font-medium">
          <input
            type="checkbox"
            className="size-5 accent-[var(--coach-accent)]"
            checked={schedule.alarmEnabled}
            disabled={pending}
            onChange={(event) =>
              setSchedule((current) => ({ ...current, alarmEnabled: event.target.checked }))
            }
          />
          {t('moves.alarm')}
        </label>
        {error ? (
          <p className="mt-auto pt-4 text-center text-sm text-[var(--danger)]" role="alert">
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
  const { t } = useTranslation('daily')
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
          {t('moves.deleteTitle')}
        </h2>
        <p className="mt-1 text-sm text-[var(--coach-text-secondary)]">{t('moves.deleteBody')}</p>
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
          {t('actions.cancel', { ns: 'common' })}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => void onConfirm()}
          className="min-h-12 text-sm font-medium text-[var(--danger)] disabled:opacity-45"
        >
          {pending ? t('moves.deleting') : t('actions.delete', { ns: 'common' })}
        </button>
      </div>
    </dialog>,
    document.body,
  )
}
