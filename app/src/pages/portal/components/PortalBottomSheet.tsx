import type { ReactNode } from 'react'
import { useLingui } from '@lingui/react/macro'
import {
  AnimatePresence,
  motion,
  useDragControls,
  useReducedMotion,
} from 'motion/react'
import { useEffect, useId } from 'react'
import { createPortal } from 'react-dom'
import Icon from '@/components/base/icon/Icon'

type PortalBottomSheetProps = {
  children: ReactNode
  footer?: ReactNode
  open: boolean
  title: string
  onClose: () => void
}

/**
 * Mobile bottom sheet: slides up over a dimmed backdrop, closes on backdrop
 * tap, Escape or a downward drag of the handle, and locks page scrolling
 * while open. Content scrolls inside the sheet.
 */
export default function PortalBottomSheet({
  children,
  footer,
  open,
  title,
  onClose,
}: PortalBottomSheetProps) {
  const { t } = useLingui()
  const titleId = useId()
  const reduceMotion = useReducedMotion()
  const dragControls = useDragControls()

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose, open])

  const transition = reduceMotion
    ? { duration: 0 }
    : { damping: 32, stiffness: 340, type: 'spring' as const }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className='fixed inset-0 z-[1000] flex items-end justify-center'>
          <motion.button
            animate={{ opacity: 1 }}
            aria-label={t`Close`}
            className='absolute inset-0 cursor-default bg-gray-12/40'
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            type='button'
            onClick={onClose}
          />
          <motion.div
            animate={{ y: 0 }}
            aria-labelledby={titleId}
            aria-modal='true'
            className='relative flex max-h-[80dvh] w-full max-w-lg flex-col rounded-t-3xl bg-surface pb-[env(safe-area-inset-bottom)] shadow-2xl'
            drag='y'
            dragConstraints={{ bottom: 0, top: 0 }}
            dragControls={dragControls}
            dragElastic={{ bottom: 0.6, top: 0 }}
            dragListener={false}
            exit={{ y: '100%' }}
            initial={{ y: '100%' }}
            role='dialog'
            transition={transition}
            onDragEnd={(_, info) => {
              if (info.offset.y > 90 || info.velocity.y > 500) onClose()
            }}
          >
            {/* Drag handle + title: the only area that starts a drag, so the
                list below scrolls normally. */}
            <div
              className='shrink-0 cursor-grab touch-none px-5 pt-2.5 pb-3 active:cursor-grabbing'
              onPointerDown={(event) => dragControls.start(event)}
            >
              <div className='mx-auto mb-3 h-1.5 w-10 rounded-full bg-gray-5' />
              <div className='flex items-center justify-between gap-3'>
                <h2
                  className='truncate text-16 font-semibold text-gray-13'
                  id={titleId}
                >
                  {title}
                </h2>
                <button
                  aria-label={t`Close`}
                  className='flex size-9 shrink-0 items-center justify-center rounded-full text-gray-10 transition-colors hover:bg-gray-3 active:scale-95'
                  type='button'
                  onClick={onClose}
                >
                  <Icon className='size-4' name='lucide:x' />
                </button>
              </div>
            </div>
            <div className='min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3'>
              {children}
            </div>
            {footer ? (
              <div className='flex shrink-0 gap-2 border-t border-gray-3 px-4 py-3'>
                {footer}
              </div>
            ) : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
