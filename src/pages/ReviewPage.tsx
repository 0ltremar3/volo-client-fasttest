import { NotebookText } from 'lucide-react'

import { EmptyState } from '@/components/layout/empty-state'
import { PageIntro } from '@/components/layout/page-intro'

export function ReviewPage() {
  return (
    <section>
      <PageIntro
        title="Review"
        description="A calm, vertical reading surface for summaries, reflections, highlights, and follow-up."
      />
      <EmptyState
        icon={NotebookText}
        title="Review content will appear here"
        description="The layout stays domain-neutral until the real review contract defines what is available."
      />
    </section>
  )
}
