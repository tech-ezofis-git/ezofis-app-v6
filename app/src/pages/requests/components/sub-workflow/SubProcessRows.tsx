import { useLingui } from '@lingui/react/macro'
import dayjs from 'dayjs'
import Icon from '@/components/base/icon/Icon'
import Tooltip from '@/components/base/Tooltip'
import {
  getSubProcessStatus,
  SUB_PROCESS_STATUS_META,
  type SubProcessRow,
  type SubProcessStatus,
} from '@/features/sub-workflow'
import {
  formatRunningSeconds,
  formatRunningTime,
} from '@/pages/requests/utils/formatRunningTime'
import cn from '@/utils/cn'
import { parseUtcDate } from '@/utils/utcDate'
import useOpenLinkedRequest from '../../hooks/useOpenLinkedRequest'

// The row follows the main request card (GenericGridCard): a round status
// icon, the request number with its stage pill, the form's preview values
// under it, then raised by / date and the time since the last action.

// Stage pill colour: purple (like the request's own stage pill) while the
// sub-process is in progress, green when completed, red when force-closed.
const PILL_TONE: Record<SubProcessStatus, string> = {
  completed: 'border-green-3 bg-green-2 text-green-11',
  forceClosed: 'border-red-3 bg-red-2 text-red-11',
  running: 'border-purple-4 bg-purple-3 text-purple-11',
}

const ICON_TONE: Record<SubProcessStatus, { bg: string; text: string }> = {
  completed: { bg: 'bg-green-2', text: 'text-green-9' },
  forceClosed: { bg: 'bg-red-2', text: 'text-red-9' },
  running: { bg: 'bg-orange-2', text: 'text-orange-9' },
}

// Same tones as the main card's "time since last action" pill.
const AGE_TONE: Record<SubProcessStatus, string> = {
  completed: 'border-green-3 bg-green-1 text-green-11',
  forceClosed: 'border-red-3 bg-red-1 text-red-11',
  running: 'border-orange-3 bg-orange-1 text-orange-11',
}

interface Props {
  rows: SubProcessRow[]
}

