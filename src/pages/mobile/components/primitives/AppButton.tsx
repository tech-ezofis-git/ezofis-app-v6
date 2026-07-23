import type { ButtonHTMLAttributes, ReactNode } from 'react'
import cn from '@/utils/cn'

type AppButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline'

type AppButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: AppButtonVariant
  fullWidth?: boolean
  loading?: boolean
  leadingIcon?: ReactNode
  trailingIcon?: ReactNode
}

const variantClass: Record<AppButtonVariant, string> = {
  primary:
    'bg-accent-primary text-text-on-accent shadow-sm hover:opacity-90',
  secondary:
    'bg-surface-secondary text-text-primary border border-border-default hover:bg-surface-hover',
  ghost: 'bg-transparent text-text-secondary hover:bg-surface-hover',
  outline:
    'bg-surface-primary text-text-primary border border-border-default hover:bg-surface-hover',
}

export function AppButton({
  children,
  className,
  variant = 'primary',
  fullWidth,
  loading,
  leadingIcon,
  trailingIcon,
  type = 'button',
  disabled,
  ...rest
}: AppButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3.5 text-13 font-semibold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50',
        variantClass[variant],
        fullWidth && 'w-full',
        className,
      )}
      disabled={disabled || loading}
      type={type}
      {...rest}
    >
      {loading ? (
        <span className='size-4 animate-spin rounded-full border-2 border-current border-r-transparent' />
      ) : (
        leadingIcon
      )}
      {children}
      {!loading ? trailingIcon : null}
    </button>
  )
}
