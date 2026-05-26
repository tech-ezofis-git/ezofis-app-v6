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
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <div className='text-[10px] font-bold tracking-wider text-gray-9 uppercase'>
          {label}
        </div>
      )}
      <div className='bg-gray-100/80 border-gray-200/50 relative flex h-10 items-center rounded-xl border p-1'>
        {/* Animated Background Pill */}
        <motion.div
          className='absolute z-0 h-8 rounded-lg bg-surface-raised shadow-sm'
          initial={false}
          layoutId='activePill'
          transition={{ damping: 35, stiffness: 500, type: 'spring' }}
          animate={{
            left: `${options.findIndex((opt) => opt.id === value.id) * (100 / options.length)}%`,
            width: `${100 / options.length}%`,
          }}
          style={{
            margin: '0 4px',
            width: `calc(${100 / options.length}% - 8px)`,
          }}
        />

        {options.map((option) => {
          const isActive = option.id === value.id
          return (
            <button
              key={option.id}
              className={cn(
                'relative z-10 flex-1 text-[13px] font-semibold transition-colors duration-300 outline-none',
                isActive
                  ? 'text-purple-9'
                  : 'text-gray-500 hover:text-gray-800',
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
