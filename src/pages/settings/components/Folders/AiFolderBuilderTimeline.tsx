import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'

export type TimelineStepStatus = 'active' | 'completed' | 'upcoming'

export type TimelineConnectorState = 'hidden' | 'idle' | 'completed' | 'loading'

const STEP_GAP_PX = 16
/** Matches card header top padding so the stage sits on the header row */
const HEADER_ALIGN_PX = 16

function trackColor(state: TimelineConnectorState) {
  if (state === 'completed' || state === 'loading') return 'bg-[var(--green-4)]'
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
    <span className='relative z-10 flex size-8 shrink-0 items-center justify-center'>
      {isActive ? (
        <span
          aria-hidden
          className='absolute inset-0 animate-ping rounded-full bg-primary-10 opacity-40'
        />
      ) : null}
      <span
        className={cn(
          'relative flex size-8 items-center justify-center rounded-full text-[12px] font-bold',
          isCompleted
            ? 'bg-[var(--green-2)] text-[var(--green-10)]'
            : isActive
              ? 'bg-primary-10 text-white shadow-[0_0_0_4px_rgba(106,76,240,0.18)]'
              : 'bg-[var(--gray-3)] text-[var(--gray-10)]',
        )}
      >
        {isCompleted ? (
          <Icon className='size-3.5 text-[var(--green-10)]' name='lucide:check' />
        ) : (
          stepId
        )}
      </span>
    </span>
  )
}

function ConnectorTrack({
  state,
  className,
  extendGap,
  fixedHeight,
}: {
  state: TimelineConnectorState
  className?: string
  extendGap?: boolean
  fixedHeight?: number
}) {
  if (state === 'hidden') {
    return null
  }

  return (
    <div
      className={cn(
        'relative w-[2px] shrink-0',
        fixedHeight == null && 'min-h-0 flex-1',
        className,
      )}
      style={fixedHeight != null ? { height: fixedHeight } : undefined}
    >
      <div
        className={cn('absolute inset-x-0 top-0', trackColor(state))}
        style={{ bottom: extendGap ? -STEP_GAP_PX : 0 }}
      />
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
  const showBody = Boolean(
    ((isCompleted || isActive) && summary) || (isActive && children),
  )
  const hasBottomConnector = bottomConnectorState !== 'hidden'

  return (
    <div>
      <div className='flex gap-4'>
        {/* Timeline — stage aligned to card header; line only between stages */}
        <div className='flex w-8 shrink-0 flex-col items-center self-stretch overflow-visible'>
          {showTopConnector ? (
            <ConnectorTrack
              fixedHeight={HEADER_ALIGN_PX}
              state={topConnectorState}
            />
          ) : (
            <div className='w-[2px] shrink-0' style={{ height: HEADER_ALIGN_PX }} />
          )}

          <StepCircle status={status} stepId={stepId} />

          {hasBottomConnector ? (
            <ConnectorTrack
              extendGap
              className='flex-1'
              state={bottomConnectorState}
            />
          ) : null}
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
              {!isCompleted && !summary && (
                <p className='mt-0.5 text-[12px] text-[var(--gray-11)]'>
                  {description}
                </p>
              )}
            </div>
          </div>

          {(isCompleted || isActive) && summary ? (
            <div className='px-5 py-4'>{summary}</div>
          ) : null}

          {isActive && children ? (
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
