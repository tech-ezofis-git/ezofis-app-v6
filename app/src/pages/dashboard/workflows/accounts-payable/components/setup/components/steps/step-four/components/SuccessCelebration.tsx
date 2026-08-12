import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import Icon from '@/components/base/icon/Icon'
import setupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import requestStore from '@/pages/requests/stores/useRequestStore'
import { useNavigate } from '@tanstack/react-router'

type SuccessCelebrationProps = {
  description?: string
  loadingLabel?: string
  onCreateRequest?: () => void
  title?: string
}

export default function SuccessCelebration({
  description = 'Your Accounts Payable workspace is ready.\nStart by creating your first request.',
  loadingLabel = 'Loading request workspace...',
  onCreateRequest,
  title = "You're All Set!",
}: SuccessCelebrationProps = {}) {
  const primaryButtonRef = useRef<HTMLButtonElement>(null)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  const navigate = useNavigate()
  const setPendingOpenNewRequest = requestStore(
    (state) => state.setPendingOpenNewRequest,
  )
  const apComplete = setupStore((state) => state.setisApSetUpCompleted)
  const clearNavigationLock = setupStore(
    (state) => state.setRestrictNavigationUntilApSetup,
  )
  const closeSetup = setupStore((state) => state.closeSetup)

  // Check prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // Auto-focus primary CTA once revealed (after sequence at ~600ms or 200ms if reduced motion)
  useEffect(() => {
    const focusTimer = setTimeout(
      () => {
        primaryButtonRef.current?.focus()
      },
      prefersReducedMotion ? 200 : 600,
    )
    return () => clearTimeout(focusTimer)
  }, [prefersReducedMotion])

  const handleCreateRequest = () => {
    if (onCreateRequest) {
      onCreateRequest()
    } else {
      setPendingOpenNewRequest(true)
      apComplete(true)
      clearNavigationLock(false)
      closeSetup()
      navigate({ to: '/requests' })
    }
  }

  return (
    <motion.div
      animate={{ opacity: 1 }}
      className='fixed inset-0 z-[9999] flex items-center justify-center bg-black/5 p-4 backdrop-blur-sm'
      initial={{ opacity: 0 }}
      transition={{ duration: prefersReducedMotion ? 0.2 : 0.3 }}
    >
      <motion.div
        animate={
          prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }
        }
        className='relative z-20 flex w-full max-w-md flex-col items-center overflow-hidden rounded-2xl border border-border-default bg-surface-primary/90 p-8 text-center shadow-2xl backdrop-blur-md dark:bg-surface-secondary/90'
        initial={
          prefersReducedMotion
            ? { opacity: 0 }
            : { opacity: 0, scale: 0.95 }
        }
        transition={{
          duration: prefersReducedMotion ? 0.2 : 0.3,
          ease: 'easeOut',
        }}
      >

        <div className='relative z-[2] flex w-full flex-col items-center'>
          <style>{`
            @keyframes drawCircle { to { stroke-dashoffset: 0; } }
            @keyframes drawCheck { to { stroke-dashoffset: 0; } }
          `}</style>
          {/* Animated Circle & Checkmark Sequence */}
          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            className='flex size-[72px] items-center justify-center rounded-full border border-green-3 bg-green-1 shadow-lg shadow-green-9/10 dark:bg-green-9/10'
            initial={
              prefersReducedMotion
                ? { opacity: 1, scale: 1 }
                : { opacity: 0, scale: 0.8 }
            }
            transition={{
              duration: prefersReducedMotion ? 0.2 : 0.3,
              ease: 'easeOut',
            }}
          >
            <svg
              className='size-10 text-green-9 dark:text-green-4'
              fill='none'
              height='40'
              strokeLinecap='round'
              strokeLinejoin='round'
              viewBox='0 0 24 24'
              width='40'
            >
              <circle
                cx='12'
                cy='12'
                fill='none'
                r='10'
                stroke='currentColor'
                strokeDasharray={62.8}
                strokeDashoffset={62.8}
                strokeWidth='1.6'
                style={{
                  animation: prefersReducedMotion
                    ? 'none'
                    : 'drawCircle 0.6s ease-out 0.1s forwards',
                  strokeDashoffset: prefersReducedMotion ? 0 : 62.8,
                }}
              />
              <path
                d='M7.5 12.5l2.8 2.8 6-6'
                fill='none'
                stroke='currentColor'
                strokeDasharray={14}
                strokeDashoffset={14}
                strokeWidth='2'
                style={{
                  animation: prefersReducedMotion
                    ? 'none'
                    : 'drawCheck 0.35s ease-out 0.55s forwards',
                  strokeDashoffset: prefersReducedMotion ? 0 : 14,
                }}
              />
            </svg>
          </motion.div>

          {/* Accessible Text Wrapper with aria-live="polite" */}
          <div aria-live='polite' className='flex w-full flex-col items-center'>
            {/* Heading */}
            <motion.h3
              animate={{ opacity: 1, y: 0 }}
              className='md:text-22 mt-6 text-20 font-bold tracking-tight text-gray-13'
              initial={
                prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }
              }
              transition={{
                delay: prefersReducedMotion ? 0 : 0.5,
                duration: prefersReducedMotion ? 0.2 : 0.35,
                ease: 'easeOut',
              }}
            >
              {title}
            </motion.h3>

            {/* Subtext */}
            <motion.p
              animate={{ opacity: 1, y: 0 }}
              className='mt-3 max-w-md text-14/5 text-gray-11'
              initial={
                prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }
              }
              transition={{
                delay: prefersReducedMotion ? 0 : 0.55,
                duration: prefersReducedMotion ? 0.2 : 0.35,
                ease: 'easeOut',
              }}
            >
              {description}
            </motion.p>
          </div>

          {/* Single Primary Action Button */}
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className='mt-8 flex w-full flex-col items-center justify-center'
            initial={
              prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }
            }
            transition={{
              delay: prefersReducedMotion ? 0 : 0.6,
              duration: prefersReducedMotion ? 0.2 : 0.35,
              ease: 'easeOut',
            }}
          >
            <button
              ref={primaryButtonRef}
              className='inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-9 px-6 py-2.5 text-14 font-semibold text-white shadow-sm transition-all hover:bg-primary-10 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-9 focus-visible:ring-offset-2'
              onClick={handleCreateRequest}
              type='button'
            >
              <Icon className='size-4' name='tabler:plus' />
              <span>Create Request</span>
            </button>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  )
}

SuccessCelebration.displayName = 'SuccessCelebration'
