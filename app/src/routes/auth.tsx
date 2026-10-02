import { createFileRoute } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import connectorApi from '@/api/connector'
import {
  AnimateFadeIn,
  AnimateScale,
  AnimateSlideUp,
} from '@/components/common/animations'

const Sparkles = () => {
  const sparkles = [
    { angle: 0, delay: 0.2, distance: 40, id: 1, scale: 0.8 },
    { angle: 45, delay: 0.3, distance: 35, id: 2, scale: 0.6 },
    { angle: 90, delay: 0.1, distance: 45, id: 3, scale: 0.9 },
    { angle: 135, delay: 0.4, distance: 38, id: 4, scale: 0.7 },
    { angle: 180, delay: 0.2, distance: 42, id: 5, scale: 0.8 },
    { angle: 225, delay: 0.3, distance: 36, id: 6, scale: 0.6 },
    { angle: 270, delay: 0.1, distance: 44, id: 7, scale: 0.9 },
    { angle: 315, delay: 0.4, distance: 39, id: 8, scale: 0.7 },
  ]

  return (
    <div className='pointer-events-none absolute inset-0 flex items-center justify-center'>
      {sparkles.map((sparkle) => (
        <motion.div
          className='absolute'
          initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
          key={sparkle.id}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, sparkle.scale, 0],
            x: Math.cos(sparkle.angle * (Math.PI / 180)) * sparkle.distance,
            y: Math.sin(sparkle.angle * (Math.PI / 180)) * sparkle.distance,
          }}
          transition={{
            delay: sparkle.delay,
            duration: 0.8,
            ease: 'easeOut',
            repeat: Infinity,
            repeatDelay: 1.5,
          }}
        >
          <svg
            className='text-yellow-8'
            fill='orange'
            height='12'
            viewBox='0 0 24 24'
            width='12'
          >
            <path d='M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z' />
          </svg>
        </motion.div>
      ))}
    </div>
  )
}

type AuthSearch = {
  connector?: string
  connectorId?: string
  connectorOAuth?: string
  grant?: string
  provider?: string
}

export const Route = createFileRoute('/auth')({
  component: AuthPage,
  validateSearch: (search: Record<string, unknown>): AuthSearch => ({
    connector:
      typeof search.connector === 'string' ? search.connector : undefined,
    connectorId:
      typeof search.connectorId === 'string' ? search.connectorId : undefined,
    connectorOAuth:
      typeof search.connectorOAuth === 'string'
        ? search.connectorOAuth
        : undefined,
    grant: typeof search.grant === 'string' ? search.grant : undefined,
    provider: typeof search.provider === 'string' ? search.provider : undefined,
  }),
})

function AuthPage() {
  const { connector, connectorId, connectorOAuth, grant, provider } =
    Route.useSearch()

  const hasCompleted = useRef(false)
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(() => {
    if (connectorOAuth === 'success' && connectorId) return 'loading'
    if (grant === 'success') return 'success'
    return 'error'
  })
  const [connectedEmail, setConnectedEmail] = useState('')

  useEffect(() => {
    if (hasCompleted.current) return

    const notifyAndClose = (payload: {
      connector?: string
      connectorId?: string
      email?: string
      externalAccountEmail?: string
      provider?: string
    }) => {
      hasCompleted.current = true
      setStatus('success')

      if (window.opener) {
        window.opener.postMessage(
          {
            ...payload,
            type: 'CONNECTION_SUCCESS',
          },
          window.location.origin,
        )
      }

      const timer = setTimeout(() => {
        window.close()
      }, 1200)

      return () => clearTimeout(timer)
    }

    // Legacy ezcloudauth callback: ?grant=success&connector=...&provider=...
    if (grant === 'success') {
      return notifyAndClose({ connector, provider })
    }

    // New connector OAuth callback:
    // ?connectorOAuth=success&connectorId=...&provider=GMAIL
    if (connectorOAuth === 'success' && connectorId) {
      let cancelled = false

      const loadConnector = async () => {
        const response = await connectorApi.getConnectorById(connectorId)
        if (cancelled) return

        if (response.error || !response.payload) {
          hasCompleted.current = true
          setStatus('error')
          return
        }

        const details = response.payload
        const email = details.externalAccountEmail || ''
        setConnectedEmail(email)

        notifyAndClose({
          connector: details.name || connectorId,
          connectorId: details.id,
          email,
          externalAccountEmail: email,
          provider: details.providerCode || provider,
        })
      }

      void loadConnector()
      return () => {
        cancelled = true
      }
    }

    hasCompleted.current = true
    setStatus('error')
  }, [connector, connectorId, connectorOAuth, grant, provider])

  return (
    <div className='flex h-screen w-full flex-col items-center justify-center gap-4 bg-gray-1'>
      {status === 'loading' ? (
        <>
          <AnimateScale delay={0.1}>
            <div className='flex h-16 w-16 items-center justify-center rounded-full bg-gray-2 text-primary-9'>
              <div className='h-8 w-8 animate-spin rounded-full border-2 border-primary-9 border-t-transparent' />
            </div>
          </AnimateScale>
          <AnimateSlideUp delay={0.2}>
            <h1 className='text-xl font-semibold text-gray-12'>
              Completing connection...
            </h1>
          </AnimateSlideUp>
          <AnimateFadeIn delay={0.3}>
            <p className='text-gray-11'>Fetching your connected account.</p>
          </AnimateFadeIn>
        </>
      ) : status === 'success' ? (
        <>
          <AnimateScale delay={0.1}>
            <div className='relative flex items-center justify-center'>
              <div className='relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-green-1 text-green-9 shadow-sm'>
                <svg
                  fill='none'
                  height='32'
                  stroke='currentColor'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth='3'
                  viewBox='0 0 24 24'
                  width='32'
                  xmlns='http://www.w3.org/2000/svg'
                >
                  <path d='M20 6 9 17l-5-5' />
                </svg>
              </div>
              <Sparkles />
            </div>
          </AnimateScale>
          <AnimateSlideUp delay={0.2}>
            <h1 className='text-xl font-semibold text-gray-12'>
              Connection Successful!
            </h1>
          </AnimateSlideUp>
          <AnimateFadeIn delay={0.3}>
            <p className='text-gray-11'>
              {connectedEmail
                ? `Connected as ${connectedEmail}. Closing this tab...`
                : 'You can close this tab and return to the editor.'}
            </p>
          </AnimateFadeIn>
        </>
      ) : (
        <>
          <AnimateScale delay={0.1}>
            <div className='flex h-16 w-16 items-center justify-center rounded-full bg-red-1 text-red-9'>
              <svg
                fill='none'
                height='32'
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='2'
                viewBox='0 0 24 24'
                width='32'
                xmlns='http://www.w3.org/2000/svg'
              >
                <circle cx='12' cy='12' r='10' />
                <line x1='12' x2='12' y1='8' y2='12' />
                <line x1='12' x2='12.01' y1='16' y2='16' />
              </svg>
            </div>
          </AnimateScale>
          <AnimateSlideUp delay={0.2}>
            <h1 className='text-xl font-semibold text-gray-12'>
              Connection Failed
            </h1>
          </AnimateSlideUp>
          <AnimateFadeIn delay={0.3}>
            <p className='max-w-md text-center text-gray-11'>
              Something went wrong while connecting. Please try again.
            </p>
          </AnimateFadeIn>
        </>
      )}
    </div>
  )
}
