import type { ReactNode } from 'react'
import AuthFooter from './components/AuthFooter'
import AuthHeader from './components/AuthHeader'
import Features from './components/Features'
import Hero from './components/hero/Hero'

interface Props {
  children?: ReactNode
}

const AuthLayout = ({ children }: Props) => {
  return (
    <div className='grid min-h-svh grid-cols-1 xl:grid-cols-2'>
      <div className='relative col-span-1 bg-gray-1 p-6'>
        <AuthHeader />
        <div
          className='flex items-center justify-center py-10 xl:py-24'
          style={{ minHeight: 'calc(100svh - 120px)' }}
        >
          <div className='flex w-105 flex-col gap-6'>{children}</div>
        </div>
        <AuthFooter />
      </div>

      <div className='col-span-1 hidden items-center justify-center bg-surface-muted p-6 xl:flex'>
        <div className='flex size-full w-124 flex-col items-center justify-center'>
          <Hero />
          <Features />
        </div>
      </div>
    </div>
  )
}

AuthLayout.displayName = 'AuthLayout'
export default AuthLayout
