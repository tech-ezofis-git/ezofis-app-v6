import type { ButtonHTMLAttributes, ReactNode } from 'react'
import cn from '@/utils/cn'

type AppButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  fullWidth?: boolean
  leadingIcon?: ReactNode
  loading?: boolean
  trailingIcon?: ReactNode
  variant?: AppButtonVariant
}

type AppButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline'

const variantClass: Record<AppButtonVariant, string> = {
  ghost: 'bg-transparent text-text-secondary hover:bg-surface-hover',
  outline:
    'bg-surface-primary text-text-primary border border-border-default hover:bg-surface-hover',
  primary: 'bg-accent-primary text-text-on-accent shadow-sm hover:opacity-90',
  secondary:
    'bg-surface-secondary text-text-primary border border-border-default hover:bg-surface-hover',
}

export function AppButton({
  children,
  className,
  disabled,
  fullWidth,
  leadingIcon,
  loading,
  trailingIcon,
  type = 'button',
  variant = 'primary',
  ...rest
}: AppButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      type={type}
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3.5 text-13 font-semibold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50',
        variantClass[variant],
        fullWidth && 'w-full',
        className,
      )}
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
