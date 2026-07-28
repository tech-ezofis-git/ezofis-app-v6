import { type ReactNode } from 'react'
import { motion } from 'motion/react'
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'

export type TimelineStepStatus = 'active' | 'completed' | 'upcoming'

export type TimelineConnectorState = 'hidden' | 'idle' | 'completed' | 'loading'

/** Matches card header band so the circle lines up with the title */
const HEADER_ALIGN_PX = 56
const CIRCLE_PX = 32
const STEP_GAP_PX = 16

/** Distance from header-band top to circle bottom / next circle top */
const CIRCLE_TOP_INSET = (HEADER_ALIGN_PX - CIRCLE_PX) / 2
const CIRCLE_BOTTOM = CIRCLE_TOP_INSET + CIRCLE_PX

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

export function BuilderTimelineStep({
  stepId,
  status,
  title,
  description,
  summary,
  children,
  showTopConnector: _showTopConnector,
  topConnectorState: _topConnectorState,
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
    <div className='flex items-stretch gap-4'>
      {/*
        1  Heading
        |
        2  Heading
        |
        3  Heading
      */}
      <div
        className='relative w-8 shrink-0 self-stretch overflow-visible'
        style={{ paddingBottom: hasBottomConnector ? STEP_GAP_PX : 0 }}
      >
        <div
          className='relative z-10 flex w-full items-center justify-center'
          style={{ height: HEADER_ALIGN_PX }}
        >
          <StepCircle status={status} stepId={stepId} />
        </div>

        {/* Line starts at this circle bottom and ends at next circle top */}
        {hasBottomConnector ? (
          <div
            className={cn(
              'absolute left-1/2 z-0 w-[2px] -translate-x-1/2 overflow-hidden',
              trackColor(bottomConnectorState),
            )}
            style={{
              // 1px overlap removes sub-pixel hairline gaps
              top: CIRCLE_BOTTOM - 1,
              bottom: -(CIRCLE_TOP_INSET + 1),
            }}
          >
            {bottomConnectorState === 'loading' ? (
              <motion.div
                animate={{ top: ['-40%', '100%'] }}
                className='absolute inset-x-0 h-10 rounded-full bg-primary-9'
                initial={{ top: '-40%' }}
                transition={{
                  duration: 1.4,
                  ease: 'linear',
                  repeat: Infinity,
                  repeatType: 'loop',
                }}
              />
            ) : null}
          </div>
        ) : null}
      </div>

      <div
        className='min-w-0 flex-1'
        style={{ paddingBottom: hasBottomConnector ? STEP_GAP_PX : 0 }}
      >
        <motion.section
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'flex min-h-0 flex-col overflow-hidden rounded-[16px] border bg-surface transition',
            isActive
              ? 'border-primary-9 shadow-[0_10px_28px_rgba(124,58,237,0.12)]'
              : isCompleted
                ? 'border-primary-4'
                : 'border-[var(--gray-3)] opacity-70',
          )}
          initial={{ opacity: 0, y: 14 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        >
          <div
            className={cn(
              'flex shrink-0 items-center px-5',
              isActive || isCompleted ? 'bg-primary-2' : 'bg-[var(--gray-1)]',
              showBody ? 'border-b border-primary-4' : '',
            )}
            style={{ minHeight: HEADER_ALIGN_PX }}
          >
            <div className='min-w-0 flex-1 py-3'>
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
    </div>
  )
}
