import { Copy, Trash2 } from 'lucide-react'

import { PageIntro } from '@/components/layout/page-intro'
import { Button } from '@/components/ui/button'

const debugFields = [
  ['API base URL', import.meta.env.VITE_API_BASE_URL || 'Same origin / not configured'],
  ['OpenAPI client', 'Not generated'],
  ['Auth protocol', 'Pending backend contract'],
  ['Streaming protocol', 'Out of scope for Phase 1'],
] as const

export function DebugPage() {
  return (
    <section>
      <PageIntro
        eyebrow="Internal"
        title="Debug"
        description="Request inspection will live here after real endpoints are connected. No credentials or sensitive values should be rendered."
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
          <span className="font-mono text-xs font-medium text-text-secondary">Response</span>
          <div className="flex gap-1">
            <Button type="button" variant="ghost" size="icon" disabled aria-label="Copy response">
              <Copy />
            </Button>
            <Button type="button" variant="ghost" size="icon" disabled aria-label="Clear response">
              <Trash2 />
            </Button>
          </div>
        </div>
        <pre className="min-h-40 overflow-x-auto p-4 font-mono text-xs leading-6 text-text-tertiary">
          {'// No request has been made.'}
        </pre>
      </div>
    </section>
  )
}
