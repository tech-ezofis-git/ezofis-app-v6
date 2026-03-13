import { useState, useRef, useEffect } from 'react'
import { motion } from 'motion/react'
import Icon from '@/components/base/icon/Icon'
import { useFormStore } from '@/pages/form-builder/store/formStore'
import cn from '@/utils/cn'

interface Props {
  anchorRect?: DOMRect | null
  onClose: () => void
  onSelect: (type: 'blank' | 'welcome' | 'thank_you') => void
}

const AddPageInline = ({ onSelect, onClose, anchorRect }: Props) => {
  const { welcomePage, thankYouPage } = useFormStore()
  const [position, setPosition] = useState<{ top: number, left: number }>({ top: 0, left: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const updatePosition = () => {
      if (anchorRect) {
        const menuWidth = 420
        const menuHeight = containerRef.current?.offsetHeight || 190
        const windowWidth = window.innerWidth
        const windowHeight = window.innerHeight

        let left = anchorRect.left + (anchorRect.width / 2) - (menuWidth / 2)
        let top = anchorRect.bottom + 8

        // Keep within horizontal bounds
        if (left < 20) left = 20
        if (left + menuWidth > windowWidth - 20) left = windowWidth - menuWidth - 20

        // If would go off bottom, show above instead
        if (top + menuHeight > windowHeight - 20) {
          top = Math.max(20, anchorRect.top - menuHeight - 8)
        }

        setPosition({ top, left })
      }
    }

    updatePosition()
    // Run again after a short delay to account for layout shifts
    const timer = setTimeout(updatePosition, 50)
    return () => clearTimeout(timer)
  }, [anchorRect])

  const PAGE_TYPES = [
    {
      id: 'blank',
      label: 'Blank Section',
      icon: 'lucide:layout',
      description: 'Start with a fresh empty section',
      color: 'text-accent-primary',
      bg: 'bg-accent-soft/10'
    },
    {
      id: 'welcome',
      label: 'Welcome Screen',
      icon: 'lucide:megaphone',
      description: 'The first screen your users see',
      color: 'text-accent-primary',
      bg: 'bg-accent-soft/10',
      disabled: welcomePage.enabled
    },
    {
      id: 'thank_you',
      label: 'Completion Screen',
      icon: 'lucide:party-popper',
      description: 'Final screen shown after submission',
      color: 'text-accent-primary',
      bg: 'bg-accent-soft/10',
      disabled: thankYouPage.enabled
    },
  ]

  if (!anchorRect) return null

  return (
    <Portal>
      <div className="fixed inset-0 pointer-events-none z-[10001]">
        {/* Click outside overlay - capture events */}
        <div className="absolute inset-0 z-0 pointer-events-auto bg-gray-900/5 backdrop-blur-[1px] animate-in fade-in duration-300" onClick={onClose} />

        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            position: 'absolute',
            top: position.top,
            left: position.left,
          }}
          className='w-full max-w-[420px] pointer-events-auto flex flex-col overflow-hidden rounded-xl bg-white border border-gray-2 shadow-[0_20px_50px_rgba(0,0,0,0.15)] font-inter z-10'
        >


          {/* Options Grid */}
          <div className="p-3 grid grid-cols-2 gap-1.5 custom-scrollbar overflow-y-auto max-h-[300px]">
            {PAGE_TYPES.map((type) => (
              <button
                key={type.id}
                disabled={type.disabled}
                className={cn(
                  'flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200 text-left border border-transparent',
                  type.disabled
                    ? 'opacity-50 grayscale cursor-not-allowed'
                    : 'hover:bg-gray-50 hover:border-gray-200 group'
                )}
                onClick={() => !type.disabled && onSelect(type.id as any)}
              >
                <div className={cn(
                  'flex shrink-0 items-center justify-center rounded-lg h-9 w-9 shadow-sm transition-transform group-hover:scale-110',
                  type.bg
                )}>
                  <Icon
                    name={type.icon}
                    className={cn('h-5 w-5', type.color)}
                  />
                </div>
                <div className='flex flex-col min-w-0'>
                  <span className={cn(
                    'text-xs font-bold text-gray-13 group-hover:text-accent-primary truncate leading-tight transition-colors',
                  )}>
                    {type.label}
                  </span>
                  <span className='text-[10px] text-gray-5 truncate mt-0.5 leading-none'>
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
