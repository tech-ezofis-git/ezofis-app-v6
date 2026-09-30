import type { ReactNode } from 'react'
import { t as staticT } from '@lingui/macro'
import { useLingui } from '@lingui/react/macro'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import AiBrandIcon from '@/components/common/AiBrandIcon'
import cn from '@/utils/cn'

export type SetupStepId = 1 | 2 | 3 | 4 | 5 | 6

export const SETUP_STEPS: Array<{
  icon: string
  id: SetupStepId
  title: string
}> = [
  { icon: 'lucide:folder', id: 1, title: staticT`Folder Details` },
  { icon: 'lucide:hard-drive', id: 2, title: staticT`Storage` },
  { icon: 'lucide:table', id: 3, title: staticT`Metadata` },
  { icon: 'lucide:git-branch', id: 4, title: staticT`Versioning` },
  { icon: 'lucide:plug', id: 5, title: staticT`Integration` },
  { icon: 'lucide:check-circle-2', id: 6, title: staticT`Review` },
]

export type PeekSummary = {
  chips?: string[]
  detail?: string
  headline: string
  stats?: Array<{ label: string; value: string }>
  title: string
}

export function AiProcessingState({
  label,
  messages,
}: {
  label: string
  messages?: string[]
}) {
  const reduceMotion = useReducedMotion()
  const lines = messages?.length ? messages : [label]
  const [lineIndex, setLineIndex] = useState(0)

  useEffect(() => {
    if (lines.length <= 1 || reduceMotion) return
    const id = window.setInterval(() => {
      setLineIndex((prev) => (prev + 1) % lines.length)
    }, 3200)
    return () => window.clearInterval(id)
  }, [lines, reduceMotion])

  const activeLine = lines[lineIndex] || label

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className='flex flex-col items-center justify-center gap-4 py-10 text-center'
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className='relative flex size-14 items-center justify-center rounded-full bg-accent-soft text-accent-primary'
        transition={{ duration: 3.2, ease: 'easeInOut', repeat: Infinity }}
        animate={
          reduceMotion
            ? undefined
            : { opacity: [0.85, 1, 0.85], scale: [1, 1.04, 1] }
        }
      >
        <AiBrandIcon className='size-6' variant='outline-purple' />
      </motion.div>

      <div className='min-h-[48px] max-w-md px-4'>
        <AnimatePresence mode='wait'>
          <motion.p
            animate={{ opacity: 1, y: 0 }}
            className='text-primary text-[14px] font-medium'
            exit={{ opacity: 0, y: -6 }}
            initial={{ opacity: 0, y: 6 }}
            key={activeLine}
            transition={{ duration: 0.35 }}
          >
            <AiTypingText
              key={activeLine}
              speed={18}
              text={activeLine}
              showCursor
            />
          </motion.p>
        </AnimatePresence>
      </div>

      <div className='h-1.5 w-48 overflow-hidden rounded-full bg-surface-secondary'>
        <motion.div
          className='h-full w-[38%] rounded-full bg-accent-primary/65'
          animate={
            reduceMotion
              ? undefined
              : { opacity: [0.45, 0.9, 0.45], x: ['-80%', '160%'] }
          }
          transition={{
            duration: 2.8,
            ease: 'easeInOut',
            repeat: Infinity,
          }}
        />
      </div>
    </motion.div>
  )
}

export function AiTypingText({
  className,
  showCursor = true,
  speed = 16,
  startDelay = 0,
  text,
  onDone,
}: {
  className?: string
  showCursor?: boolean
  speed?: number
  startDelay?: number
  text: string
  onDone?: () => void
}) {
  const reduceMotion = useReducedMotion()
  const [shown, setShown] = useState(reduceMotion ? text : '')
  const doneRef = useRef(false)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    doneRef.current = false
    if (reduceMotion) {
      setShown(text)
      onDoneRef.current?.()
      return
    }

    setShown('')
    let index = 0
    let intervalId = 0
    const startId = window.setTimeout(() => {
      intervalId = window.setInterval(() => {
        index += 1
        setShown(text.slice(0, index))
        if (index >= text.length) {
          window.clearInterval(intervalId)
          if (!doneRef.current) {
            doneRef.current = true
            onDoneRef.current?.()
          }
        }
      }, speed)
    }, startDelay)

    return () => {
      window.clearTimeout(startId)
      window.clearInterval(intervalId)
    }
  }, [text, speed, startDelay, reduceMotion])

  return (
    <span className={className}>
      {shown}
      {showCursor && shown.length < text.length ? (
        <span className='ml-0.5 inline-block h-[1em] w-[2px] animate-pulse bg-accent-primary align-[-0.1em]' />
      ) : null}
    </span>
  )
}

