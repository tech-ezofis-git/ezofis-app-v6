import type { ReactNode } from 'react'
import { useLingui } from '@lingui/react/macro'
import { motion } from 'motion/react'
import { Check, Pencil } from 'lucide-react'
import cn from '@/utils/cn'

export type TimelineStepStatus = 'active' | 'completed' | 'upcoming'

export type TimelineConnectorState = 'hidden' | 'idle' | 'completed' | 'loading'

const STEP_GAP_PX = 16
/** Matches card header top padding so the stage sits on the header row */
const HEADER_ALIGN_PX = 16

function trackColor(state: TimelineConnectorState) {
  if (state === 'completed') return 'bg-green-6 w-[2px]'
  if (state === 'loading') return 'bg-gray-3 w-[2px]'
  return 'bg-gray-3 w-[2px]'
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
          'relative flex size-8 items-center justify-center rounded-full text-[12px] font-bold transition-all',
          isCompleted
            ? 'bg-green-6 text-white shadow-xs border border-green-6'
            : isActive
              ? 'bg-primary-9 text-white shadow-[0_0_0_4px_rgba(106,76,240,0.25)]'
              : 'bg-gray-200 text-gray-7 border border-gray-3',
        )}
      >
        {isCompleted ? (
          <Check className='size-4 text-white stroke-[3]' />
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
        'relative shrink-0 flex justify-center',
        fixedHeight == null && 'min-h-0 flex-1',
        className,
      )}
      style={fixedHeight != null ? { height: fixedHeight } : undefined}
    >
      <div
        className={cn('absolute inset-x-0 top-0 mx-auto', trackColor(state))}
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
  onSelectStep,
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
  onSelectStep?: (stepId: number) => void
}) {
  const { t } = useLingui()
  const isActive = status === 'active'
  const isCompleted = status === 'completed'
  const showBody = Boolean((isCompleted && summary) || (isActive && children))
  const hasBottomConnector = bottomConnectorState !== 'hidden'
  const isClickable = Boolean(onSelectStep && (isCompleted || (!isActive && status !== 'upcoming')))

  return (
    <div className='relative overflow-visible'>
      <div className='flex gap-4 overflow-visible'>
        {/* Timeline — stage aligned to card header; line only between stages */}
        <div
          className={cn(
            'relative z-20 flex w-8 shrink-0 flex-col items-center self-stretch overflow-visible',
            isClickable && 'cursor-pointer',
          )}
          onClick={() => {
            if (isClickable && onSelectStep) {
              onSelectStep(stepId)
            }
          }}
        >
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
                ? 'border-primary-4 hover:border-primary-6'
                : 'border-[var(--gray-3)] opacity-70',
          )}
          initial={{ opacity: 0, y: 14 }}
          layout
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        >
          <div
            className={cn(
              'flex shrink-0 items-center justify-between px-5 py-4 transition-colors',
              isActive || isCompleted
                ? 'bg-primary-2'
                : 'bg-[var(--gray-1)]',
              showBody ? 'border-b border-primary-4' : '',
              isClickable && 'cursor-pointer hover:bg-primary-3/70',
            )}
            onClick={() => {
              if (isClickable && onSelectStep) {
                onSelectStep(stepId)
              }
            }}
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

            {isCompleted && onSelectStep ? (
              <button
                type='button'
                className='inline-flex items-center gap-1.5 rounded-lg bg-surface px-3 py-1.5 text-[12px] font-semibold text-primary-9 border border-primary-4 shadow-2xs hover:bg-primary-3 hover:border-primary-6 transition-colors'
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectStep(stepId)
                }}
              >
                <Pencil className='size-3.5' />
                <span>{t`Edit`}</span>
              </button>
            ) : null}
          </div>

          {/* Render summary ONLY when step is completed */}
          {isCompleted && summary ? (
            <div className='px-5 py-4'>{summary}</div>
          ) : null}

          {/* Render interactive editing form ONLY when step is active */}
          {isActive && children ? (
            <div className='p-5'>{children}</div>
          ) : null}
        </motion.section>
      </div>

      {/* Spacer between steps */}
      {hasBottomConnector ? (
        <div className='flex gap-4'>
          <div className='w-8 shrink-0' style={{ height: STEP_GAP_PX }} />
          <div className='flex-1' style={{ height: STEP_GAP_PX }} />
        </div>
      ) : null}
    </div>
  )
}
