import { useState } from 'react'

import PromptBar from '@/components/ai/beautiful-ui/prompt-bar'

export function BeautifulPromptComposer() {
  const [notice, setNotice] = useState<string | null>(null)

  return (
    <div className="sticky bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom))] z-20 -mx-page mt-auto bg-background px-page pb-3 pt-4">
      <PromptBar
        tall
        placeholder="Write a message…"
        onSend={() => {
          setNotice('Chat transport will be connected after the backend protocol is confirmed.')
        }}
      />
      {notice ? (
        <p role="status" className="mt-2 text-center text-xs text-text-secondary">
          {notice}
        </p>
      ) : null}
    </div>
  )
}
