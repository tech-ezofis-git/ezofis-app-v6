import React, { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SummaryBadge from '@/components/common/SummaryBadge'
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'

interface SummaryMetricProps {
    metric: any
    onFileSelect?: (file: any) => void
}

const SummaryMetric: React.FC<SummaryMetricProps> = ({ metric, onFileSelect }) => {
    const triggerRef = useRef<HTMLDivElement>(null)
    const [position, setPosition] = useState<'top' | 'bottom'>('top')

    const handleMouseEnter = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect()
            if (rect.top < 250) {
                setPosition('bottom')
            } else {
                setPosition('top')
            }
        }
    }

    const isAttachments = metric.label === 'Attachments'

    return (
        <div
            ref={triggerRef}
            className="relative group/icon"
            onMouseEnter={handleMouseEnter}
        >
            <motion.div
                whileHover={{ scale: 1.05, y: -1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
                <SummaryBadge
                    label={metric.badgeText}
                    icon={metric.icon}
                    theme={metric.theme}
                    variant="outline"
                    className="cursor-default w-[160px]"
                />
            </motion.div>

            <AnimatePresence>
                <div className={cn(
                    "absolute right-0 opacity-0 invisible group-hover/icon:opacity-100 group-hover/icon:visible transition-all duration-300 z-[100] pointer-events-none",
                    position === 'top'
                        ? "bottom-full mb-3 translate-y-2 group-hover/icon:translate-y-0"
                        : "top-full mt-3 -translate-y-2 group-hover/icon:translate-y-0"
                )}>
                    <motion.div
                        layout
                        initial={{ opacity: 0, y: position === 'top' ? 10 : -10, scale: 0.95 }}
                        whileInView={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        className="bg-white rounded-xl border border-[var(--gray-3)] shadow-xl p-4 min-w-[260px] overflow-hidden relative pointer-events-auto"
                    >
                        {/* Background decoration */}
                        <div className={cn(
                            "absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 -mr-16 -mt-16 pointer-events-none",
                            metric.theme === 'green' ? 'bg-[var(--green-9)]' :
                                metric.theme === 'orange' ? 'bg-[var(--orange-9)]' :
                                    metric.theme === 'red' ? 'bg-[var(--red-9)]' :
                                        'bg-[var(--blue-9)]'
                        )} />

                        <div className="flex items-start justify-between mb-4 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "p-2 rounded-lg",
                                    metric.theme === 'green' ? 'bg-[var(--green-2)] text-[var(--green-11)]' :
                                        metric.theme === 'orange' ? 'bg-[var(--orange-2)] text-[var(--orange-11)]' :
                                            metric.theme === 'red' ? 'bg-[var(--red-2)] text-[var(--red-11)]' :
                                                'bg-[var(--blue-2)] text-[var(--blue-11)]'
                                )}>
                                    <Icon name={metric.icon} className="size-5" />
                                </div>
                                <div className="font-semibold text-[var(--gray-12)] text-13">
                                    {metric.label}
                                </div>
                            </div>
                            <div className={cn(
                                "px-2 py-0.5 rounded-full text-11 font-medium border",
                                metric.theme === 'green' ? 'bg-[var(--green-2)] text-[var(--green-11)] border-[var(--green-4)]' :
                                    metric.theme === 'orange' ? 'bg-[var(--orange-2)] text-[var(--orange-11)] border-[var(--orange-4)]' :
                                        metric.theme === 'red' ? 'bg-[var(--red-2)] text-[var(--red-11)] border-[var(--red-4)]' :
                                            'bg-[var(--blue-2)] text-[var(--blue-11)] border-[var(--blue-4)]'
                            )}>
                                {metric.status}
                            </div>
                        </div>

                        {/* Content */}
                        {isAttachments && metric.files ? (
                            <div className="flex flex-col gap-2 relative z-10">
                                {metric.files.map((file: any, index: number) => (
                                    <motion.div
                                        key={index}
                                        layout
                                        whileHover={{ x: 4 }}
                                        className="group/file flex items-start gap-2 cursor-pointer text-[var(--primary-9)] hover:underline"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onFileSelect?.(file)
                                        }}
                                    >
                                        <Icon name="tabler:file" className="size-4 opacity-70 mt-0.5 shrink-0" />
                                        <span className="text-12 font-medium break-all line-clamp-1 group-hover/file:line-clamp-none transition-all">{file.name}</span>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <>
                                <div className="mb-4 relative z-10">
                                    <h4 className="text-24 font-bold text-[var(--gray-12)] tracking-tight">
                                        {metric.value}
                                    </h4>
                                </div>

                                <div className="flex items-end justify-between relative z-10">
                                    <div className="flex flex-col gap-1.5 flex-1 mr-4">
                                        <div className="flex items-center gap-1.5 text-[var(--gray-10)]">
                                            <span className="text-12 font-medium">{metric.description}</span>
                                            {metric.theme === 'red' && <Icon name="tabler:exclamation-circle" className="size-4 text-[var(--red-9)]" />}
                                        </div>
                                        <div className="h-1.5 w-full bg-[var(--gray-3)] rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${metric.pct}%` }}
                                                transition={{ duration: 0.5, delay: 0.1 }}
                                                className={cn(
                                                    'h-full rounded-full',
                                                    metric.theme === 'green' ? 'bg-[var(--green-9)]' :
                                                        metric.theme === 'orange' ? 'bg-[var(--orange-9)]' :
                                                            metric.theme === 'red' ? 'bg-[var(--red-9)]' :
                                                                'bg-[var(--blue-9)]'
                                                )}
                                            />
                                        </div>
                                    </div>

                                    {/* Animated Arrow */}
                                    <motion.div
                                        whileHover={{ x: 3 }}
                                        className="flex items-center justify-center p-1.5 rounded-full bg-[var(--gray-2)] text-[var(--gray-10)]"
                                    >
                                        <Icon name="tabler:chevron-right" className="size-4" />
                                    </motion.div>
                                </div>
                            </>
                        )}
                    </motion.div>
                </div>
            </AnimatePresence>
        </div>
    )
}

export default SummaryMetric
