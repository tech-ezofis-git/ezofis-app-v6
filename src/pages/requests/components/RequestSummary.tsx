import React, { useEffect, useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useRequestDetail } from '@/pages/requests/hooks/useRequestDetails'
import requestStore from '../stores/useRequestStore'
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'

interface RequestSummaryProps {
    workflowId: number
    processId: number
    transactionId: number
    requestNo: string
}

type Theme = 'blue' | 'green' | 'orange' | 'red' | 'teal'

const THEMES: Record<
    Theme,
    {
        iconBg: string
        iconText: string
        bar: string
        ring: string
        wash: string
        pillBg: string
        pillText: string
        subtleText: string
        skeletonTint: string
    }
> = {
    blue: {
        iconBg: 'bg-blue-3',
        iconText: 'text-blue-11',
        bar: 'bg-blue-9',
        ring: 'focus-visible:ring-blue-7/35',
        wash: 'from-blue-2/60 via-transparent to-transparent',
        pillBg: 'bg-blue-3',
        pillText: 'text-blue-11',
        subtleText: 'text-blue-11',
        skeletonTint: 'from-blue-2/40'
    },
    green: {
        iconBg: 'bg-green-3',
        iconText: 'text-green-11',
        bar: 'bg-green-9',
        ring: 'focus-visible:ring-green-7/35',
        wash: 'from-green-2/60 via-transparent to-transparent',
        pillBg: 'bg-green-3',
        pillText: 'text-green-11',
        subtleText: 'text-green-11',
        skeletonTint: 'from-green-2/40'
    },
    orange: {
        iconBg: 'bg-orange-3',
        iconText: 'text-orange-11',
        bar: 'bg-orange-8',
        ring: 'focus-visible:ring-orange-7/35',
        wash: 'from-orange-2/60 via-transparent to-transparent',
        pillBg: 'bg-orange-3',
        pillText: 'text-orange-11',
        subtleText: 'text-orange-11',
        skeletonTint: 'from-orange-2/40'
    },
    red: {
        iconBg: 'bg-red-3',
        iconText: 'text-red-11',
        bar: 'bg-red-8',
        ring: 'focus-visible:ring-red-7/35',
        wash: 'from-red-2/60 via-transparent to-transparent',
        pillBg: 'bg-red-3',
        pillText: 'text-red-11',
        subtleText: 'text-red-11',
        skeletonTint: 'from-red-2/40'
    },
    teal: {
        iconBg: 'bg-teal-3',
        iconText: 'text-teal-11',
        bar: 'bg-teal-9',
        ring: 'focus-visible:ring-teal-7/35',
        wash: 'from-teal-2/60 via-transparent to-transparent',
        pillBg: 'bg-teal-3',
        pillText: 'text-teal-11',
        subtleText: 'text-teal-11',
        skeletonTint: 'from-teal-2/40'
    }
}

function clampPercent(n: number) {
    if (Number.isNaN(n)) return 0
    return Math.max(0, Math.min(100, Math.round(n)))
}

function pluralize(count: number, noun: string) {
    return `${count} ${noun}${count === 1 ? '' : 's'}`
}

const gridVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } }
}

const cardVariants = {
    hidden: { opacity: 0, y: 10, scale: 0.99 },
    show: { opacity: 1, y: 0, scale: 1 }
}

function StatusPill({ theme, text }: { theme: Theme; text: string }) {
    const t = THEMES[theme]
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full px-2.5 py-1',
                'text-11 font-semibold tracking-wide',
                t.pillBg,
                t.pillText
            )}
        >
            {text}
        </span>
    )
}

/**
 * ✅ Skeleton card that matches the exact card layout:
 * header (icon + label + pill), metric, helper line, progress bar
 */
