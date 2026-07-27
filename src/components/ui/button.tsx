import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'onGradient'
type Size = 'sm' | 'md' | 'icon' | 'iconSm'

const variantClasses: Record<Variant, string> = {
  primary: 'bg-accent text-white shadow-sm hover:bg-accent-strong focus-ring',
  secondary: 'bg-surface-3 text-ink hover:bg-line focus-ring',
  ghost: 'text-ink-2 hover:bg-surface-3 hover:text-ink focus-ring',
  danger: 'bg-danger/10 text-danger hover:bg-danger/20 focus-ring',
  onGradient: 'bg-black/25 text-white hover:bg-black/35 focus-ring-on-gradient',
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-2.5 text-[13px] gap-1.5',
  md: 'h-9 px-3.5 text-sm gap-2',
  icon: 'h-9 w-9',
  iconSm: 'h-7 w-7',
}

export interface ButtonProps extends ComponentProps<'button'> {
  variant?: Variant
  size?: Size
}

export function Button({ variant = 'secondary', size = 'md', className, type, ...props }: ButtonProps) {
  return (
    <button
      type={type ?? 'button'}
      className={cn(
        'inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  )
}
