import type { HTMLAttributes } from 'react'
import cn from '@/utils/cn'

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone
}

type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'error'

const toneClass: Record<BadgeTone, string> = {
  accent: 'bg-accent-soft text-accent-primary border-transparent',
  error: 'bg-red-3 text-error-main border-transparent',
  neutral: 'bg-surface-muted text-text-secondary border-border-default',
  success: 'bg-success-subtle text-success-main border-transparent',
  warning: 'bg-orange-3 text-warning-main border-transparent',
}

export function Badge({
  children,
  className,
  tone = 'neutral',
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1 truncate rounded-full border px-2 py-0.5 text-11 font-semibold',
        toneClass[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  )
}
