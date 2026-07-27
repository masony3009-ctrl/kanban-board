import { Loader2 } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-ink/8 dark:bg-white/10', className)}
      {...props}
    />
  )
}

export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={cn('animate-spin', className)} aria-hidden />
}

export function LabelPill({
  name,
  color,
  className,
}: {
  name: string
  color: string
  className?: string
}) {
  return (
    <span
      style={{ backgroundColor: color }}
      className={cn(
        'inline-flex h-[18px] max-w-full items-center truncate rounded-sm px-1.5 text-[11px] leading-none font-semibold text-white select-none',
        className,
      )}
    >
      {name}
    </span>
  )
}
