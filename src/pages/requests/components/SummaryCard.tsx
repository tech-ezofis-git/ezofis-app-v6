import React, { forwardRef } from 'react'
import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion'
import cn from '@/utils/cn'
import Icon from '@/components/base/icon/Icon'

// --- Types ---
export type SummaryTheme = 'blue' | 'green' | 'orange' | 'red' | 'teal'

export interface SummaryCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
    label: string
    value: string | number
    subLabel: string
    icon: string
    theme?: SummaryTheme
    progress?: number
    status?: string
    helperIcon?: string
}

// --- Theme Config ---
export const SUMMARY_THEMES: Record<
    SummaryTheme,
    {
        iconBg: string
        iconText: string
        iconBorder: string
        iconGradient: string
        bar: string
        barGradient: string
        ring: string
        accent: string
        pillBg: string
        pillText: string
        pillBorder: string
        subtleText: string
        hoverBg: string
        glow: string
    }
> = {
    blue: {
        iconBg: 'bg-blue-2',
        iconText: 'text-blue-11',
        iconBorder: 'border-blue-4',
        iconGradient: 'from-blue-3 to-blue-5',
        bar: 'bg-blue-9',
        barGradient: 'from-blue-8 to-blue-10',
        ring: 'focus-visible:ring-blue-7/40',
        accent: 'text-blue-11',
        pillBg: 'bg-blue-2',
        pillText: 'text-blue-11',
        pillBorder: 'border-blue-4',
        subtleText: 'text-blue-10',
        hoverBg: 'group-hover:bg-blue-1/40',
        glow: 'shadow-blue-9/20',
    },
    green: {
        iconBg: 'bg-green-2',
        iconText: 'text-green-11',
        iconBorder: 'border-green-4',
        iconGradient: 'from-green-3 to-green-5',
        bar: 'bg-green-9',
        barGradient: 'from-green-8 to-green-10',
        ring: 'focus-visible:ring-green-7/40',
        accent: 'text-green-11',
        pillBg: 'bg-green-2',
        pillText: 'text-green-11',
        pillBorder: 'border-green-4',
        subtleText: 'text-green-10',
        hoverBg: 'group-hover:bg-green-1/40',
        glow: 'shadow-green-9/20',
    },
    orange: {
        iconBg: 'bg-orange-2',
        iconText: 'text-orange-11',
        iconBorder: 'border-orange-4',
        iconGradient: 'from-orange-3 to-orange-5',
        bar: 'bg-orange-9',
        barGradient: 'from-orange-8 to-orange-10',
        ring: 'focus-visible:ring-orange-7/40',
        accent: 'text-orange-11',
        pillBg: 'bg-orange-2',
        pillText: 'text-orange-11',
        pillBorder: 'border-orange-4',
        subtleText: 'text-orange-10',
        hoverBg: 'group-hover:bg-orange-1/40',
        glow: 'shadow-orange-9/20',
    },
    red: {
        iconBg: 'bg-red-2',
        iconText: 'text-red-11',
        iconBorder: 'border-red-4',
        iconGradient: 'from-red-3 to-red-5',
        bar: 'bg-red-9',
        barGradient: 'from-red-8 to-red-10',
        ring: 'focus-visible:ring-red-7/40',
        accent: 'text-red-11',
        pillBg: 'bg-red-2',
        pillText: 'text-red-11',
        pillBorder: 'border-red-4',
        subtleText: 'text-red-10',
        hoverBg: 'group-hover:bg-red-1/40',
        glow: 'shadow-red-9/20',
    },
    teal: {
        iconBg: 'bg-teal-2',
        iconText: 'text-teal-11',
        iconBorder: 'border-teal-4',
        iconGradient: 'from-teal-3 to-teal-5',
        bar: 'bg-teal-9',
        barGradient: 'from-teal-8 to-teal-10',
        ring: 'focus-visible:ring-teal-7/40',
        accent: 'text-teal-11',
        pillBg: 'bg-teal-2',
        pillText: 'text-teal-11',
        pillBorder: 'border-teal-4',
        subtleText: 'text-teal-10',
        hoverBg: 'group-hover:bg-teal-1/40',
        glow: 'shadow-teal-9/20',
    },
}

// --- Sub-Components ---
const StatusPill = ({ theme, text }: { theme: SummaryTheme; text: string }) => {
    const t = SUMMARY_THEMES[theme]
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-md border px-2.5 py-1 text-11 font-semibold',
                t.pillBg,
                t.pillText,
                t.pillBorder
            )}
            aria-label={`Status: ${text}`}
        >
            {text}
        </span>
    )
}

