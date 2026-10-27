import { useLingui } from '@lingui/react/macro'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useMemo } from 'react'
import { create } from 'zustand'
import Icon from '@/components/base/icon/Icon'
import showToast from '@/components/base/toast/showToast'
import cn from '@/utils/cn'

const AUTO_CLOSE_MS = 4000
const PHONE_QUERY = '(max-width: 767px)'
const CONFETTI_COLORS = [
  'bg-primary-9',
  'bg-orange-9',
  'bg-green-9',
  'bg-blue-9',
  'bg-yellow-9',
  'bg-red-9',
]

type Celebration = {
  icon?: string
  id: number
  message?: string
  title: string
}

type CelebrationState = {
  current: Celebration | null
  close: () => void
  show: (celebration: Omit<Celebration, 'id'>) => void
}

const useCelebrationStore = create<CelebrationState>((set) => ({
  current: null,
  close: () => set({ current: null }),
  show: (celebration) => set({ current: { ...celebration, id: Date.now() } }),
}))

/**
 * Success feedback for the portal: on phones a celebration card (icon,
 * confetti, auto-close + manual close); elsewhere the usual toast. Pass
 * `toastOnDesktop: false` when larger screens should stay silent.
 */
export const notifyPortalSuccess = ({
  icon,
  message,
  title,
  toastOnDesktop = true,
}: {
  icon?: string
  message?: string
  title: string
  toastOnDesktop?: boolean
}) => {
  const isPhone =
    typeof window !== 'undefined' && window.matchMedia(PHONE_QUERY).matches
  if (isPhone) {
    useCelebrationStore.getState().show({ icon, message, title })
    return
  }
  if (toastOnDesktop) {
    showToast({
      message: message ? `${title} ${message}` : title,
      variant: 'success',
    })
  }
}

export default function PortalSuccessCelebration() {
  const { t } = useLingui()
  const reduceMotion = useReducedMotion()
  const current = useCelebrationStore((state) => state.current)
  const close = useCelebrationStore((state) => state.close)

  useEffect(() => {
    if (!current) return
    const timer = window.setTimeout(close, AUTO_CLOSE_MS)
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('keydown', onKey)
    }
  }, [close, current])

  // Fresh confetti layout per celebration
  const pieces = useMemo(
    () =>
      Array.from({ length: 28 }, (_, index) => ({
        color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
        delay: Math.random() * 0.4,
        drift: (Math.random() - 0.5) * 60,
        left: Math.random() * 100,
        rotate: Math.random() * 360,
        round: index % 3 === 0,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [current?.id],
  )

  return (
    <AnimatePresence>
      {current ? (
        <motion.div
          animate={{ opacity: 1 }}
          aria-live='polite'
          className='fixed inset-0 z-[1000] flex items-center justify-center bg-gray-13/30 px-6 md:hidden'
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          key={current.id}
          role='status'
          onClick={close}
        >
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className='relative w-full max-w-sm overflow-hidden rounded-2xl bg-surface shadow-lg'
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.9, y: 16 }}
            transition={{ damping: 22, stiffness: 320, type: 'spring' }}
            onClick={(event) => event.stopPropagation()}
          >
            {!reduceMotion ? (
              <div
                className='pointer-events-none absolute inset-x-0 top-0 h-40 overflow-hidden'
                aria-hidden
              >
                {pieces.map((piece, index) => (
                  <motion.span
                    initial={{ opacity: 0, rotate: piece.rotate, x: 0, y: -12 }}
                    key={index}
                    style={{ left: `${piece.left}%` }}
                    animate={{
                      opacity: [1, 1, 0],
                      rotate: piece.rotate + 180,
                      x: piece.drift,
                      y: 160,
                    }}
                    className={cn(
                      'absolute top-0 block',
                      piece.round
                        ? 'size-1.5 rounded-full'
                        : 'h-2.5 w-1 rounded-sm',
                      piece.color,
                    )}
                    transition={{
                      delay: piece.delay,
                      duration: 1.8,
                      ease: 'easeOut',
                    }}
                  />
                ))}
              </div>
            ) : null}

            <button
              aria-label={t`Close`}
              className='absolute top-3 right-3 flex size-8 items-center justify-center rounded-full text-gray-9 transition-colors hover:bg-gray-3 hover:text-gray-12 active:scale-90'
              type='button'
              onClick={close}
            >
              <Icon className='size-4' name='tabler:x' />
            </button>

            <div className='flex flex-col items-center gap-2 px-6 pt-10 pb-5 text-center'>
              <motion.span
                animate={{ scale: 1 }}
                className='flex size-16 items-center justify-center rounded-full bg-green-3 text-green-11 ring-8 ring-green-1'
                initial={reduceMotion ? false : { scale: 0.4 }}
                transition={{
                  damping: 12,
                  delay: 0.1,
                  stiffness: 260,
                  type: 'spring',
                }}
              >
                <Icon
                  className='size-8'
                  name={current.icon || 'tabler:circle-check'}
                />
              </motion.span>
              <p className='mt-2 text-18 font-bold text-gray-13'>
                {current.title}
              </p>
              {current.message ? (
                <p className='text-13 text-gray-10'>{current.message}</p>
              ) : null}
            </div>

            <button
              className='w-full border-t border-gray-3 py-3.5 text-14 font-semibold text-green-11 transition-colors hover:bg-green-1 active:bg-green-2'
              type='button'
              onClick={close}
            >
              {t`Got it, thanks!`}
            </button>

            {/* Auto-close countdown */}
            <motion.span
              animate={{ scaleX: 0 }}
              className='absolute bottom-0 left-0 block h-0.5 w-full origin-left bg-green-9'
              initial={{ scaleX: 1 }}
              transition={{ duration: AUTO_CLOSE_MS / 1000, ease: 'linear' }}
            />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
