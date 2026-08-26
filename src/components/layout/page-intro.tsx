import type { ReactNode } from 'react'

interface PageIntroProps {
  eyebrow?: string
  title: string
  description: string
  action?: ReactNode
}

export function PageIntro({ eyebrow, title, description, action }: PageIntroProps) {
  return (
    <header className="flex flex-col gap-5 pb-8 pt-8 sm:flex-row sm:items-end sm:justify-between sm:pt-12">
      <div className="max-w-xl">
        {eyebrow ? (
          <p className="mb-2 text-xs font-semibold uppercase tracking-eyebrow text-primary">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-display text-3xl font-semibold tracking-[-0.035em] text-foreground">
          {title}
        </h1>
        <p className="mt-2 max-w-lg text-wrap-pretty text-sm leading-6 text-text-secondary">
          {description}
        </p>
      </div>
      {action}
    </header>
  )
}