// --- Main Component ---
export const SummaryCard = forwardRef<HTMLDivElement, SummaryCardProps>(({
    label,
    value,
    subLabel,
    icon,
    theme = 'blue',
    progress,
    status,
    helperIcon,
    onClick,
    className,
    ...props
}, ref) => {
    const prefersReducedMotion = useReducedMotion()
    const t = SUMMARY_THEMES[theme]
    // Always show progress bar, default to 100 if not provided
    const pct = progress !== undefined ? Math.min(Math.max(progress, 0), 100) : 100
    const isInteractive = !!onClick

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (isInteractive && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            onClick?.(e as any)
        }
    }

    // Determine helper icon based on theme if not provided
    const defaultHelperIcon = helperIcon || (['green', 'blue', 'teal'].includes(theme)
        ? 'tabler:trending-up'
        : 'tabler:alert-circle')

    return (
        <motion.div
            ref={ref}
            variants={{
                hidden: { opacity: 0, y: 8, scale: 0.98 },
                show: { opacity: 1, y: 0, scale: 1 }
            }}
            whileHover={isInteractive && !prefersReducedMotion
                ? { y: -3, transition: { duration: 0.2 } }
                : undefined}
            whileTap={isInteractive && !prefersReducedMotion
                ? { scale: 0.99, transition: { duration: 0.1 } }
                : undefined}
            transition={{
                type: 'spring',
                stiffness: 400,
                damping: 30,
                opacity: { duration: 0.2 }
            }}
            role={isInteractive ? 'button' : 'article'}
            tabIndex={isInteractive ? 0 : -1}
            aria-label={isInteractive ? `${label}: ${value}. ${subLabel}` : undefined}
            aria-describedby={isInteractive ? `summary-card-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined}
            onKeyDown={handleKeyDown}
            onClick={onClick}
            className={cn(
                // Base styles
                'group relative overflow-hidden rounded-2xl border border-[var(--gray-4)]',
                'bg-white/95 backdrop-blur-sm',
                'shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.08)]',
                // Interactive states
                isInteractive && [
                    'cursor-pointer transition-all duration-300',
                    'hover:border-[var(--gray-5)]',
                    'hover:shadow-[0_4px_16px_rgba(0,0,0,0.12),0_8px_24px_rgba(0,0,0,0.08)]',
                    'active:scale-[0.99]',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                    t.ring,
                ],
                // Non-interactive
                !isInteractive && 'cursor-default',
                className
            )}
            {...props}
        >
            {/* Decorative gradient overlay */}
            <div
                className={cn(
                    'pointer-events-none absolute inset-0 bg-gradient-to-br opacity-30',
                    theme === 'blue' && 'from-blue-1/20 via-transparent to-transparent',
                    theme === 'green' && 'from-green-1/20 via-transparent to-transparent',
                    theme === 'orange' && 'from-orange-1/20 via-transparent to-transparent',
                    theme === 'red' && 'from-red-1/20 via-transparent to-transparent',
                    theme === 'teal' && 'from-teal-1/20 via-transparent to-transparent',
                    'transition-opacity duration-300 group-hover:opacity-40'
                )}
                aria-hidden="true"
            />

            {/* Subtle accent background on hover */}
            {isInteractive && (
                <div
                    className={cn(
                        'pointer-events-none absolute inset-0 transition-all duration-300',
                        t.hoverBg
                    )}
                    aria-hidden="true"
                />
            )}

            {/* Content Container */}
            <div className="relative flex flex-col gap-5 p-6">
                {/* Header Section */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                        {/* Icon with gradient background */}
                        <div
                            className={cn(
                                'relative flex size-9 shrink-0 items-center justify-center rounded-xl',
                                'border-2 transition-all duration-300',
                                t.iconBg,
                                t.iconText,
                                t.iconBorder,
                                isInteractive && 'group-hover:scale-105 group-hover:border-opacity-70',
                                'shadow-sm'
                            )}
                            aria-hidden="true"
                        >
                            {/* Gradient overlay on icon */}
                            <div
                                className={cn(
                                    'absolute inset-0 rounded-xl bg-gradient-to-br opacity-50',
                                    t.iconGradient
                                )}
                            />
                            <Icon name={icon} className="relative size-5 z-10" />
                        </div>

                        {/* Label & Status */}
                        <div className="w-full flex flex-row pt-0.5 mt-1.5 items-center justify-between">
                            <h3 className="text-15 font-semibold text-[var(--gray-12)] leading-tight truncate">
                                {label}
                            </h3>
                            {status && (
                                <div className="">
                                    <StatusPill theme={theme} text={status} />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Interactive Indicator */}
                    {isInteractive && (
                        <Icon
                            name="tabler:arrow-up-right"
                            className={cn(
                                'size-4 shrink-0 text-[var(--gray-9)]',
                                'opacity-0 transition-all duration-300',
                                'group-hover:opacity-100 group-hover:translate-x-1 group-hover:-translate-y-1',
                                'group-focus-visible:opacity-100'
                            )}
                            aria-hidden="true"
                        />
                    )}
                </div>

                {/* Value Section - Primary Focus */}
                <div className="flex items-baseline gap-2">
                    <span
                        className="text-28 font-bold text-[var(--gray-13)] leading-none tracking-tight tabular-nums"
                        aria-label={`Value: ${value}`}
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
                <div className="relative">
                    <div className="mb-1.5 flex items-center justify-between text-11 text-[var(--gray-10)]">
                        <span
                            className="truncate leading-relaxed font-medium"
                            id={isInteractive ? `summary-card-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined}
                        >
                            {subLabel}
                        </span>
                        <Icon
                            name={defaultHelperIcon}
                            className={cn('size-4 shrink-0', t.subtleText)}
                            aria-hidden="true"
                        />

                    </div>
                    <div
                        className={cn(
                            'relative h-2.5 w-full rounded-full overflow-hidden',
                            'bg-[var(--gray-3)] shadow-inner'
                        )}
                        role="progressbar"
                        aria-valuenow={pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Progress: ${pct}%`}
                    >
                        {/* Progress bar track with gradient */}
                        <motion.div
                            className={cn(
                                'relative h-full rounded-full',
                                'bg-gradient-to-r',
                                t.barGradient,
                                'shadow-sm'
                            )}
                            initial={prefersReducedMotion ? false : { width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={
                                prefersReducedMotion
                                    ? { duration: 0 }
                                    : {
                                        duration: 0.8,
                                        ease: [0.16, 1, 0.3, 1] // Custom easing for smooth animation
                                    }
                            }
                        >
                            {/* Subtle shine effect on progress bar */}
                            <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full"
                                animate={prefersReducedMotion ? {} : {
                                    x: ['-100%', '200%'],
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: 'linear'
                                }}
                            />
                        </motion.div>
                    </div>
                </div>
            </div>
        </motion.div>
    )
})

SummaryCard.displayName = 'SummaryCard'
