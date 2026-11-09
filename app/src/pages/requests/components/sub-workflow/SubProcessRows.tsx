import { useLingui } from '@lingui/react/macro'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import Icon from '@/components/base/icon/Icon'
import {
  getSubProcessStatus,
  SUB_PROCESS_STATUS_META,
  type SubProcessRow,
  type SubProcessStatus,
} from '@/features/sub-workflow'
import cn from '@/utils/cn'
import useOpenLinkedRequest from '../../hooks/useOpenLinkedRequest'

dayjs.extend(relativeTime)

// Stage pill colour: purple (like the request's own stage pill) while the
// sub-process is in progress, green when completed, red when force-closed.
const PILL_TONE: Record<SubProcessStatus, string> = {
  completed: 'border-green-3 bg-green-2 text-green-11',
  forceClosed: 'border-red-3 bg-red-2 text-red-11',
  running: 'border-purple-4 bg-purple-3 text-purple-11',
}

const ICON_TONE: Record<SubProcessStatus, string> = {
  completed: 'text-green-9',
  forceClosed: 'text-red-9',
  running: 'text-orange-9',
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
      <ul className='space-y-1'>
        {rows.map((row) => {
          const status = getSubProcessStatus(row)
          const isOpening = openingId === String(row.processId)
          // In-progress rows show the stage they are on; finished ones the outcome.
          const pill = status === 'running' ? row.stage : statusLabel[status]
          const age = row.raisedAt ? dayjs(row.raisedAt).fromNow() : ''
          return (
            <li key={`${row.subWorkflowId}:${row.processId}`}>
              <button
                className='group/sub flex w-full cursor-pointer items-center gap-2.5 rounded-lg border border-gray-3 bg-surface px-3 py-2 text-left transition-all duration-200 hover:border-primary-5 hover:bg-primary-1 active:scale-[0.995] disabled:cursor-wait disabled:opacity-60'
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
                <Icon
                  className={cn(
                    'size-4 shrink-0',
                    isOpening
                      ? 'animate-spin text-primary-9'
                      : ICON_TONE[status],
                  )}
                  name={
                    isOpening
                      ? 'tabler:loader-2'
                      : SUB_PROCESS_STATUS_META[status].icon
                  }
                />
                <span className='shrink-0 text-13 font-semibold text-gray-12 group-hover/sub:text-primary-11 group-hover/sub:underline'>
                  {row.requestNo}
                </span>
                <span className='min-w-0 truncate text-13 text-gray-10'>
                  {row.subWorkflowName}
                </span>
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
                {age ? (
                  <span className='ml-auto shrink-0 text-xs text-gray-9'>
                    {age}
                  </span>
                ) : null}
                <Icon
                  className={cn(
                    'size-3.5 shrink-0 text-gray-6 transition-colors group-hover/sub:text-primary-9',
                    !age && 'ml-auto',
                  )}
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