export function CompactNextButton({
  disabled,
  label,
  onClick,
}: {
  disabled?: boolean
  label?: string
  onClick?: () => void
}) {
  const { t } = useLingui()

  return (
    <button
      className='text-secondary inline-flex items-center gap-1 text-[12px] font-semibold transition hover:text-accent-primary hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-40'
      disabled={disabled}
      type='button'
      onClick={onClick}
    >
      {label ?? t`Next >>`}
    </button>
  )
}

export function FolderCreationHeader({
  draftSaved,
  onSaveExit,
}: {
  draftSaved?: boolean
  onSaveExit: () => void
}) {
  const { t } = useLingui()

  return (
    <header className='shrink-0 border-b border-border-default bg-surface-primary px-5 py-3'>
      <div className='mx-auto flex max-w-[1200px] items-center justify-between gap-3'>
        <div className='flex items-center gap-3'>
          <img
            alt='EZOFIS'
            className='size-8 object-contain'
            src='/favicon.svg'
          />
          <p className='text-primary text-[14px] font-semibold'>
            {t`Folder Creator`}
          </p>
        </div>
        <div className='flex items-center gap-3'>
          {draftSaved ? (
            <span className='text-secondary hidden items-center gap-1.5 text-[12px] sm:inline-flex'>
              <Icon
                className='size-3.5 text-[var(--green-9)]'
                name='lucide:check'
              />
              {t`Draft saved`}
            </span>
          ) : null}
          <button
            className='text-secondary hover:text-primary rounded-[10px] px-3 py-1.5 text-[13px] font-medium transition hover:bg-surface-secondary'
            type='button'
            onClick={onSaveExit}
          >
            {t`Save & Exit`}
          </button>
        </div>
      </div>
    </header>
  )
}

