import { AnimatePresence, motion } from 'framer-motion'
import React, { useRef, useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import SummaryBadge from '@/components/common/SummaryBadge'
import cn from '@/utils/cn'

interface SummaryMetricProps {
  metric: any
  children?: React.ReactNode
  onFileSelect?: (file: any) => void
}

const SummaryMetric: React.FC<SummaryMetricProps> = ({
  children,
  metric,
  onFileSelect,
}) => {
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
      className='group/icon relative'
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
    >
      {/* Trigger (Badge or Custom) */}
      <motion.div
        transition={{ damping: 20, stiffness: 400, type: 'spring' }}
        whileHover={{ y: -1 }}
      >
        {/* Allow custom trigger (e.g. compact chip) or default to SummaryBadge */}
        {children ? (
          children
        ) : (
          <SummaryBadge
            className='cursor-default'
            icon={metric.icon}
            label={metric.badgeText}
            theme={metric.theme}
            variant='outline'
          />
        )}
      </motion.div>

      <AnimatePresence>
        <div
          className={cn(
            'pointer-events-none invisible absolute right-0 z-[100] opacity-0 transition-all duration-300 group-hover/icon:visible group-hover/icon:opacity-100',
            position === 'top'
              ? 'bottom-full mb-3 translate-y-2 group-hover/icon:translate-y-0'
              : 'top-full mt-3 -translate-y-2 group-hover/icon:translate-y-0',
          )}
        >
          <motion.div
            className='pointer-events-auto relative min-w-[260px] overflow-hidden rounded-xl border border-[var(--gray-3)] bg-surface p-4 shadow-xl'
            transition={{ damping: 25, stiffness: 400, type: 'spring' }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            layout
            initial={{
              opacity: 0,
              scale: 0.95,
              y: position === 'top' ? 10 : -10,
            }}
          >
            {/* Background decoration */}
            <div
              className={cn(
                'pointer-events-none absolute top-0 right-0 -mt-16 -mr-16 h-32 w-32 rounded-full opacity-10 blur-3xl',
                metric.theme === 'green'
                  ? 'bg-[var(--green-9)]'
                  : metric.theme === 'orange'
                    ? 'bg-[var(--orange-9)]'
                    : metric.theme === 'red'
                      ? 'bg-[var(--red-9)]'
                      : 'bg-[var(--blue-9)]',
              )}
            />

            <div className='relative z-10 mb-4 flex items-start justify-between'>
              <div className='flex items-center gap-3'>
                <div
                  className={cn(
                    'rounded-lg p-2',
                    metric.theme === 'green'
                      ? 'bg-[var(--green-2)] text-[var(--green-11)]'
                      : metric.theme === 'orange'
                        ? 'bg-[var(--orange-2)] text-[var(--orange-11)]'
                        : metric.theme === 'red'
                          ? 'bg-[var(--red-2)] text-[var(--red-11)]'
                          : 'bg-[var(--blue-2)] text-[var(--blue-11)]',
                  )}
                >
                  <Icon className='size-5' name={metric.icon} />
                </div>
                <div className='text-13 font-semibold text-[var(--gray-12)]'>
                  {metric.label}
                </div>
              </div>
              <div
                className={cn(
                  'rounded-full border px-2 py-0.5 text-11 font-medium',
                  metric.theme === 'green'
                    ? 'border-[var(--green-4)] bg-[var(--green-2)] text-[var(--green-11)]'
                    : metric.theme === 'orange'
                      ? 'border-[var(--orange-4)] bg-[var(--orange-2)] text-[var(--orange-11)]'
                      : metric.theme === 'red'
                        ? 'border-[var(--red-4)] bg-[var(--red-2)] text-[var(--red-11)]'
                        : 'border-[var(--blue-4)] bg-[var(--blue-2)] text-[var(--blue-11)]',
                )}
              >
                {metric.status}
              </div>
            </div>

            {/* Content */}
            {isAttachments && metric.files ? (
              <div className='relative z-10 flex flex-col gap-2'>
                {metric.files.map((file: any, index: number) => (
                  <motion.div
                    className='group/file flex cursor-pointer items-start gap-2 text-[var(--primary-9)] hover:underline'
                    key={index}
                    whileHover={{ x: 4 }}
                    layout
                    onClick={(e) => {
                      e.stopPropagation()
                      onFileSelect?.(file)
                    }}
                  >
                    <Icon
                      className='mt-0.5 size-4 shrink-0 opacity-70'
                      name='tabler:file'
                    />
                    <span className='line-clamp-1 text-12 font-medium break-all transition-all group-hover/file:line-clamp-none'>
                      {file.name}
                    </span>
                  </motion.div>
                ))}
              </div>
            ) : (
              <>
                <div className='relative z-10 mb-4'>
                  <h4 className='text-24 font-bold tracking-tight text-[var(--gray-12)]'>
                    {metric.value}
                  </h4>
                </div>

                <div className='relative z-10 flex items-end justify-between'>
                  <div className='mr-4 flex flex-1 flex-col gap-1.5'>
                    <div className='flex items-center gap-1.5 text-[var(--gray-10)]'>
                      <span className='text-12 font-medium'>
                        {metric.description}
                      </span>
                      {metric.theme === 'red' && (
                        <Icon
                          className='size-4 text-[var(--red-9)]'
                          name='tabler:exclamation-circle'
                        />
                      )}
                    </div>
                    <div className='h-1.5 w-full overflow-hidden rounded-full bg-[var(--gray-3)]'>
                      <motion.div
                        animate={{ width: `${metric.pct}%` }}
                        initial={{ width: 0 }}
                        transition={{ delay: 0.1, duration: 0.5 }}
                        className={cn(
                          'h-full rounded-full',
                          metric.theme === 'green'
                            ? 'bg-[var(--green-9)]'
                            : metric.theme === 'orange'
                              ? 'bg-[var(--orange-9)]'
                              : metric.theme === 'red'
                                ? 'bg-[var(--red-9)]'
                                : 'bg-[var(--blue-9)]',
                        )}
                      />
                    </div>
                  </div>

                  {/* Animated Arrow */}
                  <motion.div
                    className='flex items-center justify-center rounded-full bg-[var(--gray-2)] p-1.5 text-[var(--gray-10)]'
                    whileHover={{ x: 3 }}
                  >
                    <Icon className='size-4' name='tabler:chevron-right' />
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
