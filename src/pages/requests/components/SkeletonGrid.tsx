// import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import cn from '@/utils/cn'
import { SUMMARY_THEMES, type SummaryTheme } from './SummaryCard'

// Define the loading order/colors to match your typical data pattern
const LOADING_THEMES: SummaryTheme[] = ['blue', 'blue', 'green', 'orange']

const SkeletonCard = ({ theme, index }: { theme: SummaryTheme; index: number }) => {
    const prefersReducedMotion = useReducedMotion()
    const t = SUMMARY_THEMES[theme]

    return (
        <div
            className={cn(
                'relative overflow-hidden rounded-2xl border border-[var(--gray-3)] bg-white/90 p-5 shadow-sm',
                'backdrop-blur select-none'
            )}
            aria-hidden="true"
        >
            {/* 1. Static Background Wash (Matches real card) */}
            <div className={cn('absolute inset-0 bg-gradient-to-br opacity-60', t.wash)} />

            {/* 2. Shimmer Effect Overlay */}
            {!prefersReducedMotion && (
                <motion.div
                    className="absolute inset-0 -translate-x-full"
                    style={{
                        background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)`,
                    }}
                    animate={{ translateX: ['-100%', '200%'] }}
                    transition={{
                        repeat: Infinity,
                        duration: 1.5,
                        ease: 'linear',
                        delay: index * 0.15, // Stagger effect
                    }}
                />
            )}

            {/* 3. Skeleton Content Structure */}
            <div className="relative flex flex-col h-full justify-between">

                {/* Header Row */}
                <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-3 w-full">
                        {/* Icon Placeholder */}
                        <div className={cn('size-10 shrink-0 rounded-2xl opacity-50', t.iconBg)} />

                        {/* Text & Pill Placeholders */}
                        <div className="flex flex-col gap-2 w-full">
                            <div className="h-4 w-24 rounded bg-slate-200/80" /> {/* Label */}
                            <div className={cn('h-5 w-16 rounded-full opacity-40', t.pillBg)} /> {/* Status Pill */}
                        </div>
                    </div>
                </div>

                {/* Metric Value */}
                <div className="h-8 w-1/3 rounded bg-slate-200/80 mb-3" />

                {/* Sub-label Row */}
                <div className="flex items-center gap-2 mb-4">
                    <div className="size-4 rounded-full bg-slate-200" />
                    <div className="h-3 w-1/2 rounded bg-slate-200/60" />
                </div>

                {/* Progress Bar */}
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            aria-busy="true"
            aria-label="Loading request details"
        >
            {LOADING_THEMES.map((theme, i) => (
                <SkeletonCard key={i} theme={theme} index={i} />
            ))}
        </motion.div>
    )
}