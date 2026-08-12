import { Portal } from '@mantine/core'
import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import { useFormStore } from '@/pages/form-builder/store/formStore'
import cn from '@/utils/cn'
interface Props {
  anchorRect?: DOMRect | null
  onClose: () => void
  onSelect: (type: 'blank' | 'welcome' | 'thank_you') => void
}

const AddPageInline = ({ anchorRect, onClose, onSelect }: Props) => {
  const { thankYouPage, welcomePage } = useFormStore()
  const [position, setPosition] = useState<{ left: number; top: number }>({
    left: 0,
    top: 0,
  })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const updatePosition = () => {
      if (anchorRect) {
        const menuWidth = 420
        const menuHeight = containerRef.current?.offsetHeight || 190
        const windowWidth = window.innerWidth
        const windowHeight = window.innerHeight

        let left = anchorRect.left + anchorRect.width / 2 - menuWidth / 2
        let top = anchorRect.bottom + 8

        // Keep within horizontal bounds
        if (left < 20) left = 20
        if (left + menuWidth > windowWidth - 20)
          left = windowWidth - menuWidth - 20

        // If would go off bottom, show above instead
        if (top + menuHeight > windowHeight - 20) {
          top = Math.max(20, anchorRect.top - menuHeight - 8)
        }

        setPosition({ left, top })
      }
    }

    updatePosition()
    // Run again after a short delay to account for layout shifts
    const timer = setTimeout(updatePosition, 50)
    return () => clearTimeout(timer)
  }, [anchorRect])

  const PAGE_TYPES = [
    {
      bg: 'bg-accent-soft/10',
      color: 'text-accent-primary',
      description: 'Start with a fresh empty section',
      icon: 'lucide:layout',
      id: 'blank',
      label: 'Blank Section',
    },
    {
      bg: 'bg-accent-soft/10',
      color: 'text-accent-primary',
      description: 'The first screen your users see',
      disabled: welcomePage.enabled,
      icon: 'lucide:megaphone',
      id: 'welcome',
      label: 'Welcome Screen',
    },
    {
      bg: 'bg-accent-soft/10',
      color: 'text-accent-primary',
      description: 'Final screen shown after submission',
      disabled: thankYouPage.enabled,
      icon: 'lucide:party-popper',
      id: 'thank_you',
      label: 'Completion Screen',
    },
  ]

  if (!anchorRect) return null

  return (
    <Portal>
      <div className='pointer-events-none fixed inset-0 z-[10001]'>
        {/* Click outside overlay - capture events */}
        <div
          className='bg-gray-900/5 animate-in fade-in pointer-events-auto absolute inset-0 z-0 backdrop-blur-[1px] duration-300'
          onClick={onClose}
        />

        <motion.div
          animate={{ opacity: 1, scale: 1 }}
          className='pointer-events-auto z-10 flex w-full max-w-[420px] flex-col overflow-hidden rounded-xl border border-gray-2 bg-white font-inter shadow-[0_20px_50px_rgba(0,0,0,0.15)]'
          initial={{ opacity: 0, scale: 0.95 }}
          ref={containerRef}
          style={{
            left: position.left,
            position: 'absolute',
            top: position.top,
          }}
        >
          {/* Options Grid */}
          <div className='custom-scrollbar grid max-h-[300px] grid-cols-2 gap-1.5 overflow-y-auto p-3'>
            {PAGE_TYPES.map((type) => (
              <button
                disabled={type.disabled}
                key={type.id}
                className={cn(
                  'flex items-center gap-3 rounded-xl border border-transparent p-2.5 text-left transition-all duration-200',
                  type.disabled
                    ? 'cursor-not-allowed opacity-50 grayscale'
                    : 'hover:bg-gray-50 hover:border-gray-200 group',
                )}
                onClick={() => !type.disabled && onSelect(type.id as any)}
              >
                <div
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-sm transition-transform group-hover:scale-110',
                    type.bg,
                  )}
                >
                  <Icon
                    className={cn('h-5 w-5', type.color)}
                    name={type.icon}
                  />
                </div>
                <div className='flex min-w-0 flex-col'>
                  <span
                    className={cn(
                      'truncate text-xs leading-tight font-bold text-gray-13 transition-colors group-hover:text-accent-primary',
                    )}
                  >
                    {type.label}
                  </span>
                  <span className='mt-0.5 truncate text-[10px] leading-none text-gray-5'>
                    {type.disabled ? 'Already added' : type.description}
                  </span>
                </div>
              </button>
            ))}
          </div>

          <style
            dangerouslySetInnerHTML={{
              __html: `
                        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
                        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #d1d5db; }
                    `,
            }}
          />
        </motion.div>
      </div>
    </Portal>
  )
}

export default AddPageInline
