import { useLingui } from '@lingui/react/macro'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import {
  getSubProcessStatus,
  SUB_PROCESS_STATUS_META,
  type SubProcessRow,
  type SubProcessStatus,
  useSubProcesses,
} from '@/features/sub-workflow'
import cn from '@/utils/cn'
import useOpenLinkedRequest from '../../hooks/useOpenLinkedRequest'

dayjs.extend(relativeTime)

interface Props {
  processId?: number | string
  workflowId?: number | string
  onClose: () => void
}

const STATUS_CHIP_CLASS: Record<SubProcessStatus, string> = {
  completed: 'bg-green-3 text-green-11',
  forceClosed: 'bg-red-3 text-red-11',
  running: 'bg-orange-3 text-orange-11',
}

// V5 "Sub Request" sheet: one card per child request linked to this one.
const SubProcessPanel = ({ processId, workflowId, onClose }: Props) => {
  const { t } = useLingui()
  const { data, isError, isLoading, refetch } = useSubProcesses(
    workflowId,
    processId,
  )
  const { open, openingId } = useOpenLinkedRequest()

  const statusLabel: Record<SubProcessStatus, string> = {
    completed: t`Completed`,
    forceClosed: t`Force Closed`,
    running: t`Running`,
  }

  const rows = data ?? []

  const renderRow = (row: SubProcessRow, index: number) => {
    const status = getSubProcessStatus(row)
    const isOpening = openingId === String(row.processId)
    const since = row.raisedAt ? dayjs(row.raisedAt).fromNow() : ''
    const meta = [row.subWorkflowName, row.stage, since].filter(Boolean)
    return (
      <li
        className='animate-in fade-in slide-in-from-right-1 fill-mode-both duration-200'
        key={`${row.subWorkflowId}:${row.processId}`}
        style={{ animationDelay: `${index * 40}ms` }}
      >
        <button
          className='group flex w-full cursor-pointer items-start gap-3 rounded-xl border border-gray-3 bg-surface p-3 text-left transition-all duration-200 hover:border-primary-6 hover:bg-primary-1 hover:shadow-sm active:scale-[0.99] disabled:cursor-wait disabled:opacity-60'
          disabled={Boolean(openingId)}
          type='button'
          onClick={() =>
            open({ instanceId: row.processId, workflowId: row.subWorkflowId })
          }
        >
          <span className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-2 text-primary-9'>
            <Icon
              className={cn('size-4', isOpening && 'animate-spin')}
              name={isOpening ? 'tabler:loader-2' : 'tabler:sitemap'}
            />
          </span>
          <span className='min-w-0 flex-1'>
            <span className='flex items-center justify-between gap-2'>
              <span className='truncate text-13 font-semibold text-gray-12 underline-offset-2 group-hover:text-primary-11 group-hover:underline'>
                {row.requestNo}
              </span>
              <span
                className={cn(
                  'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                  STATUS_CHIP_CLASS[status],
                )}
              >
                <Icon
                  className='size-3'
                  name={SUB_PROCESS_STATUS_META[status].icon}
                />
                {statusLabel[status]}
              </span>
            </span>
            {meta.length > 0 && (
              <span className='mt-1 block truncate text-xs text-gray-10'>
                {meta.join(' · ')}
              </span>
            )}
          </span>
        </button>
      </li>
    )
  }

  return (
    <div className='flex h-full min-h-0 flex-col'>
      <div className='flex shrink-0 items-center justify-between border-b border-gray-3 px-3 py-2.5'>
        <span className='text-xs font-semibold text-gray-12'>
          {t`Sub Process`}
          {rows.length > 0 ? (
            <span className='ml-1.5 text-gray-10'>({rows.length})</span>
          ) : null}
        </span>
        <IconButton
          ariaLabel={t`Close`}
          icon='tabler:x'
          size='sm'
          variant='ghost'
          onClick={onClose}
        />
      </div>
      <div className='min-h-0 flex-1 overflow-y-auto px-3 py-3'>
        {isLoading ? (
          <ul className='space-y-2'>
            {[0, 1, 2].map((i) => (
              <li
                className='h-[62px] animate-pulse rounded-xl bg-gray-3'
                key={i}
              />
            ))}
          </ul>
        ) : isError ? (
          <div className='flex flex-col items-center gap-2 px-4 py-10 text-center'>
            <Icon className='size-6 text-red-9' name='tabler:alert-circle' />
            <p className='text-13 text-gray-11'>{t`Couldn't load sub-processes.`}</p>
            <button
              className='cursor-pointer rounded-md px-2 py-1 text-xs font-semibold text-primary-11 transition-all hover:bg-primary-2 active:scale-95'
              type='button'
              onClick={() => refetch()}
            >
              {t`Try again`}
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className='animate-in fade-in flex flex-col items-center gap-2 px-4 py-10 text-center duration-300'>
            <span className='flex size-10 items-center justify-center rounded-xl bg-gray-2'>
              <Icon className='size-5 text-gray-8' name='tabler:sitemap' />
            </span>
            <p className='text-13 font-medium text-gray-12'>
              {t`No sub-processes yet`}
            </p>
            <p className='text-xs text-gray-10'>
              {t`Requests started from this one with "Initiate" appear here.`}
            </p>
          </div>
        ) : (
          <ul className='space-y-2'>{rows.map(renderRow)}</ul>
        )}
      </div>
    </div>
  )
}

export default SubProcessPanel
