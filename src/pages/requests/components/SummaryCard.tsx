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
        iconBg: string; iconText: string; bar: string; ring: string;
        wash: string; pillBg: string; pillText: string; subtleText: string;
    }
> = {
    blue: {
        iconBg: 'bg-blue-3', iconText: 'text-blue-11', bar: 'bg-blue-9',
        ring: 'focus-visible:ring-blue-7/35', wash: 'from-blue-2/60 via-transparent',
        pillBg: 'bg-blue-3', pillText: 'text-blue-11', subtleText: 'text-blue-11',
    },
    green: {
        iconBg: 'bg-green-3', iconText: 'text-green-11', bar: 'bg-green-9',
        ring: 'focus-visible:ring-green-7/35', wash: 'from-green-2/60 via-transparent',
        pillBg: 'bg-green-3', pillText: 'text-green-11', subtleText: 'text-green-11',
    },
    orange: {
        iconBg: 'bg-orange-3', iconText: 'text-orange-11', bar: 'bg-orange-8',
        ring: 'focus-visible:ring-orange-7/35', wash: 'from-orange-2/60 via-transparent',
        pillBg: 'bg-orange-3', pillText: 'text-orange-11', subtleText: 'text-orange-11',
    },
    red: {
        iconBg: 'bg-red-3', iconText: 'text-red-11', bar: 'bg-red-8',
        ring: 'focus-visible:ring-red-7/35', wash: 'from-red-2/60 via-transparent',
        pillBg: 'bg-red-3', pillText: 'text-red-11', subtleText: 'text-red-11',
    },
    teal: {
        iconBg: 'bg-teal-3', iconText: 'text-teal-11', bar: 'bg-teal-9',
        ring: 'focus-visible:ring-teal-7/35', wash: 'from-teal-2/60 via-transparent',
        pillBg: 'bg-teal-3', pillText: 'text-teal-11', subtleText: 'text-teal-11',
    }
}

// --- Sub-Components ---
const StatusPill = ({ theme, text }: { theme: SummaryTheme; text: string }) => {
    const t = SUMMARY_THEMES[theme]
    return (
        <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-11 font-semibold tracking-wide', t.pillBg, t.pillText)}>
            {text}
        </span>
    )
}

// --- Main Component ---
export const SummaryCard = forwardRef<HTMLDivElement, SummaryCardProps>(({
    label, value, subLabel, icon, theme = 'blue', progress = 100, status, helperIcon, onClick, className, ...props
}, ref) => {
    const prefersReducedMotion = useReducedMotion()
    const t = SUMMARY_THEMES[theme]
    const pct = Math.min(Math.max(progress || 0, 0), 100)
    const isInteractive = !!onClick

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (isInteractive && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            onClick?.(e as any)
        }
    }

    return (
        <motion.div
            ref={ref}
            variants={{
                hidden: { opacity: 0, y: 10, scale: 0.99 },
                show: { opacity: 1, y: 0, scale: 1 }
            }}
            whileHover={isInteractive && !prefersReducedMotion ? { y: -3 } : undefined}
            whileTap={isInteractive && !prefersReducedMotion ? { scale: 0.995 } : undefined}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            role={isInteractive ? 'button' : 'article'}
            tabIndex={isInteractive ? 0 : -1}
            onKeyDown={handleKeyDown}
            onClick={onClick}
            className={cn(
                'group relative overflow-hidden rounded-2xl border border-[var(--gray-3)] bg-white/90 p-5 backdrop-blur',
                'shadow-[0_1px_2px_rgba(16,24,40,0.06),0_10px_24px_rgba(16,24,40,0.06)]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                isInteractive ? 'cursor-pointer' : 'cursor-default',
                t.ring,
                className
            )}
            {...props}
        >
            {/* Background Wash */}
            <div className={cn('pointer-events-none absolute inset-0 bg-gradient-to-br opacity-70', t.wash)} />

            {/* Header */}
            <div className="relative flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                    <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-2xl shadow-[0_1px_0_rgba(16,24,40,0.06)]', t.iconBg, t.iconText)}>
                        <Icon name={icon} className="size-5" />
                    </div>
                    <div className="min-w-0">
                        <div className="text-13 font-semibold text-[var(--gray-12)] truncate">{label}</div>
                        {status && <div className="mt-2"><StatusPill theme={theme} text={status} /></div>}
                    </div>
                </div>
                {isInteractive && (
                    <Icon name="tabler:arrow-up-right" className="size-4 text-[var(--gray-8)] opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                )}
            </div>

            {/* Metric */}
            <div className="relative min-h-[40px] flex items-end">
                <span className="text-28 text-[var(--gray-13)] font-bold leading-none tracking-tight tabular-nums">{value}</span>
            </div>

            {/* Footer */}
            <div className="relative mt-3 flex items-center gap-2 text-12 text-[var(--gray-9)]">
                <Icon
                    name={helperIcon || (['green', 'blue', 'teal'].includes(theme) ? 'tabler:circle-check' : 'tabler:info-circle')}
                    className={cn('size-4', t.subtleText)}
                />
                <span className="truncate">{subLabel}</span>
            </div>

            {/* Progress Bar */}
            <div className="relative mt-4 h-2 w-full rounded-full bg-[var(--gray-3)]/70 overflow-hidden" role="progressbar" aria-valuenow={pct}>
                <motion.div
                    className={cn('h-full rounded-full', t.bar)}
                    initial={prefersReducedMotion ? false : { width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.8, ease: 'easeOut' }}
                />
            </div>
        </motion.div>
    )
})

SummaryCard.displayName = 'SummaryCard'