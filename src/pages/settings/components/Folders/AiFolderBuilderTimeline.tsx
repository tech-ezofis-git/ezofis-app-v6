import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'

export type TimelineStepStatus = 'active' | 'completed' | 'upcoming'

export type TimelineConnectorState = 'hidden' | 'idle' | 'completed' | 'loading'

const LOADER_BAR_PX = 52
const LOADER_PX_PER_SEC = 48
const STEP_GAP_PX = 16

function trackColor(state: TimelineConnectorState) {
  if (state === 'completed') return 'bg-[var(--green-9)]'
  if (state === 'loading') return 'bg-primary-4'
  return 'bg-[var(--gray-4)]'
}

function StepCircle({
  stepId,
  status,
}: {
  stepId: number
  status: TimelineStepStatus
}) {
  const isActive = status === 'active'
  const isCompleted = status === 'completed'

  return (
    <span
      className={cn(
        'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold',
        isCompleted
          ? 'bg-[var(--green-3)] text-[var(--green-9)]'
          : isActive
            ? 'bg-primary-9 text-white'
            : 'bg-[var(--gray-3)] text-[var(--gray-10)]',
      )}
    >
      {isCompleted ? <Icon className='size-3.5' name='lucide:check' /> : stepId}
    </span>
  )
}

function ConnectorTrack({
  state,
  className,
  extendGap,
}: {
  state: TimelineConnectorState
  className?: string
  extendGap?: boolean
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(0)

  useEffect(() => {
    const node = trackRef.current
    if (!node) return

    const publish = () => {
      const base = node.getBoundingClientRect().height
      setHeight(extendGap ? base + STEP_GAP_PX : base)
    }
    publish()
    const observer = new ResizeObserver(publish)
    observer.observe(node)
    return () => observer.disconnect()
  }, [state, extendGap])

  if (state === 'hidden') {
    return null
  }

  const travel = Math.max(height, 0)
  const duration = Math.max(height / LOADER_PX_PER_SEC, 1.2)

  return (
    <div
      className={cn('relative min-h-0 w-[2px] flex-1', className)}
      ref={trackRef}
    >
      <div
        className={cn(
          'absolute inset-x-0 top-0 overflow-hidden',
          trackColor(state),
        )}
        style={{ bottom: extendGap ? -STEP_GAP_PX : 0 }}
      >
        {state === 'loading' && height > 0 ? (
          <>
            <motion.div
              animate={{ top: [-LOADER_BAR_PX, travel] }}
              className='absolute inset-x-0 rounded-full bg-primary-9'
              initial={{ top: -LOADER_BAR_PX }}
              style={{ height: LOADER_BAR_PX }}
              transition={{
                duration,
                ease: 'linear',
                repeat: Infinity,
                repeatType: 'loop',
              }}
            />
            <motion.div
              animate={{ top: [-LOADER_BAR_PX, travel] }}
              className='absolute inset-x-0 rounded-full bg-primary-7/70'
              initial={{ top: -LOADER_BAR_PX }}
              style={{ height: LOADER_BAR_PX }}
              transition={{
                delay: duration / 2,
                duration,
                ease: 'linear',
                repeat: Infinity,
                repeatType: 'loop',
              }}
            />
          </>
        ) : null}
      </div>
    </div>
  )
}

export function BuilderTimelineStep({
  stepId,
  status,
  title,
  description,
  summary,
  children,
  showTopConnector,
  topConnectorState,
  bottomConnectorState,
}: {
  stepId: number
  status: TimelineStepStatus
  title: string
  description: string
  summary?: ReactNode
  children?: ReactNode
  showTopConnector?: boolean
  topConnectorState: TimelineConnectorState
  bottomConnectorState: TimelineConnectorState
}) {
  const isActive = status === 'active'
  const isCompleted = status === 'completed'
  const showBody = Boolean((isCompleted && summary) || (isActive && children))
  const hasBottomConnector = bottomConnectorState !== 'hidden'

  return (
    <div>
      <div className='flex gap-4'>
        {/* Timeline — circle centered to card height */}
        <div className='flex w-8 shrink-0 flex-col self-stretch overflow-visible'>
          <div className='flex min-h-0 w-full flex-1 flex-col items-center'>
            {showTopConnector ? (
              <ConnectorTrack className='flex-1' state={topConnectorState} />
            ) : (
              <div className='min-h-0 w-[2px] flex-1' />
            )}

            <StepCircle status={status} stepId={stepId} />

            {hasBottomConnector ? (
              <ConnectorTrack
                extendGap
                className='flex-1'
                state={bottomConnectorState}
              />
            ) : (
              <div className='min-h-0 w-[2px] flex-1' />
            )}
          </div>
        </div>

        <motion.section
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'flex min-h-0 flex-1 flex-col overflow-hidden rounded-[16px] border bg-surface transition',
            isActive
              ? 'border-primary-9 shadow-[0_10px_28px_rgba(124,58,237,0.12)]'
              : isCompleted
                ? 'border-primary-4'
                : 'border-[var(--gray-3)] opacity-70',
          )}
          initial={{ opacity: 0, y: 14 }}
          layout
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        >
          <div
            className={cn(
              'flex shrink-0 items-center px-5 py-4',
              isActive || isCompleted
                ? 'bg-primary-2'
                : 'bg-[var(--gray-1)]',
              showBody ? 'border-b border-primary-4' : '',
            )}
          >
            <div className='min-w-0 flex-1'>
              <h2 className='text-[15px] font-semibold text-[var(--gray-13)]'>
                {title}
              </h2>
              {!isCompleted && (
                <p className='mt-0.5 text-[12px] text-[var(--gray-11)]'>
                  {description}
                </p>
              )}
            </div>
          </div>

          {isCompleted && summary ? (
            <div className='px-5 py-4'>{summary}</div>
          ) : null}

          {isActive ? (
            <div className='space-y-4 px-5 py-5'>{children}</div>
          ) : null}
        </motion.section>
      </div>

      {/* Spacer between steps — line extends into this via extendGap */}
      {hasBottomConnector ? (
        <div className='flex gap-4'>
          <div className='w-8 shrink-0' style={{ height: STEP_GAP_PX }} />
          <div className='flex-1' style={{ height: STEP_GAP_PX }} />
        </div>
      ) : null}
    </div>
  )
}
