import { type HTMLMotionProps, motion, useReducedMotion } from 'framer-motion'
import React, { forwardRef } from 'react'
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'

export interface SummaryCardProps extends Omit<
  HTMLMotionProps<'div'>,
  'children'
> {
  icon: string
  label: string
  subLabel: string
  value: string | number
  helperIcon?: string
  progress?: number
  status?: string
  theme?: SummaryTheme
}

// --- Types ---
export type SummaryTheme = 'blue' | 'green' | 'orange' | 'red' | 'teal'

// --- Theme Config ---
export const SUMMARY_THEMES: Record<
  SummaryTheme,
  {
    accent: string
    bar: string
    barGradient: string
    glow: string
    hoverBg: string
    iconBg: string
    iconBorder: string
    iconGradient: string
    iconText: string
    pillBg: string
    pillBorder: string
    pillText: string
    ring: string
    subtleText: string
  }
> = {
  blue: {
    accent: 'text-blue-11',
    bar: 'bg-blue-9',
    barGradient: 'from-blue-8 to-blue-10',
    glow: 'shadow-blue-9/20',
    hoverBg: 'group-hover:bg-blue-1/40',
    iconBg: 'bg-blue-2',
    iconBorder: 'border-blue-4',
    iconGradient: 'from-blue-3 to-blue-5',
    iconText: 'text-blue-11',
    pillBg: 'bg-blue-2',
    pillBorder: 'border-blue-4',
    pillText: 'text-blue-11',
    ring: 'focus-visible:ring-blue-7/40',
    subtleText: 'text-blue-10',
  },
  green: {
    accent: 'text-green-11',
    bar: 'bg-green-9',
    barGradient: 'from-green-8 to-green-10',
    glow: 'shadow-green-9/20',
    hoverBg: 'group-hover:bg-green-1/40',
    iconBg: 'bg-green-2',
    iconBorder: 'border-green-4',
    iconGradient: 'from-green-3 to-green-5',
    iconText: 'text-green-11',
    pillBg: 'bg-green-2',
    pillBorder: 'border-green-4',
    pillText: 'text-green-11',
    ring: 'focus-visible:ring-green-7/40',
    subtleText: 'text-green-10',
  },
  orange: {
    accent: 'text-orange-11',
    bar: 'bg-orange-9',
    barGradient: 'from-orange-8 to-orange-10',
    glow: 'shadow-orange-9/20',
    hoverBg: 'group-hover:bg-orange-1/40',
    iconBg: 'bg-orange-2',
    iconBorder: 'border-orange-4',
    iconGradient: 'from-orange-3 to-orange-5',
    iconText: 'text-orange-11',
    pillBg: 'bg-orange-2',
    pillBorder: 'border-orange-4',
    pillText: 'text-orange-11',
    ring: 'focus-visible:ring-orange-7/40',
    subtleText: 'text-orange-10',
  },
  red: {
    accent: 'text-red-11',
    bar: 'bg-red-9',
    barGradient: 'from-red-8 to-red-10',
    glow: 'shadow-red-9/20',
    hoverBg: 'group-hover:bg-red-1/40',
    iconBg: 'bg-red-2',
    iconBorder: 'border-red-4',
    iconGradient: 'from-red-3 to-red-5',
    iconText: 'text-red-11',
    pillBg: 'bg-red-2',
    pillBorder: 'border-red-4',
    pillText: 'text-red-11',
    ring: 'focus-visible:ring-red-7/40',
    subtleText: 'text-red-10',
  },
  teal: {
    accent: 'text-teal-11',
    bar: 'bg-teal-9',
    barGradient: 'from-teal-8 to-teal-10',
    glow: 'shadow-teal-9/20',
    hoverBg: 'group-hover:bg-teal-1/40',
    iconBg: 'bg-teal-2',
    iconBorder: 'border-teal-4',
    iconGradient: 'from-teal-3 to-teal-5',
    iconText: 'text-teal-11',
    pillBg: 'bg-teal-2',
    pillBorder: 'border-teal-4',
    pillText: 'text-teal-11',
    ring: 'focus-visible:ring-teal-7/40',
    subtleText: 'text-teal-10',
  },
}

