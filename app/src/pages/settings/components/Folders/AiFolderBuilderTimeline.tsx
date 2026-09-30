import type { CSSProperties, ReactNode } from 'react'
import { useLingui } from '@lingui/react/macro'
import { Check, Pencil } from 'lucide-react'
import { motion } from 'motion/react'
import cn from '@/utils/cn'

export type TimelineConnectorState = 'hidden' | 'idle' | 'completed' | 'loading'

export type TimelineStepStatus = 'active' | 'completed' | 'upcoming'

const STEP_GAP_PX = 16
/** Matches card header top padding so the stage sits on the header row */
const HEADER_ALIGN_PX = 16

export function BuilderTimelineStep({
  bottomConnectorState,
  children,
  description,
  minimized = false,
  showTopConnector,
  status,
  stepId,
  summary,
  title,
  topConnectorState,
  onSelectStep,
}: {
  bottomConnectorState: TimelineConnectorState
  children?: ReactNode
  description: string
  minimized?: boolean
  showTopConnector?: boolean
  status: TimelineStepStatus
  stepId: number
  summary?: ReactNode
  title: string
  topConnectorState: TimelineConnectorState
  onSelectStep?: (stepId: number) => void
}) {
  const { t } = useLingui()
  const isActive = status === 'active'
  const isCompleted = status === 'completed'
  const showBody = Boolean((isCompleted && summary) || (isActive && children))
  const hasBottomConnector = bottomConnectorState !== 'hidden'
  const isClickable = Boolean(
    onSelectStep && (isCompleted || (!isActive && status !== 'upcoming')),
  )

  if (minimized) {
    return (
      <div className='relative'>
        <div className='flex gap-4'>
          <div
            className={cn(
              'relative z-20 flex w-8 shrink-0 flex-col items-center self-stretch',
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
                state={topConnectorState}
                style={{ height: 10 }}
              />
            ) : (
              <div className='w-[2px] shrink-0' style={{ height: 10 }} />
            )}

            <span className='relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full bg-green-9 text-white shadow-2xs'>
              <Check className='size-3.5 stroke-[2.5]' />
            </span>

            {hasBottomConnector ? (
              <ConnectorTrack
                className='min-h-0 flex-1'
                state={bottomConnectorState}
              />
            ) : null}
          </div>

          <motion.div
            animate={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.2 }}
            layout
            className={cn(
              'flex min-h-0 flex-1 items-center justify-between rounded-[12px] border border-primary-4 bg-surface px-4 py-2 transition hover:border-primary-6 hover:bg-primary-2/40',
              isClickable && 'cursor-pointer',
            )}
            onClick={() => {
              if (isClickable && onSelectStep) {
                onSelectStep(stepId)
              }
            }}
          >
            <div className='flex min-w-0 flex-1 items-center gap-2.5'>
              <span className='text-[13px] font-semibold text-[var(--gray-13)]'>
                {title}
              </span>
              {summary ? (
                <>
                  <span className='text-[var(--gray-6)]'>•</span>
                  <div className='min-w-0 flex-1 truncate text-[12px] text-[var(--gray-10)]'>
                    {summary}
                  </div>
                </>
              ) : null}
            </div>

            {onSelectStep ? (
              <button
                className='inline-flex items-center gap-1 rounded-md border border-primary-4 bg-surface px-2 py-1 text-[11px] font-semibold text-primary-9 shadow-2xs transition-colors hover:border-primary-6 hover:bg-primary-3'
                type='button'
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectStep(stepId)
                }}
              >
                <Pencil className='size-3' />
                <span>{t`Edit`}</span>
              </button>
            ) : null}
          </motion.div>
        </div>

        {hasBottomConnector ? (
          <div className='flex gap-4'>
            <ConnectorTrack
              className='w-8'
              state={bottomConnectorState}
              style={{ height: 8 }}
            />
            <div className='flex-1' style={{ height: 8 }} />
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className='relative'>
      <div className='flex gap-4'>
        <div
          className={cn(
            'relative z-20 flex w-8 shrink-0 flex-col items-center self-stretch',
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
              state={topConnectorState}
              style={{ height: HEADER_ALIGN_PX }}
            />
          ) : (
            <div
              className='w-[2px] shrink-0'
              style={{ height: HEADER_ALIGN_PX }}
            />
          )}

          <StepCircle status={status} stepId={stepId} />

          {hasBottomConnector ? (
            <ConnectorTrack
              className='min-h-0 flex-1'
              state={bottomConnectorState}
            />
          ) : null}
        </div>

        <motion.section
          animate={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 14 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          layout
          className={cn(
            'flex min-h-0 flex-1 flex-col overflow-hidden rounded-[16px] border bg-surface transition',
            isActive
              ? 'border-primary-9 shadow-[0_10px_28px_rgba(124,58,237,0.12)]'
              : isCompleted
                ? 'border-primary-4 hover:border-primary-6'
                : 'border-[var(--gray-3)] opacity-70',
          )}
        >
          <div
            className={cn(
              'flex shrink-0 items-center justify-between px-5 py-4 transition-colors',
              isActive || isCompleted ? 'bg-primary-2' : 'bg-[var(--gray-1)]',
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
                className='inline-flex items-center gap-1.5 rounded-lg border border-primary-4 bg-surface px-3 py-1.5 text-[12px] font-semibold text-primary-9 shadow-2xs transition-colors hover:border-primary-6 hover:bg-primary-3'
                type='button'
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

          {isCompleted && summary ? (
            <div className='px-5 py-4'>{summary}</div>
          ) : null}

          {isActive && children ? <div className='p-5'>{children}</div> : null}
        </motion.section>
      </div>

      {hasBottomConnector ? (
        <div className='flex gap-4'>
          <ConnectorTrack
            className='w-8'
            state={bottomConnectorState}
            style={{ height: STEP_GAP_PX }}
          />
          <div className='flex-1' style={{ height: STEP_GAP_PX }} />
        </div>
      ) : null}
    </div>
  )
}

function ConnectorTrack({
  className,
  state,
  style,
}: {
  className?: string
  state: TimelineConnectorState
  style?: CSSProperties
}) {
  if (state === 'hidden') {
    return null
  }

  return (
    <div
      className={cn('flex w-full shrink-0 justify-center', className)}
      style={style}
    >
      <div className={cn('h-full', trackColor(state))} />
    </div>
  )
}

function StepCircle({
  status,
  stepId,
}: {
  status: TimelineStepStatus
  stepId: number
}) {
  const isActive = status === 'active'
  const isCompleted = status === 'completed'

  return (
    <span className='relative z-10 flex size-8 shrink-0 items-center justify-center'>
      {isActive ? (
        <span
          className='absolute inset-0 animate-ping rounded-full bg-primary-10 opacity-40'
          aria-hidden
        />
      ) : null}
      <span
        className={cn(
          'relative flex size-8 items-center justify-center rounded-full text-[12px] font-bold transition-all',
          isCompleted
            ? 'border border-green-6 bg-green-6 text-white shadow-xs'
            : isActive
              ? 'bg-primary-9 text-white shadow-[0_0_0_4px_rgba(106,76,240,0.25)]'
              : 'bg-gray-200 border border-gray-3 text-gray-7',
        )}
      >
        {isCompleted ? (
          <Check className='size-4 stroke-[3] text-white' />
        ) : (
          stepId
        )}
      </span>
    </span>
  )
}

function trackColor(state: TimelineConnectorState) {
  if (state === 'completed') return 'bg-green-6 w-[2px]'
  if (state === 'loading') return 'bg-primary-9 w-[2px]'
  return 'bg-gray-3 w-[2px]'
}