// The child requests of a list row, shown inline under its card (no overlay).
// Clicking one opens that child in place.
const SubProcessRows = ({ rows }: Props) => {
  const { t } = useLingui()
  const { open, openingId } = useOpenLinkedRequest()

  const statusLabel: Record<SubProcessStatus, string> = {
    completed: t`Completed`,
    forceClosed: t`Force Closed`,
    running: t`In-progress`,
  }
  const count = rows.length

  return (
    <div className='animate-in fade-in slide-in-from-top-1 mt-1 ml-6 border-l-2 border-primary-3 pl-3 duration-200'>
      <div className='mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-gray-9 uppercase'>
        <Icon className='size-3.5' name='tabler:sitemap' />
        {t`Sub Process`} · {count}
      </div>
      <ul className='space-y-1.5'>
        {rows.map((row) => {
          const status = getSubProcessStatus(row)
          const isOpening = openingId === String(row.processId)
          // In-progress rows show the stage they are on; finished ones the outcome.
          const pill = status === 'running' ? row.stage : statusLabel[status]
          const raisedAt = row.raisedAt ? parseUtcDate(row.raisedAt) : null
          const lastActionAge =
            typeof row.duration === 'number'
              ? formatRunningSeconds(row.duration)
              : formatRunningTime(row.raisedAt)
          const tone = ICON_TONE[status]
          return (
            <li key={`${row.subWorkflowId}:${row.processId}`}>
              <button
                className='group/sub flex w-full cursor-pointer items-center gap-3 rounded-xl border border-gray-3 bg-surface p-3 text-left transition-all duration-200 hover:border-primary-4 hover:shadow-sm active:scale-[0.995] disabled:cursor-wait disabled:opacity-60'
                disabled={Boolean(openingId)}
                title={statusLabel[status]}
                type='button'
                onClick={(e) => {
                  e.stopPropagation()
                  open({
                    instanceId: row.processId,
                    workflowId: row.subWorkflowId,
                  })
                }}
              >
                <span
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-full',
                    isOpening ? 'bg-primary-2' : tone.bg,
                  )}
                >
                  <Icon
                    className={cn(
                      'size-4',
                      isOpening ? 'animate-spin text-primary-9' : tone.text,
                    )}
                    name={
                      isOpening
                        ? 'tabler:loader-2'
                        : SUB_PROCESS_STATUS_META[status].icon
                    }
                  />
                </span>

                <span className='min-w-0 flex-1 overflow-hidden'>
                  <span className='flex min-w-0 flex-nowrap items-center gap-2.5'>
                    <Tooltip
                      className='min-w-0 shrink'
                      color='white'
                      content={row.requestNo}
                      position='bottom-start'
                    >
                      <span className='min-w-0 truncate text-[15px] font-medium tracking-tight whitespace-nowrap text-[var(--text-primary)] transition-colors group-hover/sub:text-[var(--primary-9)] group-hover/sub:underline'>
                        {row.requestNo}
                      </span>
                    </Tooltip>
                    {pill ? (
                      <span
                        className={cn(
                          'shrink-0 rounded-full border px-2 py-px text-[11px] font-semibold',
                          PILL_TONE[status],
                        )}
                      >
                        {pill}
                      </span>
                    ) : null}
                    {row.subWorkflowName ? (
                      <Tooltip
                        className='min-w-0 shrink'
                        color='white'
                        content={row.subWorkflowName}
                        position='bottom-start'
                      >
                        <span className='min-w-0 truncate text-11 text-gray-9'>
                          {row.subWorkflowName}
                        </span>
                      </Tooltip>
                    ) : null}
                  </span>
                  {row.preview?.length ? (
                    <span className='mt-1.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 overflow-hidden'>
                      {row.preview.map((field, idx) => (
                        <span
                          className='flex max-w-full min-w-0 items-center gap-1.5'
                          key={`${field.label}:${idx}`}
                          title={field.label || undefined}
                        >
                          {idx > 0 && (
                            <span className='shrink-0 text-gray-6'>·</span>
                          )}
                          <span className='min-w-0 truncate text-11 font-medium text-gray-10'>
                            {field.value}
                          </span>
                        </span>
                      ))}
                    </span>
                  ) : null}
                </span>

                <span className='hidden shrink-0 items-center gap-5 text-12 md:flex'>
                  <span className='flex flex-col items-end gap-0.5 text-right'>
                    {row.raisedBy ? (
                      <Tooltip
                        content={`Raised By: ${row.raisedBy}`}
                        position='bottom'
                      >
                        <span className='flex items-center gap-1.5 font-medium text-gray-11'>
                          <Icon
                            className='size-3.5 text-gray-8'
                            name='tabler:user'
                          />
                          <span className='max-w-[150px] truncate'>
                            {row.raisedBy}
                          </span>
                        </span>
                      </Tooltip>
                    ) : null}
                    {raisedAt ? (
                      <Tooltip
                        content={`Raised Date: ${dayjs(raisedAt).format('DD-MMM-YYYY hh:mm A')}`}
                        position='bottom'
                      >
                        <span className='flex items-center gap-1 text-11 text-gray-9'>
                          <Icon
                            className='size-3 text-gray-7'
                            name='tabler:calendar'
                          />
                          <span>
                            {dayjs(raisedAt).format('DD-MMM-YYYY hh:mm A')}
                          </span>
                        </span>
                      </Tooltip>
                    ) : null}
                  </span>
                  {lastActionAge ? (
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-11 font-semibold',
                        AGE_TONE[status],
                      )}
                    >
                      <Icon
                        className='size-3'
                        name={
                          status === 'completed'
                            ? 'tabler:circle-check'
                            : 'tabler:clock'
                        }
                      />
                      <span>{lastActionAge}</span>
                    </span>
                  ) : null}
                </span>

                <Icon
                  className='size-4 shrink-0 text-gray-6 transition-colors group-hover/sub:text-gray-9'
                  name='tabler:chevron-right'
                />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default SubProcessRows
