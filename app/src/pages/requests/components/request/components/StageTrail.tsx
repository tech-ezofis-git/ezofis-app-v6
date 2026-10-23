import { useLingui } from '@lingui/react/macro'
import { Fragment } from 'react'
import type { StageTrailItem } from '@/pages/requests/utils/workflow.utils'
import Icon from '@/components/base/icon/Icon'
import Tooltip from '@/components/base/Tooltip'
import cn from '@/utils/cn'
import { formatUtcToLocalDateTime, parseUtcDate } from '@/utils/utcDate'

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
 * step shows how long the request has been waiting there.
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
  if (!items.length) return null

  const age = formatShortAge(since)
  const sinceLabel = since ? formatUtcToLocalDateTime(since, since) : ''

  return (
    <nav
      aria-label={t`Workflow stages`}
      className='animate-in fade-in flex min-w-0 shrink items-center gap-0.5 rounded-full border border-gray-3 bg-gray-1 p-1 duration-300'
    >
      {items.map(({ number, step }, index) => {
        const isDone = step.status === 'done'
        const isCurrent = step.status === 'current'
        const stepLabel = step.label
        const showAge = isCurrent && Boolean(age)
        return (
          <Fragment key={`${step.id}-${number}`}>
            {index > 0 ? (
              <Icon
                className='size-3.5 shrink-0 text-gray-8'
                name='lucide:chevron-right'
                aria-hidden
              />
            ) : null}
            <Tooltip
              position='bottom'
              content={
                showAge ? t`${stepLabel} · since ${sinceLabel}` : stepLabel
              }
            >
              <span
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'flex max-w-[220px] min-w-0 items-center gap-1.5 rounded-full py-1 pr-2.5 pl-1 text-[12px] whitespace-nowrap transition-colors',
                  isCurrent
                    ? 'bg-surface font-semibold text-primary-11 shadow-sm ring-1 ring-primary-5'
                    : isDone
                      ? 'font-medium text-gray-12'
                      : 'font-medium text-gray-10',
                )}
              >
                <span
                  className={cn(
                    'flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                    isDone && !step.isCondition
                      ? 'bg-green-9 text-white'
                      : isCurrent
                        ? 'bg-primary-9 text-white'
                        : 'border border-gray-5 bg-surface text-gray-10',
                  )}
                >
                  {step.isCondition ? (
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
              </span>
            </Tooltip>
          </Fragment>
        )
      })}
    </nav>
  )
}
