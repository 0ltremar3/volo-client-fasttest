import type { InputHTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

export function Input({ className, type, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        'flex min-h-touch w-full rounded-lg border border-input bg-surface px-3.5 py-2 text-base text-foreground shadow-none transition-[border-color,box-shadow] placeholder:text-text-tertiary focus-visible:border-primary focus-visible:shadow-[var(--shadow-focus)] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        className,
      )}
      {...props}
    />
  )
}
