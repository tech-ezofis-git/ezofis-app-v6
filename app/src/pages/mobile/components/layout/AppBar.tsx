import type { ButtonHTMLAttributes, ReactNode } from 'react'
import cn from '@/utils/cn'
import { Icon } from '../primitives/Icon'

type AppBarProps = {
  title: string
  subtitle?: ReactNode
  onBack?: () => void
  trailing?: ReactNode
  className?: string
}

export function AppBar({
  title,
  subtitle,
  onBack,
  trailing,
  className,
}: AppBarProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-20 border-b border-border-default bg-surface-primary/95 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 backdrop-blur',
        className,
      )}
    >
      <div className='flex min-h-9 items-center gap-1.5'>
        {onBack ? (
          <IconButton
            aria-label='Go back'
            className='-ml-1'
            onClick={onBack}
          >
            <Icon className='size-4' name='ChevronLeft' />
          </IconButton>
        ) : null}
        <div className='min-w-0 flex-1'>
          <h1 className='truncate text-14 font-semibold text-text-primary'>
            {title}
          </h1>
          {subtitle ? (
            <div className='mt-0.5 truncate text-11 text-text-muted'>
              {subtitle}
            </div>
          ) : null}
        </div>
        {trailing ? (
          <div className='flex shrink-0 items-center gap-0.5'>{trailing}</div>
        ) : null}
      </div>
    </header>
  )
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
}

export function IconButton({
  children,
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex size-9 items-center justify-center rounded-full text-text-secondary transition-all hover:bg-surface-hover active:scale-95',
        className,
      )}
      type={type}
      {...rest}
    >
      {children}
    </button>
  )
}
