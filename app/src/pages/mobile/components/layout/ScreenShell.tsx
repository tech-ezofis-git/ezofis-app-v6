import type { HTMLAttributes, ReactNode, Ref, UIEventHandler } from 'react'
import cn from '@/utils/cn'

type ScreenShellProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
  footer?: ReactNode
  header?: ReactNode
}

/** Scrollable middle region for lists / long content. */
export function ScreenScroll({
  children,
  className,
  scrollRef,
  onScroll,
}: {
  children: ReactNode
  className?: string
  onScroll?: UIEventHandler<HTMLDivElement>
  scrollRef?: Ref<HTMLDivElement>
}) {
  return (
    <div
      ref={scrollRef}
      className={cn(
        'no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain',
        className,
      )}
      onScroll={onScroll}
    >
      {children}
    </div>
  )
}

/**
 * Fixed mobile chrome: header + footer stay put.
 * Children fill the middle and should own their own scroll region.
 */
export function ScreenShell({
  children,
  className,
  footer,
  header,
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
