import { MessageCircle } from 'lucide-react'

import { BeautifulPromptComposer } from '@/components/ai/beautiful-prompt-composer'

export function ChatPage() {
  return (
    <section className="flex min-h-[calc(100dvh-var(--header-height)-var(--bottom-nav-height)-env(safe-area-inset-top)-env(safe-area-inset-bottom))] flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
        <span className="mb-5 grid size-12 place-items-center rounded-xl bg-primary-muted text-primary">
          <MessageCircle className="size-5" aria-hidden="true" />
        </span>
        <h1 className="font-display text-2xl font-semibold tracking-[-0.03em]">
          Start a conversation
        </h1>
        <p className="mt-2 max-w-xs text-wrap-pretty text-sm text-text-secondary">
          The message list, thinking state, streaming text, errors, and stop control will share this
          surface once the real protocol is known.
        </p>
      </div>
      <BeautifulPromptComposer />
    </section>
  )
}
