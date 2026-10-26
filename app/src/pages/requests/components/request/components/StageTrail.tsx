import { useLingui } from '@lingui/react/macro'
import { AnimatePresence, motion } from 'motion/react'
import { Fragment, useEffect, useState } from 'react'
import type {
  StageRoute,
  StageTrailItem,
} from '@/pages/requests/utils/workflow.utils'
import Icon from '@/components/base/icon/Icon'
import Tooltip from '@/components/base/Tooltip'
import cn from '@/utils/cn'
import { formatUtcToLocalDateTime, parseUtcDate } from '@/utils/utcDate'

/** Done-step circle color from the connection's button color. */
const DONE_COLOR_CLASS: Record<string, string> = {
  green: 'bg-green-9 text-white',
  orange: 'bg-orange-9 text-white',
  primary: 'bg-primary-9 text-white',
  red: 'bg-red-9 text-white',
  secondary: 'bg-secondary-9 text-white',
}

/**
 * Route action chip: same look as the header's review buttons (subtle
 * variant + 4-step border), so each route matches the button that takes it.
 */
const ACTION_COLOR_CLASS: Record<string, string> = {
  gray: 'border-gray-4 bg-gray-3 text-gray-11',
  green: 'border-green-4 bg-green-3 text-green-11',
  orange: 'border-orange-4 bg-orange-3 text-orange-11',
  primary: 'border-primary-4 bg-primary-3 text-primary-11',
  red: 'border-red-4 bg-red-3 text-red-11',
  secondary: 'border-secondary-4 bg-secondary-3 text-secondary-11',
}

const isRejectLikeAction = (label: string) =>
  label.includes('reject') || label.includes('disqualif')

// Mirrors the header's resolveActionColor: the connection's color wins;
// otherwise Approve is green, Reject / Disqualify red, the rest primary.
const actionTone = (route: StageRoute) => {
  const explicit = String(route.color || '').toLowerCase()
  if (explicit in ACTION_COLOR_CLASS) return explicit
  const label = route.action.toLowerCase()
  if (label.includes('approve')) return 'green'
  if (isRejectLikeAction(label)) return 'red'
  return 'primary'
}

// Same default icons as the header buttons.
const actionIcon = (route: StageRoute) => {
  const label = route.action.toLowerCase()
  if (label.includes('approve')) return 'lucide:check'
  if (isRejectLikeAction(label)) return 'lucide:x'
  return 'lucide:arrow-right'
}

