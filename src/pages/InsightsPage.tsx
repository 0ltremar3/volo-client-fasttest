import { BarChart3 } from 'lucide-react'

import { EmptyState } from '@/components/layout/empty-state'
import { PageIntro } from '@/components/layout/page-intro'

export function InsightsPage() {
  return (
    <section>
      <PageIntro
        title="Insights"
        description="A narrow-screen-first home for core metrics, trends, themes, and usage statistics."
      />
      <EmptyState
        icon={BarChart3}
        title="No insight data connected"
        description="Charts and metric components will be introduced only when real data makes them useful."
      />
    </section>
  )
}
