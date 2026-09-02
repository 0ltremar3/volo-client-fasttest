import { ChevronDown, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CoachOrb } from '@/features/coach/coach-orb'
import { formatEchoScheduleTime, type EchoSchedule } from '@/features/daily/daily-model'
import { currentAppLocale } from '@/i18n'
import { cn } from '@/lib/utils'

type EchoSettingsSheetProps = {
  open: boolean
  value: EchoSchedule
  onClose: () => void
  onSave: (value: EchoSchedule) => void
}

const hours = Array.from({ length: 12 }, (_, index) => String(index + 1))
const minutes = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']

function toTimeParts(value: string) {
  const [hourValue = '0', minute = '00'] = value.split(':')
  const hour24 = Number(hourValue)
  return { hour: String(hour24 % 12 || 12), minute, period: hour24 >= 12 ? 'PM' : 'AM' }
}

function fromTimeParts(hour: string, minute: string, period: string) {
  const hour12 = Number(hour)
  const hour24 = period === 'PM' ? (hour12 % 12) + 12 : hour12 % 12
  return `${String(hour24).padStart(2, '0')}:${minute}`
}

export function EchoSettingsSheet({ open, value, onClose, onSave }: EchoSettingsSheetProps) {
  const { t, i18n } = useTranslation('daily')
  const locale = currentAppLocale(i18n.language)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [draft, setDraft] = useState(value)
  const [timeOpen, setTimeOpen] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      setDraft(value)
      setTimeOpen(false)
      dialog.showModal()
    }
    if (!open && dialog.open) dialog.close()
  }, [open, value])

  const parts = toTimeParts(draft.time)
  function updateTime(next: Partial<typeof parts>) {
    const merged = { ...parts, ...next }
    setDraft((current) => ({
      ...current,
      time: fromTimeParts(merged.hour, merged.minute, merged.period),
    }))
  }

  return (
    <dialog
      ref={dialogRef}
      className="echo-settings-dialog m-0 max-h-none max-w-none p-0 text-[var(--coach-ink)]"
      aria-labelledby="echo-settings-title"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClose={onClose}
    >
      <form
        method="dialog"
        className="safe-bottom flex h-full min-h-0 flex-col"
        onSubmit={(event) => {
          event.preventDefault()
          onSave(draft)
        }}
      >
        <div className="relative flex h-[91px] shrink-0 items-center justify-center px-16">
          <span className="absolute left-1/2 top-3 h-1 w-[60px] -translate-x-1/2 rounded-full bg-[var(--coach-border)]" />
          <button
            type="button"
            onClick={onClose}
            className="absolute left-5 top-7 grid size-11 place-items-center rounded-full"
            aria-label={t('echo.cancelSettings')}
          >
            <X className="size-5" />
          </button>
          <h2 id="echo-settings-title" className="text-base font-medium">
            {t('echo.title')}
          </h2>
          <button
            type="submit"
            className="absolute right-5 top-7 min-h-11 rounded-full px-3 text-sm font-semibold text-[var(--coach-accent)]"
          >
            {t('actions.save', { ns: 'common' })}
          </button>
        </div>

        <CoachOrb className="mx-auto mt-[17px] shrink-0" />
        <p className="mx-auto mt-5 max-w-[18rem] text-center text-sm leading-6 text-[var(--coach-text-secondary)]">
          {t('echo.blurb')}
        </p>

        <div className="mx-5 mt-10 divide-y divide-[var(--coach-border)] px-4">
          <div className="relative flex min-h-[70px] items-center justify-between gap-4">
            <span className="text-base font-medium">{t('echo.time')}</span>
            <button
              type="button"
              aria-expanded={timeOpen}
              onClick={() => setTimeOpen((current) => !current)}
              className="echo-settings-chip"
            >
              {formatEchoScheduleTime(draft.time, locale)} <ChevronDown className="size-3.5" />
            </button>
            {timeOpen ? (
              <div className="echo-settings-popup absolute right-0 top-[50px] z-30 flex min-w-[210px] items-center gap-1.5 p-2">
                <select
                  aria-label={t('echo.hour')}
                  value={parts.hour}
                  onChange={(event) => updateTime({ hour: event.target.value })}
                  className="h-11 rounded-full bg-[var(--echo-settings-selection)] px-3"
                >
                  {hours.map((hour) => (
                    <option key={hour}>{hour}</option>
                  ))}
                </select>
                <span>:</span>
                <select
                  aria-label={t('echo.minute')}
                  value={parts.minute}
                  onChange={(event) => updateTime({ minute: event.target.value })}
                  className="h-11 rounded-full bg-[var(--echo-settings-selection)] px-3"
                >
                  {minutes.map((minute) => (
                    <option key={minute}>{minute}</option>
                  ))}
                </select>
                <select
                  aria-label={t('echo.period')}
                  value={parts.period}
                  onChange={(event) => updateTime({ period: event.target.value })}
                  className="h-11 rounded-full bg-[var(--echo-settings-selection)] px-3"
                >
                  <option value="AM">{t('echo.am')}</option>
                  <option value="PM">{t('echo.pm')}</option>
                </select>
              </div>
            ) : null}
          </div>

          <div className="flex min-h-[70px] items-center justify-between gap-4">
            <span className="text-base font-medium">{t('echo.dailyReminder')}</span>
            <button
              type="button"
              role="switch"
              aria-checked={draft.alarm}
              onClick={() => setDraft((current) => ({ ...current, alarm: !current.alarm }))}
              className="relative h-11 w-20 rounded-full focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span
                className={cn(
                  'absolute inset-x-0 top-[7px] h-[30px] rounded-full transition-colors',
                  draft.alarm ? 'bg-[var(--coach-accent)]' : 'bg-[var(--coach-border)]',
                )}
              />
              <span
                className={cn(
                  'absolute left-0.5 top-[9px] size-[26px] rounded-full bg-white transition-transform',
                  draft.alarm && 'translate-x-12',
                )}
              />
              <span className="sr-only">
                {draft.alarm ? t('echo.reminderOn') : t('echo.reminderOff')}
              </span>
            </button>
          </div>
        </div>

        <p className="mx-auto mt-auto max-w-[18rem] px-5 pb-6 text-center text-xs leading-5 text-[var(--coach-text-tertiary)]">
          {t('echo.planNote')}
        </p>
      </form>
    </dialog>
  )
}
