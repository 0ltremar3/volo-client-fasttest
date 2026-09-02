import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { currentAppLocale, setAppLocale } from '@/i18n'
import { cn } from '@/lib/utils'
import type { AppLocale } from '@/lib/locale'

type LanguageToggleProps = {
  variant?: 'compact' | 'segmented'
  className?: string
}

export function LanguageToggle({ variant = 'compact', className }: LanguageToggleProps) {
  const { t, i18n } = useTranslation('common')
  const locale = currentAppLocale(i18n.language)

  async function select(next: AppLocale) {
    if (next === locale) return
    await setAppLocale(next)
  }

  if (variant === 'segmented') {
    return (
      <div
        className={cn('grid grid-cols-2 rounded-full bg-[var(--account-surface)] p-1', className)}
        role="group"
        aria-label={t('language.label')}
      >
        <LanguageOption
          selected={locale === 'en'}
          label={t('language.en')}
          onSelect={() => void select('en')}
        />
        <LanguageOption
          selected={locale === 'zh'}
          label={t('language.zh')}
          onSelect={() => void select('zh')}
        />
      </div>
    )
  }

  const nextLocale: AppLocale = locale === 'en' ? 'zh' : 'en'
  return (
    <Button
      type="button"
      variant="ghost"
      className={cn('min-w-touch px-3 text-sm font-semibold', className)}
      onClick={() => void select(nextLocale)}
      aria-label={nextLocale === 'zh' ? t('language.switchToZh') : t('language.switchToEn')}
    >
      {nextLocale === 'zh' ? '中' : 'EN'}
    </Button>
  )
}

function LanguageOption({
  selected,
  label,
  onSelect,
}: {
  selected: boolean
  label: string
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        'min-h-11 rounded-full text-sm font-medium transition-colors',
        selected
          ? 'bg-[var(--coach-surface-glass-strong)] text-[var(--coach-ink)] shadow-sm'
          : 'text-[var(--coach-text-secondary)]',
      )}
    >
      {label}
    </button>
  )
}
