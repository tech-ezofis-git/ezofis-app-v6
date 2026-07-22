import type { ReactNode } from 'react'
import { useLocation } from '@tanstack/react-router'
import { useIsMobile } from '@/pages/mobile'
import AuthFooter from './components/AuthFooter'
import AuthHeader from './components/AuthHeader'
import Features from './components/Features'
import Hero from './components/hero/Hero'

interface Props {
  children?: ReactNode
}

const AuthLayout = ({ children }: Props) => {
  const location = useLocation()
  const isMobile = useIsMobile()
  const isResetPassword =
    location.pathname.replace(/\/$/, '') === '/reset-password'

  if (isMobile) {
    return (
      <div className='h-dvh overflow-hidden bg-surface-primary'>
        {children}
      </div>
    )
  }

  return (
    <div
      className={
        isResetPassword
          ? 'block min-h-svh bg-surface'
          : 'grid min-h-svh grid-cols-1 xl:grid-cols-2'
      }
    >
      <div className='relative bg-surface p-6'>
        <AuthHeader />
        <div
          className='flex items-center justify-center py-10 xl:py-24'
          style={{ minHeight: 'calc(100dvh - 120px)' }}
        >
          <div className={isResetPassword ? 'w-120' : 'w-105'}>{children}</div>
        </div>
        <AuthFooter />
      </div>

      {!isResetPassword && (
        <div className='col-span-1 hidden items-center justify-center bg-surface-muted p-6 xl:flex'>
          <div className='flex size-full w-124 flex-col items-center justify-center'>
            <Hero />
            <Features />
          </div>
        </div>
      )}
    </div>
  )
}

AuthLayout.displayName = 'AuthLayout'
export default AuthLayout
