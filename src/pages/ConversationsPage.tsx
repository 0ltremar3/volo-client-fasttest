import { History } from 'lucide-react'

import { EmptyState } from '@/components/layout/empty-state'
import { PageIntro } from '@/components/layout/page-intro'

export function ConversationsPage() {
  return (
    <section>
      <PageIntro
        title="Conversations"
        description="Resume and manage previous conversations when the backend endpoints are available."
      />
      <EmptyState
        icon={History}
        title="No conversations loaded"
        description="List, pagination, rename, and delete actions will only be added for capabilities present in OpenAPI."
      />
    </section>
  )
}
