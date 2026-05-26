// import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import cn from '@/utils/cn'
import { type SummaryTheme } from './SummaryCard'

const SUMMARY_THEMES: Record<
  SummaryTheme,
  {
    bar: string
    borderTint: string
    glow: string
    iconBg: string
    iconText: string
    pillBg: string
    pillText: string
    ring: string
    subtleText: string
    wash: string
  }
> = {
  blue: {
    bar: 'bg-blue-9',
    borderTint: 'border-blue-5/30',
    glow: 'shadow-[0_18px_55px_rgba(0,86,255,0.10)]',
    iconBg: 'bg-blue-3/80',
    iconText: 'text-blue-11',
    pillBg: 'bg-blue-3/80',
    pillText: 'text-blue-11',
    ring: 'focus-visible:ring-blue-7/35',
    subtleText: 'text-blue-11',
    wash: 'from-blue-2/70 via-transparent to-transparent',
  },
  green: {
    bar: 'bg-green-9',
    borderTint: 'border-green-5/30',
    glow: 'shadow-[0_18px_55px_rgba(0,200,120,0.10)]',
    iconBg: 'bg-green-3/80',
    iconText: 'text-green-11',
    pillBg: 'bg-green-3/80',
    pillText: 'text-green-11',
    ring: 'focus-visible:ring-green-7/35',
    subtleText: 'text-green-11',
    wash: 'from-green-2/70 via-transparent to-transparent',
  },
  orange: {
    bar: 'bg-orange-8',
    borderTint: 'border-orange-5/30',
    glow: 'shadow-[0_18px_55px_rgba(255,140,0,0.10)]',
    iconBg: 'bg-orange-3/80',
    iconText: 'text-orange-11',
    pillBg: 'bg-orange-3/80',
    pillText: 'text-orange-11',
    ring: 'focus-visible:ring-orange-7/35',
    subtleText: 'text-orange-11',
    wash: 'from-orange-2/70 via-transparent to-transparent',
  },
  red: {
    bar: 'bg-red-8',
    borderTint: 'border-red-5/30',
    glow: 'shadow-[0_18px_55px_rgba(255,70,70,0.10)]',
    iconBg: 'bg-red-3/80',
    iconText: 'text-red-11',
    pillBg: 'bg-red-3/80',
    pillText: 'text-red-11',
    ring: 'focus-visible:ring-red-7/35',
    subtleText: 'text-red-11',
    wash: 'from-red-2/70 via-transparent to-transparent',
  },
  teal: {
    bar: 'bg-teal-9',
    borderTint: 'border-teal-5/30',
    glow: 'shadow-[0_18px_55px_rgba(0,190,200,0.10)]',
    iconBg: 'bg-teal-3/80',
    iconText: 'text-teal-11',
    pillBg: 'bg-teal-3/80',
    pillText: 'text-teal-11',
    ring: 'focus-visible:ring-teal-7/35',
    subtleText: 'text-teal-11',
    wash: 'from-teal-2/70 via-transparent to-transparent',
  },
}

// Define the loading order/colors to match your typical data pattern
const LOADING_THEMES: SummaryTheme[] = ['blue', 'blue', 'green', 'orange']

const SkeletonCard = ({
  index,
  theme,
}: {
  index: number
  theme: SummaryTheme
}) => {
  const prefersReducedMotion = useReducedMotion()
  const t = SUMMARY_THEMES[theme]

  return (
    <div
      aria-hidden='true'
      className={cn(
        'relative overflow-hidden rounded-2xl border border-[var(--gray-3)] bg-surface/90 p-5 shadow-sm',
        'backdrop-blur select-none',
      )}
    >
      {/* 1. Static Background Wash (Matches real card) */}
      <div
        className={cn('absolute inset-0 bg-gradient-to-br opacity-60', t.wash)}
      />

      {/* 2. Shimmer Effect Overlay */}
      {!prefersReducedMotion && (
        <motion.div
          animate={{ translateX: ['-100%', '200%'] }}
          className='absolute inset-0 -translate-x-full'
          style={{
            background: `linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--surface) 55%, transparent) 50%, transparent 100%)`,
          }}
          transition={{
            delay: index * 0.15, // Stagger effect
            duration: 1.5,
            ease: 'linear',
            repeat: Infinity,
          }}
        />
      )}

      {/* 3. Skeleton Content Structure */}
      <div className='relative flex h-full flex-col justify-between'>
        {/* Header Row */}
        <div className='mb-4 flex items-start justify-between'>
          <div className='flex w-full gap-3'>
            {/* Icon Placeholder */}
            <div
              className={cn(
                'size-10 shrink-0 rounded-2xl opacity-50',
                t.iconBg,
              )}
            />

            {/* Text & Pill Placeholders */}
            <div className='flex w-full flex-col gap-2'>
              <div className='bg-slate-200/80 h-4 w-24 rounded' /> {/* Label */}
              <div
                className={cn('h-5 w-16 rounded-full opacity-40', t.pillBg)}
              />{' '}
              {/* Status Pill */}
            </div>
          </div>
        </div>

        {/* Metric Value */}
        <div className='bg-slate-200/80 mb-3 h-8 w-1/3 rounded' />

        {/* Sub-label Row */}
        <div className='mb-4 flex items-center gap-2'>
          <div className='bg-slate-200 size-4 rounded-full' />
          <div className='bg-slate-200/60 h-3 w-1/2 rounded' />
        </div>

        {/* Progress Bar */}
        <div className='bg-slate-100 h-2 w-full overflow-hidden rounded-full'>
          <div
            className={cn('h-full rounded-full opacity-30', t.bar)}
            style={{ width: '60%' }}
          />
        </div>
      </div>
    </div>
  )
}

export const SkeletonGrid = () => {
  return (
    <motion.div
      animate={{ opacity: 1 }}
      aria-busy='true'
      aria-label='Loading request details'
      className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
    >
      {LOADING_THEMES.map((theme, i) => (
        <SkeletonCard index={i} key={i} theme={theme} />
      ))}
    </motion.div>
  )
}
