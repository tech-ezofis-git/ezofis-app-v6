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

const ICON_TONE: Record<SubProcessStatus, string> = {
  completed: 'text-green-9',
  forceClosed: 'text-red-9',
  running: 'text-orange-9',
}

interface Props {
  rows: SubProcessRow[]
}

// V5 inbox sub-rows: the child requests of a list row, shown inline under
// its card (no overlay). Clicking one opens that child in place.
const SubProcessRows = ({ rows }: Props) => {
  const { t } = useLingui()
  const { open, openingId } = useOpenLinkedRequest()

  const statusLabel: Record<SubProcessStatus, string> = {
    completed: t`Completed`,
    forceClosed: t`Force Closed`,
    running: t`In-progress`,
  }

  return (
    <ul className='animate-in fade-in slide-in-from-top-1 mt-1 ml-6 space-y-1 border-l-2 border-primary-3 pl-3 duration-200'>
      {rows.map((row) => {
        const status = getSubProcessStatus(row)
        const isOpening = openingId === String(row.processId)
        const meta = [
          row.subWorkflowName,
          row.stage,
          row.raisedAt ? dayjs(row.raisedAt).fromNow() : '',
        ].filter(Boolean)
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
                  isOpening ? 'animate-spin text-primary-9' : ICON_TONE[status],
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
              {meta.length > 0 && (
                <span className='min-w-0 truncate text-xs text-gray-10'>
                  · {meta.join(' · ')}
                </span>
              )}
              <Icon
                className='ml-auto size-3.5 shrink-0 text-gray-6 transition-colors group-hover/sub:text-primary-9'
                name='tabler:chevron-right'
              />
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export default SubProcessRows
