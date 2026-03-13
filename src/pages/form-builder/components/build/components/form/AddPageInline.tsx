import { Portal } from '@mantine/core'
import { motion } from 'motion/react'
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

  return (
    <Portal>
      <div className='pointer-events-none fixed inset-0 z-[9999]'>
        {/* Click outside overlay - capture events */}
        <div
          className='pointer-events-auto absolute inset-0 z-0'
          onClick={onClose}
        />

        <motion.div
          className='pointer-events-auto absolute z-10 flex w-full max-w-[420px] flex-col overflow-hidden rounded-xl border border-gray-2 bg-white font-inter shadow-2xl'
          dragElastic={0}
          dragMomentum={false}
          drag
          animate={{
            opacity: 1,
            scale: 1,
            x: anchorRect ? anchorRect.left - 210 + anchorRect.width / 2 : 0,
            y: anchorRect ? anchorRect.top + 40 : 100,
          }}
          initial={{
            opacity: 0,
            scale: 0.9,
            x: anchorRect ? anchorRect.left - 210 + anchorRect.width / 2 : 0,
            y: anchorRect ? anchorRect.top + 40 : 100,
          }}
          style={{
            left: 0,
            top: 0,
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
