import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  const { t } = useTranslation('common')
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-page text-center">
      <div>
        <p className="text-xs font-semibold uppercase tracking-eyebrow text-primary">404</p>
        <h1 className="mt-2 font-display text-2xl font-semibold">{t('notFound.title')}</h1>
        <p className="mt-2 text-sm text-text-secondary">{t('notFound.body')}</p>
        <Button asChild className="mt-6">
          <Link to="/chat">{t('notFound.openChat')}</Link>
        </Button>
      </div>
    </main>
  )
}
