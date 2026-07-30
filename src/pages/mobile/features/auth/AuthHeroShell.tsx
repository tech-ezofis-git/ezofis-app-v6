import type { ReactNode } from 'react'
import logoMark from '@/assets/logo/mark.png'
import cn from '@/utils/cn'
import { ScreenScroll, ScreenShell } from '../../components/layout/ScreenShell'
import { Icon } from '../../components/primitives/Icon'
import AiBrandIcon from '@/components/common/AiBrandIcon'

type AuthHeroShellProps = {
  children: ReactNode
  className?: string
  sheetClassName?: string
}

/** Gradient hero + bottom sheet layout matching the mobile auth mock. */
export function AuthHeroShell({
  children,
  className,
  sheetClassName,
}: AuthHeroShellProps) {
  return (
    <ScreenShell className={cn('max-w-none bg-transparent', className)}>
      <div className='relative flex min-h-0 flex-1 flex-col overflow-hidden'>
        <div
          className='absolute inset-0 bg-gradient-to-br from-[#7F56D9] via-[#5B8DEF] to-[#2DD4BF]'
          aria-hidden
        />

        <div className='relative z-10 flex shrink-0 flex-col gap-4 px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-8'>
          <div className='flex items-center gap-1.5'>
            <img
              alt=''
              className='size-7 brightness-0 invert'
              src={logoMark}
            />
            <span className='text-[22px] font-semibold tracking-tight text-white'>
              ezofis
            </span>
          </div>

          <div className='inline-flex w-fit max-w-full items-center gap-2 rounded-xl bg-white/15 px-2.5 py-2 backdrop-blur-sm'>
            <span className='inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/20 text-white'>
              <AiBrandIcon className='size-4' variant='curved-purple' />
            </span>
            <span className='pr-1 text-12 font-medium leading-snug text-white'>
              AI-enhanced document management
            </span>
          </div>
        </div>

        <div
          className={cn(
            'relative z-10 flex min-h-0 flex-1 flex-col rounded-t-[28px] bg-surface-primary shadow-[0_-8px_32px_rgba(15,23,42,0.12)]',
            sheetClassName,
          )}
        >
          <ScreenScroll className='px-5 pt-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]'>
            {children}
          </ScreenScroll>
        </div>
      </div>
    </ScreenShell>
  )
}

export function AuthUserAvatar() {
  return (
    <div className='mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-surface-muted text-text-muted'>
      <Icon className='size-7' name='User' />
    </div>
  )
}

export function GoogleMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={cn('size-4', className)}
      viewBox='0 0 24 24'
    >
      <path
        d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
        fill='#4285F4'
      />
      <path
        d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
        fill='#34A853'
      />
      <path
        d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
        fill='#FBBC05'
      />
      <path
        d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
        fill='#EA4335'
      />
    </svg>
  )
}

export function MicrosoftMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={cn('size-4', className)}
      viewBox='0 0 23 23'
    >
      <path d='M1 1h10v10H1z' fill='#F25022' />
      <path d='M12 1h10v10H12z' fill='#7FBA00' />
      <path d='M1 12h10v10H1z' fill='#00A4EF' />
      <path d='M12 12h10v10H12z' fill='#FFB900' />
    </svg>
  )
}
