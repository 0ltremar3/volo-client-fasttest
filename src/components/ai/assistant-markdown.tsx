import Markdown from 'markdown-to-jsx/react'

import { cn } from '@/lib/utils'

export function AssistantMarkdown({
  text,
  streaming = false,
  className,
}: {
  text: string
  streaming?: boolean
  className?: string
}) {
  return (
    <Markdown
      className={cn('assistant-markdown min-w-0 text-base font-medium leading-6', className)}
      options={{
        wrapper: 'div',
        forceWrapper: true,
        disableParsingRawHTML: true,
        optimizeForStreaming: streaming,
        overrides: {
          a: { props: { target: '_blank', rel: 'noopener noreferrer' } },
          img: { component: ({ alt }: { alt?: string }) => <span>{alt}</span> },
        },
      }}
    >
      {text}
    </Markdown>
  )
}
