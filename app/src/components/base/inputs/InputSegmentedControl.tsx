import { motion } from 'motion/react'
import cn from '@/utils/cn'

interface Option {
  id: number | string
  name: string
}

interface Props {
  options: Option[]
  value: Option
  className?: string
  label?: string
  onChange: (value: Option) => void
}

export default function InputSegmentedControl({
  className,
  label,
  options,
  value,
  onChange,
}: Props) {
  const activeIndex = Math.max(
    0,
    options.findIndex((opt) => String(opt.id) === String(value.id)),
  )
  const count = Math.max(1, options.length)

  return (
    <div className={cn(label ? 'space-y-1.5' : undefined, className)}>
      {label ? (
        <div className='text-[10px] font-bold tracking-wider text-gray-9 uppercase'>
          {label}
        </div>
      ) : null}

      <div
        aria-label={label}
        className='relative flex h-9 w-full items-stretch rounded-full border border-gray-3 bg-gray-2 p-0.5'
        role='tablist'
      >
        <motion.div
          className='pointer-events-none absolute inset-y-0.5 rounded-full border border-gray-3 bg-surface-contrast shadow-sm'
          initial={false}
          transition={{ damping: 32, stiffness: 420, type: 'spring' }}
          aria-hidden
          animate={{
            left: `calc(${(activeIndex / count) * 100}% + 2px)`,
            width: `calc(${100 / count}% - 4px)`,
          }}
        />

        {options.map((option) => {
          const isActive = String(option.id) === String(value.id)
          return (
            <button
              aria-selected={isActive}
              key={String(option.id)}
              role='tab'
              type='button'
              className={cn(
                'relative z-10 flex flex-1 items-center justify-center rounded-full px-2 text-[12px] font-semibold transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary-4',
                isActive
                  ? 'text-primary-10'
                  : 'text-gray-10 hover:text-gray-12',
              )}
              onClick={() => onChange(option)}
            >
              {option.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
