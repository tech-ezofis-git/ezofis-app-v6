import type { HTMLAttributes, ReactNode } from 'react'
import cn from '@/utils/cn'

type ScreenShellProps = HTMLAttributes<HTMLDivElement> & {
  header?: ReactNode
  footer?: ReactNode
  children: ReactNode
}

/**
 * Fixed mobile chrome: header + footer stay put.
 * Children fill the middle and should own their own scroll region.
 */
export function ScreenShell({
  header,
  footer,
  children,
  className,
  ...rest
}: ScreenShellProps) {
  return (
    <div
      className={cn(
        'flex h-dvh max-h-dvh w-full max-w-md flex-col overflow-hidden bg-surface-secondary text-text-primary',
        className,
      )}
      {...rest}
    >
      {header ? <div className='shrink-0'>{header}</div> : null}
      <main className='flex min-h-0 flex-1 flex-col overflow-hidden'>
        {children}
      </main>
      {footer ? <div className='shrink-0'>{footer}</div> : null}
    </div>
  )
}

/** Scrollable middle region for lists / long content. */
export function ScreenScroll({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain',
        className,
      )}
    >
      {children}
    </div>
  )
}