/** Horizontal chip/option scroller — scrollable, no visible scrollbar */
export function HiddenScrollRow({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const rowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = rowRef.current
    if (!node) return

    const onWheel = (event: WheelEvent) => {
      if (node.scrollWidth <= node.clientWidth) return
      event.preventDefault()
      node.scrollLeft += event.deltaY + event.deltaX
    }
    node.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      node.removeEventListener('wheel', onWheel)
    }
  }, [])

  return (
    <div
      ref={rowRef}
      className={cn(
        'no-scrollbar flex w-full touch-pan-x items-center gap-1.5 overflow-x-auto overflow-y-hidden overscroll-x-contain whitespace-nowrap',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function InlineAlert({
  children,
  tone = 'info',
}: {
  children: ReactNode
  tone?: 'info' | 'warning' | 'error' | 'success'
}) {
  return (
    <div
      className={cn(
        'rounded-[10px] px-2.5 py-2 text-[11px] leading-relaxed',
        tone === 'info' && 'bg-[var(--cyan-3)] text-[var(--cyan-11)]',
        tone === 'warning' &&
          'bg-[var(--warning-main)]/10 text-[var(--warning-main)]',
        tone === 'error' &&
          'bg-[var(--error-main)]/10 text-[var(--error-main)]',
        tone === 'success' && 'bg-success-subtle text-[var(--green-9)]',
      )}
    >
      {children}
    </div>
  )
}

export function OptionCard({
  badge,
  children,
  description,
  icon,
  selected,
  title,
  warning,
  onSelect,
}: {
  badge?: string
  children?: ReactNode
  description: string
  icon: string
  selected?: boolean
  title: string
  warning?: string
  onSelect: () => void
}) {
  return (
    <div
      aria-pressed={selected}
      role='button'
      tabIndex={0}
      className={cn(
        'w-full rounded-[14px] border p-3.5 text-left transition-all duration-200 hover:-translate-y-0.5',
        selected
          ? 'border-accent-primary bg-accent-soft shadow-[0_0_0_1px_var(--color-accent-primary)]'
          : 'border-border-default bg-surface-primary hover:border-border-focus',
      )}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect()
        }
      }}
    >
      <div className='flex items-start gap-3'>
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-[10px]',
            selected
              ? 'bg-accent-primary text-white'
              : 'text-secondary bg-surface-secondary',
          )}
        >
          <Icon className='size-4' name={icon} />
        </span>
        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <p className='text-primary text-[14px] font-semibold'>{title}</p>
            {badge ? (
              <span className='rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent-primary'>
                {badge}
              </span>
            ) : null}
            {selected ? (
              <Icon
                className='ml-auto size-4 text-accent-primary'
                name='lucide:check-circle-2'
              />
            ) : null}
          </div>
          <p className='text-secondary mt-1 text-[12px] leading-relaxed'>
            {description}
          </p>
          {warning ? (
            <p className='mt-2 rounded-[10px] bg-[var(--warning-main)]/10 px-2.5 py-2 text-[12px] text-[var(--warning-main)]'>
              {warning}
            </p>
          ) : null}
          {children ? (
            <div
              className='mt-3'
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              {children}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function PrimaryActionButton({
  children,
  disabled,
  onClick,
}: {
  children: ReactNode
  disabled?: boolean
  onClick?: () => void
}) {
  return (
    <button
      className='w-full rounded-[12px] bg-accent-primary px-5 py-3 text-[14px] font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40'
      disabled={disabled}
      type='button'
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export function SetupTimeline({
  completedSteps,
  currentStep,
}: {
  completedSteps: Set<SetupStepId>
  currentStep: SetupStepId
}) {
  const reduceMotion = useReducedMotion()

  return (
    <div className='mx-auto w-full max-w-[1200px] shrink-0 px-4 pt-6 pb-2 sm:px-6'>
      <div className='relative flex items-start justify-between'>
        <div className='absolute top-5 right-8 left-8 h-[2px] overflow-hidden rounded-full bg-border-default sm:right-12 sm:left-12'>
          <div
            className='h-full bg-[var(--green-8)] transition-all duration-400 ease-out'
            style={{
              width: `${((currentStep - 1) / Math.max(SETUP_STEPS.length - 1, 1)) * 100}%`,
            }}
          />
        </div>

        {SETUP_STEPS.map((step) => {
          const isCurrent = currentStep === step.id
          const isCompleted = completedSteps.has(step.id) && !isCurrent
          const isUpcoming = !isCompleted && !isCurrent

          return (
            <div
              className='relative z-10 flex w-16 flex-col items-center gap-2 sm:w-24'
              key={step.id}
            >
              <div className='relative'>
                {isCurrent && !reduceMotion ? (
                  <span className='absolute inset-0 animate-ping rounded-full bg-primary-10 opacity-40' />
                ) : null}
                <div
                  className={cn(
                    'relative flex size-10 items-center justify-center rounded-full border-2 text-[12px] font-semibold transition-all duration-300',
                    isCompleted &&
                      'border-[var(--green-6)] bg-[var(--green-3)] text-[var(--green-11)]',
                    isCurrent &&
                      'border-primary-10 bg-primary-10 text-white shadow-[0_0_0_4px_rgba(106,76,240,0.25)]',
                    isUpcoming &&
                      'text-muted border-border-default bg-surface-primary',
                  )}
                >
                  <Icon className='size-4' name={step.icon} />
                </div>
              </div>
              <span
                className={cn(
                  'hidden text-center text-[11px] font-medium sm:block',
                  isCompleted && 'text-[var(--green-11)]',
                  isCurrent && 'text-primary-10',
                  isUpcoming && 'text-muted',
                )}
              >
                {step.title}
              </span>
            </div>
          )
        })}
      </div>
      <p className='mt-3 text-center text-[12px] font-medium text-primary-10 sm:hidden'>
        {SETUP_STEPS.find((step) => step.id === currentStep)?.title}
      </p>
    </div>
  )
}

export function StepActiveCard({
  children,
  footer,
  icon = 'lucide:folder',
  question,
  support,
}: {
  children: ReactNode
  footer?: ReactNode
  icon?: string
  question: string
  support?: string
}) {
  const reduceMotion = useReducedMotion()
  const [contentReady, setContentReady] = useState(
    !support || Boolean(reduceMotion),
  )

  useEffect(() => {
    setContentReady(!support || Boolean(reduceMotion))
  }, [question, support, reduceMotion])

  return (
    <div className='flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[22px] border border-border-default bg-surface-primary p-4 shadow-[0_12px_36px_rgba(15,23,42,0.08)] sm:p-5 lg:p-6'>
      <div className='mb-3 flex shrink-0 items-start gap-2.5'>
        <div className='flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-primary'>
          <Icon className='size-3.5' name={icon} />
        </div>
        <div className='min-w-0 flex-1'>
          <h2 className='text-primary text-[15px] leading-snug font-semibold sm:text-[16px]'>
            {question}
          </h2>
          {support ? (
            <p className='text-secondary mt-1 min-h-[18px] text-[12px] leading-relaxed'>
              <AiTypingText
                key={`s-${support}`}
                speed={14}
                startDelay={120}
                text={support}
                showCursor
                onDone={() => setContentReady(true)}
              />
            </p>
          ) : null}
        </div>
      </div>

      <div className='no-scrollbar min-h-0 flex-1 touch-pan-y space-y-3 overflow-x-hidden overflow-y-auto overscroll-contain pt-3 pr-4 pl-[38px]'>
        <AnimatePresence mode='wait'>
          {contentReady ? (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className='space-y-3'
              exit={{ opacity: 0, y: 8 }}
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              key='step-body'
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              {children}
            </motion.div>
          ) : (
            <motion.div
              animate={{ opacity: 1 }}
              className='flex flex-col items-center justify-center gap-3 py-10'
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              key='step-loading'
            >
              <div className='h-1.5 w-36 overflow-hidden rounded-full bg-surface-secondary'>
                <motion.div
                  animate={{ x: ['-70%', '140%'] }}
                  className='h-full w-[40%] rounded-full bg-accent-primary/70'
                  transition={{
                    duration: 2.4,
                    ease: 'easeInOut',
                    repeat: Infinity,
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {footer && contentReady ? (
        <motion.div
          animate={{ opacity: 1 }}
          className='mt-4 flex shrink-0 items-center justify-end pl-[38px]'
          initial={reduceMotion ? false : { opacity: 0 }}
          transition={{ delay: 0.15, duration: 0.3 }}
        >
          {footer}
        </motion.div>
      ) : null}
    </div>
  )
}

export function StepCarousel({
  activeContent,
  activeFooter,
  canGoNext,
  completedSteps,
  currentStep,
  question,
  support,
  getSummary,
  onGoToStep,
  onNext,
}: {
  activeContent: ReactNode
  activeFooter?: ReactNode
  canGoNext?: boolean
  completedSteps: Set<SetupStepId>
  currentStep: SetupStepId
  question: string
  support?: string
  getSummary: (stepId: SetupStepId) => PeekSummary
  onGoToStep: (stepId: SetupStepId) => void
  onNext?: () => void
}) {
  const { t } = useLingui()
  const reduceMotion = useReducedMotion()
  const currentIndex = SETUP_STEPS.findIndex((step) => step.id === currentStep)
  const prevIndexRef = useRef(currentIndex)
  const direction = currentIndex >= prevIndexRef.current ? 1 : -1

  useEffect(() => {
    prevIndexRef.current = currentIndex
  }, [currentIndex])

  const prevStep = currentIndex > 0 ? SETUP_STEPS[currentIndex - 1] : null
  const nextStep =
    currentIndex < SETUP_STEPS.length - 1 ? SETUP_STEPS[currentIndex + 1] : null
  const canGoPrev = Boolean(prevStep)

  const slideVariants = {
    center: { opacity: 1, scale: 1, x: 0 },
    enter: (dir: number) =>
      reduceMotion
        ? { opacity: 0, x: 0 }
        : { opacity: 0, scale: 0.97, x: dir > 0 ? 56 : -56 },
    exit: (dir: number) =>
      reduceMotion
        ? { opacity: 0, x: 0 }
        : { opacity: 0, scale: 0.97, x: dir > 0 ? -56 : 56 },
  }

  return (
    <div className='mx-auto flex min-h-0 w-full max-w-[1400px] flex-1 flex-col px-2 py-2 sm:px-5 sm:py-3'>
      <div className='relative flex min-h-0 flex-1 items-stretch justify-center'>
        {canGoPrev ? (
          <button
            aria-label={t`Previous step`}
            className='text-primary absolute top-1/2 left-1 z-20 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-border-default bg-surface-primary/90 shadow-md backdrop-blur transition hover:scale-105 hover:bg-surface-primary sm:left-3 sm:size-11'
            type='button'
            onClick={() => prevStep && onGoToStep(prevStep.id)}
          >
            <Icon className='size-5' name='lucide:chevron-left' />
          </button>
        ) : null}

        {nextStep ? (
          <button
            aria-label={t`Next step`}
            className='text-primary absolute top-1/2 right-1 z-20 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-border-default bg-surface-primary/90 shadow-md backdrop-blur transition hover:scale-105 hover:bg-surface-primary disabled:cursor-not-allowed disabled:opacity-35 sm:right-3 sm:size-11'
            disabled={!canGoNext}
            type='button'
            onClick={() => {
              if (!canGoNext) return
              if (onNext) onNext()
              else onGoToStep(nextStep.id)
            }}
          >
            <Icon className='size-5' name='lucide:chevron-right' />
          </button>
        ) : null}

        <div className='grid h-full min-h-0 w-full grid-cols-1 items-center px-11 sm:px-14 lg:grid-cols-[minmax(120px,180px)_minmax(0,1fr)_minmax(120px,180px)] xl:grid-cols-[minmax(140px,200px)_minmax(0,1fr)_minmax(140px,200px)]'>
          {prevStep ? (
            <div className='relative z-0 hidden h-[88%] min-h-0 lg:block lg:translate-x-3 xl:translate-x-4'>
              <CarouselPeekCard
                completed={completedSteps.has(prevStep.id)}
                icon={prevStep.icon}
                side='left'
                summary={getSummary(prevStep.id)}
                title={prevStep.title}
                onClick={() => onGoToStep(prevStep.id)}
              />
            </div>
          ) : (
            <div className='hidden lg:block' aria-hidden />
          )}

          <div className='relative z-10 h-full min-h-0 overflow-hidden'>
            <AnimatePresence custom={direction} initial={false} mode='wait'>
              <motion.div
                animate='center'
                className='absolute inset-0 z-10 flex min-h-0 w-full flex-col'
                custom={direction}
                exit='exit'
                initial='enter'
                key={currentStep}
                variants={slideVariants}
                transition={{
                  duration: reduceMotion ? 0.15 : 0.32,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <StepActiveCard
                  footer={activeFooter}
                  icon={SETUP_STEPS[currentIndex]?.icon || 'lucide:folder'}
                  question={question}
                  support={support}
                >
                  {activeContent}
                </StepActiveCard>
              </motion.div>
            </AnimatePresence>
          </div>

          {nextStep ? (
            <div className='relative z-0 hidden h-[88%] min-h-0 lg:block lg:-translate-x-3 xl:-translate-x-4'>
              <CarouselPeekCard
                completed={completedSteps.has(nextStep.id)}
                icon={nextStep.icon}
                locked={!canGoNext && !completedSteps.has(nextStep.id)}
                side='right'
                summary={getSummary(nextStep.id)}
                title={nextStep.title}
                onClick={() => {
                  if (canGoNext && onNext) onNext()
                  else if (completedSteps.has(nextStep.id))
                    onGoToStep(nextStep.id)
                }}
              />
            </div>
          ) : (
            <div className='hidden lg:block' aria-hidden />
          )}
        </div>
      </div>

      <div className='flex shrink-0 items-center justify-center gap-2 py-3'>
        {SETUP_STEPS.map((step) => {
          const active = step.id === currentStep
          const done = completedSteps.has(step.id)
          const reachable = done || step.id <= currentStep

          return (
            <button
              aria-current={active ? 'step' : undefined}
              aria-label={t`Go to ${step.title}`}
              disabled={!reachable}
              key={step.id}
              type='button'
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                active
                  ? 'w-7 bg-[var(--green-9)]'
                  : done
                    ? 'w-4 bg-[var(--green-7)] hover:bg-[var(--green-9)]'
                    : 'w-4 bg-border-default',
              )}
              onClick={() => {
                if (reachable) onGoToStep(step.id)
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

function CarouselPeekCard({
  completed,
  icon,
  locked,
  side,
  summary,
  title,
  onClick,
}: {
  completed?: boolean
  icon: string
  locked?: boolean
  side: 'left' | 'right'
  summary: PeekSummary
  title: string
  onClick: () => void
}) {
  const { t } = useLingui()
  const reduceMotion = useReducedMotion()
  const meta = summary.stats?.slice(0, 2) || []
  const statusLabel = completed
    ? t`Done`
    : locked
      ? t`Up next`
      : side === 'right'
        ? t`Next`
        : t`Preview`
  const ctaLabel = completed
    ? t`Edit`
    : locked
      ? t`Locked`
      : side === 'right'
        ? t`Continue`
        : t`Open`

  return (
    <motion.button
      initial={false}
      type='button'
      animate={{
        opacity: locked ? 0.72 : 0.88,
        scale: 0.94,
        y: 0,
      }}
      className={cn(
        'group relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[20px] border text-left transition',
        'bg-surface-primary shadow-[0_8px_28px_rgba(15,23,42,0.07)]',
        'hover:opacity-100 hover:shadow-[0_14px_36px_rgba(15,23,42,0.12)]',
        completed ? 'border-[var(--green-6)]/70' : 'border-border-default/80',
        locked &&
          'cursor-default hover:shadow-[0_8px_28px_rgba(15,23,42,0.07)]',
      )}
      transition={{
        duration: reduceMotion ? 0 : 0.35,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={
        locked || reduceMotion ? undefined : { opacity: 1, scale: 0.97, y: -2 }
      }
      onClick={() => {
        if (locked) return
        onClick()
      }}
    >
      <div
        className={cn(
          'relative flex shrink-0 flex-col items-center justify-center gap-3 px-4 pt-7 pb-5',
          completed
            ? 'bg-[linear-gradient(180deg,var(--green-3)_0%,transparent_100%)]'
            : 'bg-[linear-gradient(180deg,var(--primary-3)_0%,transparent_100%)]',
        )}
      >
        <span
          className={cn(
            'flex size-14 items-center justify-center rounded-[18px] shadow-sm ring-1 ring-black/5',
            completed
              ? 'bg-[var(--green-9)] text-white'
              : locked
                ? 'text-muted bg-surface-secondary'
                : 'bg-primary-10 text-white',
          )}
        >
          <Icon className='size-6' name={icon} />
        </span>

        <div className='flex flex-col items-center gap-1.5 text-center'>
          <p className='text-primary text-[13px] font-semibold tracking-tight'>
            {summary.title || title}
          </p>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
              completed
                ? 'bg-[var(--green-3)] text-[var(--green-11)]'
                : locked
                  ? 'text-muted bg-surface-secondary'
                  : 'bg-primary-3 text-primary-10',
            )}
          >
            <span
              className={cn(
                'size-1.5 rounded-full',
                completed
                  ? 'bg-[var(--green-9)]'
                  : locked
                    ? 'bg-[var(--gray-7)]'
                    : 'bg-primary-10',
              )}
            />
            {statusLabel}
          </span>
        </div>
      </div>

      <div className='flex min-h-0 flex-1 flex-col px-4 pb-4'>
        <div className='min-h-0 flex-1'>
          <p className='text-primary line-clamp-2 text-center text-[15px] leading-snug font-semibold'>
            {summary.headline || title}
          </p>
          {summary.detail ? (
            <p className='text-secondary mt-1.5 line-clamp-2 text-center text-[11px] leading-relaxed'>
              {summary.detail}
            </p>
          ) : null}

          {meta.length > 0 ? (
            <div className='mt-4 space-y-2'>
              {meta.map((stat) => (
                <div
                  className='flex items-center justify-between gap-2 border-b border-border-default/60 pb-1.5 last:border-0 last:pb-0'
                  key={`${stat.label}-${stat.value}`}
                >
                  <span className='text-muted text-[10px] font-medium'>
                    {stat.label}
                  </span>
                  <span className='text-primary max-w-[60%] truncate text-right text-[11px] font-semibold'>
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div
          className={cn(
            'mt-4 flex items-center justify-center gap-1.5 rounded-[12px] py-2 text-[11px] font-semibold transition',
            locked
              ? 'text-muted bg-surface-secondary'
              : completed
                ? 'bg-[var(--green-3)] text-[var(--green-11)] group-hover:bg-[var(--green-4)]'
                : 'bg-primary-3 text-primary-10 group-hover:bg-primary-4',
          )}
        >
          {side === 'left' && !locked ? (
            <Icon className='size-3.5' name='lucide:chevron-left' />
          ) : null}
          {locked ? <Icon className='size-3.5' name='lucide:lock' /> : null}
          <span>{ctaLabel}</span>
          {side === 'right' && !locked ? (
            <Icon className='size-3.5' name='lucide:chevron-right' />
          ) : null}
        </div>
      </div>
    </motion.button>
  )
}