// --- Sub-Components ---
const StatusPill = ({ text, theme }: { text: string; theme: SummaryTheme }) => {
  const t = SUMMARY_THEMES[theme]
  return (
    <span
      aria-label={`Status: ${text}`}
      className={cn(
        'inline-flex items-center rounded-md border px-2.5 py-1 text-11 font-semibold',
        t.pillBg,
        t.pillText,
        t.pillBorder,
      )}
    >
      {text}
    </span>
  )
}

// --- Main Component ---
export const SummaryCard = forwardRef<HTMLDivElement, SummaryCardProps>(
  (
    {
      className,
      helperIcon,
      icon,
      label,
      progress,
      status,
      subLabel,
      theme = 'blue',
      value,
      onClick,
      ...props
    },
    ref,
  ) => {
    const prefersReducedMotion = useReducedMotion()
    const t = SUMMARY_THEMES[theme]
    // Always show progress bar, default to 100 if not provided
    const pct =
      progress !== undefined ? Math.min(Math.max(progress, 0), 100) : 100
    const isInteractive = !!onClick

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (isInteractive && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault()
        onClick?.(e as any)
      }
    }

    // Determine helper icon based on theme if not provided
    const defaultHelperIcon =
      helperIcon ||
      (['green', 'blue', 'teal'].includes(theme)
        ? 'tabler:trending-up'
        : 'tabler:alert-circle')

    return (
      <motion.div
        ref={ref}
        role={isInteractive ? 'button' : 'article'}
        tabIndex={isInteractive ? 0 : -1}
        aria-describedby={
          isInteractive
            ? `summary-card-${label.toLowerCase().replace(/\s+/g, '-')}`
            : undefined
        }
        aria-label={
          isInteractive ? `${label}: ${value}. ${subLabel}` : undefined
        }
        className={cn(
          // Base styles
          'group relative overflow-hidden rounded-2xl border border-[var(--gray-4)]',
          'bg-surface/95 backdrop-blur-sm',
          'shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.08)]',
          // Interactive states
          isInteractive && [
            'cursor-pointer transition-all duration-300',
            'hover:border-[var(--gray-5)]',
            'hover:shadow-[0_4px_16px_rgba(0,0,0,0.12),0_8px_24px_rgba(0,0,0,0.08)]',
            'active:scale-[0.99]',
            'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
            t.ring,
          ],
          // Non-interactive
          !isInteractive && 'cursor-default',
          className,
        )}
        transition={{
          damping: 30,
          opacity: { duration: 0.2 },
          stiffness: 400,
          type: 'spring',
        }}
        variants={{
          hidden: { opacity: 0, scale: 0.98, y: 8 },
          show: { opacity: 1, scale: 1, y: 0 },
        }}
        whileHover={
          isInteractive && !prefersReducedMotion
            ? { transition: { duration: 0.2 }, y: -3 }
            : undefined
        }
        whileTap={
          isInteractive && !prefersReducedMotion
            ? { scale: 0.99, transition: { duration: 0.1 } }
            : undefined
        }
        onClick={onClick}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {/* Decorative gradient overlay */}
        <div
          aria-hidden='true'
          className={cn(
            'pointer-events-none absolute inset-0 bg-gradient-to-br opacity-30',
            theme === 'blue' && 'from-blue-1/20 via-transparent to-transparent',
            theme === 'green' &&
              'from-green-1/20 via-transparent to-transparent',
            theme === 'orange' &&
              'from-orange-1/20 via-transparent to-transparent',
            theme === 'red' && 'from-red-1/20 via-transparent to-transparent',
            theme === 'teal' && 'from-teal-1/20 via-transparent to-transparent',
            'transition-opacity duration-300 group-hover:opacity-40',
          )}
        />

        {/* Subtle accent background on hover */}
        {isInteractive && (
          <div
            aria-hidden='true'
            className={cn(
              'pointer-events-none absolute inset-0 transition-all duration-300',
              t.hoverBg,
            )}
          />
        )}

        {/* Content Container */}
        <div className='relative flex flex-col gap-5 p-6'>
          {/* Header Section */}
          <div className='flex items-start justify-between gap-3'>
            <div className='flex min-w-0 flex-1 items-start gap-3.5'>
              {/* Icon with gradient background */}
              <div
                aria-hidden='true'
                className={cn(
                  'relative flex size-9 shrink-0 items-center justify-center rounded-xl',
                  'border-2 transition-all duration-300',
                  t.iconBg,
                  t.iconText,
                  t.iconBorder,
                  isInteractive &&
                    'group-hover:border-opacity-70 group-hover:scale-105',
                  'shadow-sm',
                )}
              >
                {/* Gradient overlay on icon */}
                <div
                  className={cn(
                    'absolute inset-0 rounded-xl bg-gradient-to-br opacity-50',
                    t.iconGradient,
                  )}
                />
                <Icon className='relative z-10 size-5' name={icon} />
              </div>

              {/* Label & Status */}
              <div className='mt-1.5 flex w-full flex-row items-center justify-between pt-0.5'>
                <h3 className='truncate text-15 leading-tight font-semibold text-[var(--gray-12)]'>
                  {label}
                </h3>
                {status && (
                  <div className=''>
                    <StatusPill text={status} theme={theme} />
                  </div>
                )}
              </div>
            </div>

            {/* Interactive Indicator */}
            {isInteractive && (
              <Icon
                aria-hidden='true'
                name='tabler:arrow-up-right'
                className={cn(
                  'size-4 shrink-0 text-[var(--gray-9)]',
                  'opacity-0 transition-all duration-300',
                  'group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:opacity-100',
                  'group-focus-visible:opacity-100',
                )}
              />
            )}
          </div>

          {/* Value Section - Primary Focus */}
          <div className='flex items-baseline gap-2'>
            <span
              aria-label={`Value: ${value}`}
              className='text-28 leading-none font-bold tracking-tight text-[var(--gray-13)] tabular-nums'
            >
              {value}
            </span>
          </div>

          {/* Footer Section */}
          {/* <div className="flex items-center gap-2.5 text-13 text-[var(--gray-10)]">
                    <Icon
                        name={defaultHelperIcon}
                        className={cn('size-4 shrink-0', t.subtleText)}
                        aria-hidden="true"
                    />
                    <span
                        className="truncate leading-relaxed font-medium"
                        id={isInteractive ? `summary-card-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined}
                    >
                        {subLabel}
                    </span>
                </div> */}

          {/* Progress Bar - Always visible */}
          <div className='relative'>
            <div className='mb-1.5 flex items-center justify-between text-11 text-[var(--gray-10)]'>
              <span
                className='truncate leading-relaxed font-medium'
                id={
                  isInteractive
                    ? `summary-card-${label.toLowerCase().replace(/\s+/g, '-')}`
                    : undefined
                }
              >
                {subLabel}
              </span>
              <Icon
                aria-hidden='true'
                className={cn('size-4 shrink-0', t.subtleText)}
                name={defaultHelperIcon}
              />
            </div>
            <div
              aria-label={`Progress: ${pct}%`}
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={pct}
              role='progressbar'
              className={cn(
                'relative h-2.5 w-full overflow-hidden rounded-full',
                'bg-[var(--gray-3)] shadow-inner',
              )}
            >
              {/* Progress bar track with gradient */}
              <motion.div
                animate={{ width: `${pct}%` }}
                initial={prefersReducedMotion ? false : { width: 0 }}
                className={cn(
                  'relative h-full rounded-full',
                  'bg-gradient-to-r',
                  t.barGradient,
                  'shadow-sm',
                )}
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : {
                        duration: 0.8,
                        ease: [0.16, 1, 0.3, 1], // Custom easing for smooth animation
                      }
                }
              >
                {/* Subtle shine effect on progress bar */}
                <motion.div
                  className='absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent'
                  animate={
                    prefersReducedMotion
                      ? {}
                      : {
                          x: ['-100%', '200%'],
                        }
                  }
                  transition={{
                    duration: 2,
                    ease: 'linear',
                    repeat: Infinity,
                  }}
                />
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>
    )
  },
)

SummaryCard.displayName = 'SummaryCard'