/** Compact age: 45m, 6h, 3d. */
const formatShortAge = (since?: string) => {
  const date = since ? parseUtcDate(since) : null
  if (!date) return ''
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000))
  if (minutes < 60) return `${Math.max(1, minutes)}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

/**
 * Compact workflow progress for the request header: previous, current and
 * next step (✓ done · numbered current · upcoming / condition). The current
 * step shows how long the request has been waiting there. A branching next
 * step reads "N routes" and opens a popover naming the next stage for each
 * action.
 */
export default function StageTrail({
  items,
  since,
}: {
  items: StageTrailItem[]
  /** When the request reached the current step (transactionCreatedAt). */
  since?: string
}) {
  const { t } = useLingui()
  const [routesOpen, setRoutesOpen] = useState(false)
  const currentId = items.find(({ step }) => step.status === 'current')?.step.id

  // Close when the request moves to another stage.
  useEffect(() => {
    setRoutesOpen(false)
  }, [currentId])

  if (!items.length) return null

  const age = formatShortAge(since)
  const sinceLabel = since ? formatUtcToLocalDateTime(since, since) : ''

  return (
    <nav
      aria-label={t`Workflow stages`}
      className='animate-in fade-in flex min-w-0 shrink items-center gap-0.5 rounded-full border border-gray-3 bg-gray-1 p-1 duration-300'
    >
      {items.map(({ color, number, step }, index) => {
        const isDone = step.status === 'done'
        const isCurrent = step.status === 'current'
        const routes = step.isCondition ? step.routes || [] : []
        const routeCount = routes.length
        const stepLabel =
          routeCount > 1
            ? t`${routeCount} routes`
            : routeCount === 1
              ? t`1 route`
              : step.label
        const showAge = isCurrent && Boolean(age)
        const stepBody = (
          <>
            <span
              className={cn(
                'flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                isDone && !step.isCondition
                  ? DONE_COLOR_CLASS[String(color || '')] ||
                      'bg-green-9 text-white'
                  : isCurrent
                    ? DONE_COLOR_CLASS[String(color || '')] ||
                      'bg-primary-9 text-white'
                    : 'border border-gray-5 bg-surface text-gray-10',
              )}
            >
              {step.isCondition && !routeCount ? (
                <Icon className='size-3' name='lucide:git-branch' />
              ) : isDone ? (
                <Icon className='size-3 stroke-[3]' name='lucide:check' />
              ) : (
                number
              )}
            </span>
            <span className='truncate'>{stepLabel}</span>
            {showAge ? (
              <span className='shrink-0 text-[11px] font-medium text-primary-9 tabular-nums'>
                · {t`${age} ago`}
              </span>
            ) : null}
            {routeCount ? (
              <Icon
                name='lucide:chevron-down'
                aria-hidden
                className={cn(
                  'size-3.5 shrink-0 transition-transform duration-200',
                  routesOpen && 'rotate-180',
                )}
              />
            ) : null}
          </>
        )
        const stepClassName = cn(
          'flex max-w-[220px] min-w-0 items-center gap-1.5 rounded-full py-1 pr-2.5 pl-1 text-[12px] whitespace-nowrap transition-colors',
          isCurrent
            ? 'bg-surface font-semibold text-primary-11 shadow-sm ring-1 ring-primary-5'
            : isDone
              ? 'font-medium text-gray-12'
              : 'font-medium text-gray-10',
        )
        return (
          <Fragment key={`${step.id}-${number}`}>
            {index > 0 ? (
              <Icon
                className='hidden size-3.5 shrink-0 text-gray-8 lg:block'
                name='lucide:chevron-right'
                aria-hidden
              />
            ) : null}
            {/* Narrow headers keep only the current step; the others return
                at lg. Each step shrinks and ellipsizes its label instead of
                pushing the header wider. */}
            {routeCount ? (
              // Opens on hover / keyboard focus. The popover sits inside this
              // wrapper (its top padding bridges the gap), so moving the
              // pointer from the pill onto it keeps it open.
              <div
                className='relative hidden min-w-0 shrink lg:inline-flex'
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) {
                    setRoutesOpen(false)
                  }
                }}
                onFocus={() => setRoutesOpen(true)}
                onMouseEnter={() => setRoutesOpen(true)}
                onMouseLeave={() => setRoutesOpen(false)}
              >
                <button
                  aria-expanded={routesOpen}
                  aria-haspopup='dialog'
                  type='button'
                  className={cn(
                    stepClassName,
                    'cursor-default hover:bg-gray-3 hover:text-gray-12',
                    routesOpen && 'bg-gray-3 text-gray-12',
                  )}
                  // Touch screens have no hover: a tap opens it.
                  onClick={() => setRoutesOpen(true)}
                >
                  {stepBody}
                </button>

                <AnimatePresence>
                  {routesOpen && (
                    <motion.div
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      aria-label={t`Next stage`}
                      className='absolute top-full right-0 z-[100] pt-3'
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      role='dialog'
                    >
                      <div className='w-[320px] rounded-xl border border-[var(--gray-3)] bg-surface/95 p-4 shadow-2xl backdrop-blur-md'>
                        <div className='mb-3 flex items-center gap-2 border-b border-[var(--gray-2)] pb-2.5'>
                          <Icon
                            className='size-4 text-[var(--primary-9)]'
                            name='lucide:git-branch'
                          />
                          <span className='text-[14px] font-semibold text-[var(--gray-13)]'>
                            {t`Next stage`}
                          </span>
                        </div>

                        <ul className='m-0 flex list-none flex-col gap-1 p-0'>
                          {routes.map((route, routeIndex) => {
                            const tone = actionTone(route)
                            return (
                              <li
                                className='flex flex-col gap-0.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-[var(--gray-2)]'
                                key={`${route.action}-${route.condition || ''}-${routeIndex}`}
                              >
                                <div className='flex min-w-0 items-center gap-2 text-[13px]'>
                                  <span
                                    className={cn(
                                      'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[12px] font-medium',
                                      ACTION_COLOR_CLASS[tone],
                                    )}
                                  >
                                    <Icon
                                      className='size-3'
                                      name={actionIcon(route)}
                                    />
                                    {route.action || t`Continue`}
                                  </span>
                                  <Icon
                                    className='size-3.5 shrink-0 text-gray-8'
                                    name='lucide:arrow-right'
                                    aria-hidden
                                  />
                                  <span
                                    className={cn(
                                      'truncate',
                                      route.next.isEnd
                                        ? 'font-semibold text-green-11'
                                        : 'font-medium text-[var(--gray-12)]',
                                    )}
                                  >
                                    {route.next.label}
                                  </span>
                                </div>
                                {route.condition ? (
                                  <span className='pl-1 text-[11px] text-[var(--gray-10)]'>
                                    {route.condition}
                                  </span>
                                ) : null}
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Tooltip
                position='bottom'
                className={cn(
                  'min-w-0 shrink',
                  isCurrent ? 'min-w-[4.5rem]' : 'hidden lg:inline-flex',
                )}
                content={
                  showAge ? t`${stepLabel} · since ${sinceLabel}` : stepLabel
                }
              >
                <span
                  aria-current={isCurrent ? 'step' : undefined}
                  className={stepClassName}
                >
                  {stepBody}
                </span>
              </Tooltip>
            )}
          </Fragment>
        )
      })}
    </nav>
  )
}
