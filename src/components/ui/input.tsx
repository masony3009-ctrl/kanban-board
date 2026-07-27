import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'h-9 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-3 focus-ring',
        className,
      )}
      {...props}
    />
  )
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        'w-full resize-none rounded-md border border-line bg-surface px-3 py-2 text-sm leading-relaxed text-ink placeholder:text-ink-3 focus-ring',
        className,
      )}
      {...props}
    />
  )
}
