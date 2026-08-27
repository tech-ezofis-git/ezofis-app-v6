import type { ReactNode } from 'react'
import { useLocation, useSearch } from '@tanstack/react-router'
import { useIsMobile } from '@/pages/mobile'
import {
  useWhiteLabelDocumentTitle,
  WHITE_LABEL_TITLES,
} from '@/utils/whiteLabel'
import AuthFooter from './components/AuthFooter'
import AuthHeader from './components/AuthHeader'
import Features from './components/Features'
import Hero from './components/hero/Hero'

interface Props {
  children?: ReactNode
}

const AuthLayout = ({ children }: Props) => {
  const location = useLocation()
  const search: Record<string, unknown> = useSearch({ strict: false }) as any
  const isMobile = useIsMobile()
  const pathname = location.pathname.replace(/\/$/, '')
  const isResetPassword =
    pathname === '/reset-password' || pathname === '/setup'

  useWhiteLabelDocumentTitle(WHITE_LABEL_TITLES[pathname] ?? 'Account')

  const shareToken =
    typeof search?.shareToken === 'string' ? search.shareToken : ''
  const inviteToken =
    typeof search?.inviteToken === 'string' ? search.inviteToken : ''
  const redirect =
    typeof search?.redirect === 'string'
      ? search.redirect
      : typeof search?.redirectTo === 'string'
        ? search.redirectTo
        : ''

  // Share + sign-request flows: centered form only (no marketing Hero).
  // Plain /sign-in keeps the two-column AuthLayout.
  const isCenteredAuth =
    isResetPassword ||
    Boolean(shareToken) ||
    Boolean(inviteToken) ||
    redirect.includes('/sign-request/')

  if (isMobile) {
    return (
      <div className='h-dvh overflow-hidden bg-surface-primary'>{children}</div>
    )
  }

  return (
    <div
      className={
        isCenteredAuth
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
          <div className={isCenteredAuth ? 'w-120' : 'w-105'}>{children}</div>
        </div>
        <AuthFooter />
      </div>

      {!isCenteredAuth && (
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
