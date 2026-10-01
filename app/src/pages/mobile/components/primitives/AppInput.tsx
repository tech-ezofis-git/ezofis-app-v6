import type { InputHTMLAttributes, ReactNode } from 'react'
import cn from '@/utils/cn'

type AppInputProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: string
  label?: string
  leadingIcon?: ReactNode
  trailing?: ReactNode
}

export function AppInput({
  className,
  error,
  id,
  label,
  leadingIcon,
  trailing,
  ...rest
}: AppInputProps) {
  const inputId = id || rest.name

  return (
    <label className='flex w-full flex-col gap-1.5'>
      {label ? (
        <span className='text-11 font-medium text-text-secondary'>{label}</span>
      ) : null}
      <div
        className={cn(
          'flex min-h-11 items-center gap-2 rounded-xl border border-border-default bg-surface-muted px-3 transition-all focus-within:border-border-focus focus-within:bg-surface-primary focus-within:ring-2 focus-within:ring-accent-soft',
          error && 'border-error-main',
        )}
      >
        {leadingIcon ? (
          <span className='text-text-muted'>{leadingIcon}</span>
        ) : null}
        <input
          id={inputId}
          className={cn(
            'min-w-0 flex-1 bg-transparent py-2 text-13 text-text-primary outline-none placeholder:text-text-muted',
            className,
          )}
          {...rest}
        />
        {trailing}
      </div>
      {error ? <span className='text-11 text-error-main'>{error}</span> : null}
    </label>
  )
}