const SkeletonCard = ({ theme, index }: { theme: Theme; index: number }) => {
    const prefersReducedMotion = useReducedMotion()
    const t = THEMES[theme]

    // const shimmer = prefersReducedMotion
    //     ? undefined
    //     : ({
    //         animate: { x: ['-60%', '160%'] },
    //         transition: {
    //             duration: 1.2,
    //             repeat: Infinity,
    //             ease: (t: number) => t, // ✅ linear easing, TS-safe
    //             delay: index * 0.08
    //         }
    //     } as const)
    // const prefersReducedMotion = useReducedMotion()


    return (
        <motion.div
            variants={cardVariants}
            className={cn(
                'group relative overflow-hidden rounded-2xl',
                'border border-[var(--gray-3)] bg-white/90 shadow-[0_1px_2px_rgba(16,24,40,0.06),0_10px_24px_rgba(16,24,40,0.06)]',
                'backdrop-blur',
                'px-5 py-4'
            )}
            aria-busy="true"
            aria-label="Loading summary"
        >
            {/* subtle tinted wash like real card */}
            <div className={cn('pointer-events-none absolute inset-0 bg-gradient-to-br opacity-60', t.wash)} />

            {/* shimmer overlay */}
            <motion.div
                className={cn(
                    'pointer-events-none absolute inset-0',
                    'bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.55),transparent)]'
                )}
                style={{ mixBlendMode: 'overlay' }}
                animate={prefersReducedMotion ? undefined : { x: ['-60%', '160%'] }}
                transition={
                    prefersReducedMotion
                        ? undefined
                        : {
                            duration: 1.2,
                            repeat: Infinity,
                            ease: [0, 0, 1, 1], // ✅ linear cubic-bezier, TS-safe
                            delay: index * 0.08
                        }
                }
            />

            <div className="relative">
                {/* header */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                        <div className={cn('flex size-10 shrink-0 rounded-2xl', t.iconBg)} />
                        <div className="min-w-0 flex-1">
                            <div className="h-3.5 w-32 rounded bg-[var(--gray-3)]/80" />
                            <div className="mt-2 h-6 w-20 rounded-full bg-[var(--gray-3)]/70" />
                        </div>
                    </div>
                    <div className="h-4 w-4 rounded bg-[var(--gray-3)]/60" />
                </div>

                {/* metric slot (same height as real) */}
                <div className="mt-4 min-h-[40px] flex items-end">
                    <div className="h-7 w-28 rounded bg-[var(--gray-3)]/80" />
                </div>

                {/* helper row */}
                <div className="mt-3 flex items-center gap-2">
                    <div className={cn('h-4 w-4 rounded-full bg-[var(--gray-3)]/70')} />
                    <div className="h-3 w-44 rounded bg-[var(--gray-3)]/70" />
                </div>

                {/* progress */}
                <div className="mt-4 h-2 w-full rounded-full bg-[var(--gray-3)]/70 overflow-hidden">
                    <div className={cn('h-full rounded-full opacity-70', t.bar)} style={{ width: '55%' }} />
                </div>
            </div>
        </motion.div>
    )
}

const SummaryCard = ({
    label,
    value,
    subLabel,
    icon,
    theme = 'blue',
    progress = 100,
    status,
    helperIcon
}: {
    label: string
    value: string | number
    subLabel: string
    icon: string
    theme: Theme
    progress?: number
    status?: string
    helperIcon?: string
}) => {
    const prefersReducedMotion = useReducedMotion()
    const t = THEMES[theme]
    const pct = clampPercent(progress)

    return (
        <motion.div
            variants={cardVariants}
            whileHover={prefersReducedMotion ? undefined : { y: -3 }}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.995 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            tabIndex={0}
            className={cn(
                'group relative overflow-hidden rounded-2xl',
                'border border-[var(--gray-3)] bg-white/90 shadow-[0_1px_2px_rgba(16,24,40,0.06),0_10px_24px_rgba(16,24,40,0.06)]',
                'backdrop-blur',
                'px-5 py-4',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                t.ring
            )}
        >
            {/* premium wash */}
            <div className={cn('pointer-events-none absolute inset-0 bg-gradient-to-br opacity-70', t.wash)} />
            <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100 bg-[var(--gray-1)]/30" />

            {/* header */}
            <div className="relative flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                    <div
                        className={cn(
                            'flex size-10 shrink-0 items-center justify-center rounded-2xl',
                            t.iconBg,
                            t.iconText,
                            'shadow-[0_1px_0_rgba(16,24,40,0.06)]'
                        )}
                    >
                        <Icon name={icon} className="size-5" />
                    </div>

                    <div className="min-w-0">
                        <div className="text-13 font-semibold text-[var(--gray-12)] truncate">{label}</div>
                        {status ? <div className="mt-2">{<StatusPill theme={theme} text={status} />}</div> : null}
                    </div>
                </div>

                <Icon
                    name="tabler:arrow-up-right"
                    className="size-4 text-[var(--gray-8)] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                />
            </div>

            {/* metric slot */}
            <div className="relative min-h-[40px] flex items-end">
                <div className="text-[var(--gray-13)] font-bold leading-none tracking-tight tabular-nums">
                    <span className="text-28">{value}</span>
                </div>
            </div>

            {/* sub label row */}
            <div className="relative mt-3 flex items-center gap-2 text-12 text-[var(--gray-9)]">
                <Icon
                    name={
                        helperIcon ||
                        (theme === 'green' || theme === 'blue' || theme === 'teal'
                            ? 'tabler:circle-check'
                            : 'tabler:info-circle')
                    }
                    className={cn('size-4', t.subtleText)}
                />
                <span className="truncate">{subLabel}</span>
            </div>

            {/* progress */}
            <div className="relative mt-4 h-2 w-full rounded-full bg-[var(--gray-3)]/70 overflow-hidden">
                <motion.div
                    className={cn('h-full rounded-full', t.bar)}
                    initial={prefersReducedMotion ? false : { width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.8, ease: 'easeOut' }}
                />
            </div>
        </motion.div>
    )
}

const RequestSummary: React.FC<RequestSummaryProps> = ({
    workflowId,
    processId,
    transactionId,
    requestNo
}) => {
    const cacheSummaryData = requestStore((state) => state.cacheSummaryData)
    const { data: request, isLoading } = useRequestDetail(workflowId, processId, transactionId)

    const agentData = useMemo(() => {
        if (!request) return null
        return Array.isArray(request?._agentData) ? request?._agentData[0] : request
    }, [request])

    useEffect(() => {
        if (agentData) cacheSummaryData(requestNo, agentData)
    }, [agentData, requestNo, cacheSummaryData])

    if (isLoading) {
        // ✅ Skeleton loader mirrors the real UI, not generic blocks
        const skeletonThemes: Theme[] = ['blue', 'teal', 'green', 'orange']
        return (
            <motion.div
                variants={gridVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            >
                {skeletonThemes.map((theme, i) => (
                    <SkeletonCard key={`${theme}-${i}`} theme={theme} index={i} />
                ))}
            </motion.div>
        )
    }

    if (!agentData) return null

    const score = Number(agentData?.score ?? 0)
    const decisionRaw = (agentData?.decision || 'PENDING') as string
    const lineItems = agentData?.['Extracted Invoice JSON']?.line_items || []
    const errorCount = agentData?.invoice_errors?.errors?.length || 0
    const isDuplicate = Boolean(agentData?.is_duplicate_invoice)

    // Score
    const scorePct = clampPercent(score)
    const scoreTheme: Theme = scorePct > 80 ? 'green' : scorePct > 50 ? 'orange' : 'red'
    const scoreStatus = scoreTheme === 'green' ? 'Strong' : scoreTheme === 'orange' ? 'Moderate' : 'Low'

    // Decision (normalize display)
    const decisionDisplay =
        decisionRaw === 'APPROVED'
            ? 'APPROVED'
            : decisionRaw === 'REJECTED'
                ? 'REJECTED'
                : decisionRaw === 'PARTIALLY_APPROVED' || decisionRaw === 'PARTIALLY APPROVED'
                    ? 'PARTIALLY APPROVED'
                    : 'IN REVIEW'

    const decisionTheme: Theme =
        decisionDisplay === 'APPROVED' ? 'green' : decisionDisplay === 'REJECTED' ? 'red' : 'blue'

    const decisionProgress =
        decisionDisplay === 'APPROVED' ? 100 : decisionDisplay === 'REJECTED' ? 100 : 72

    // Extracted
    const extractedTheme: Theme = lineItems.length > 0 ? 'green' : 'orange'
    const extractedStatus = lineItems.length > 0 ? 'Complete' : 'Partial'
    const extractedProgress = lineItems.length > 0 ? 100 : 48

    // Validation
    const validationTheme: Theme = isDuplicate || errorCount > 0 ? 'orange' : 'green'
    const validationStatus = isDuplicate ? 'Needs review' : errorCount > 0 ? 'Fix required' : 'Healthy'

    const validationValue =
        isDuplicate ? 'Duplicate' : errorCount > 0 ? pluralize(errorCount, 'Error') : 'Passed'

    const validationSub =
        isDuplicate ? 'Manual check required' : errorCount > 0 ? 'Action needed' : 'Record is valid'

    const validationProgress = isDuplicate ? 58 : errorCount > 0 ? 68 : 100

    return (
        <div className="flex flex-col gap-4">
            <motion.div
                variants={gridVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            >
                <SummaryCard
                    label="Confidence Score"
                    value={`${scorePct}%`}
                    subLabel="Extraction quality signal"
                    icon="tabler:percentage"
                    theme={scoreTheme}
                    progress={scorePct}
                    status={scoreStatus}
                />

                <SummaryCard
                    label="AI Decision"
                    value={decisionDisplay}
                    subLabel="Policy + anomaly checks"
                    icon="tabler:gavel"
                    theme={decisionTheme}
                    progress={decisionProgress}
                    status={decisionDisplay === 'APPROVED' ? 'Approved' : decisionDisplay === 'REJECTED' ? 'Not Approved' : 'In review'}
                />

                <SummaryCard
                    label="Extracted Data"
                    value={lineItems.length}
                    subLabel="Invoice line items detected"
                    icon="tabler:table"
                    theme={extractedTheme}
                    progress={extractedProgress}
                    status={extractedStatus}
                />

                <SummaryCard
                    label="Validation"
                    value={validationValue}
                    subLabel={validationSub}
                    icon={isDuplicate || errorCount > 0 ? 'tabler:alert-triangle' : 'tabler:file-check'}
                    theme={validationTheme}
                    progress={validationProgress}
                    status={validationStatus}
                    helperIcon={isDuplicate || errorCount > 0 ? 'tabler:info-circle' : 'tabler:circle-check'}
                />
            </motion.div>
        </div>
    )
}

export default RequestSummary
