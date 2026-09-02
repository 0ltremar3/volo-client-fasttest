import { Copy, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { PageIntro } from '@/components/layout/page-intro'
import { Button } from '@/components/ui/button'

export function DebugPage() {
  const { t } = useTranslation('common')
  const debugFields = [
    [t('debug.apiBaseUrl'), import.meta.env.VITE_API_BASE_URL || t('debug.apiBaseUrlEmpty')],
    [t('debug.openapiClient'), t('debug.openapiClientValue')],
    [t('debug.authProtocol'), t('debug.authProtocolValue')],
    [t('debug.streamingProtocol'), t('debug.streamingProtocolValue')],
  ] as const

  return (
    <section>
      <PageIntro
        eyebrow={t('debug.eyebrow')}
        title={t('debug.title')}
        description={t('debug.description')}
      />

      <dl className="divide-y divide-border-subtle border-y border-border-subtle">
        {debugFields.map(([label, value]) => (
          <div key={label} className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr] sm:gap-5">
            <dt className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
              {label}
            </dt>
            <dd className="min-w-0 break-words font-mono text-xs text-text-secondary">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 overflow-hidden rounded-lg border border-border bg-surface">
        <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-2.5">
          <span className="font-mono text-xs font-medium text-text-secondary">
            {t('debug.response')}
          </span>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled
              aria-label={t('debug.copyResponse')}
            >
              <Copy />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled
              aria-label={t('debug.clearResponse')}
            >
              <Trash2 />
            </Button>
          </div>
        </div>
        <pre className="min-h-40 overflow-x-auto p-4 font-mono text-xs leading-6 text-text-tertiary">
          {t('debug.noRequest')}
        </pre>
      </div>
    </section>
  )
}
