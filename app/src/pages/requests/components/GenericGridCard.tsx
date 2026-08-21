import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useMemo } from 'react'
import type { WorkflowOption } from '@/pages/requests/types'
import Icon from '@/components/base/icon/Icon'
import { getGenericStageInfo } from '@/pages/requests/utils/workflow.utils'
import cn from '@/utils/cn'
import { buildTableMeta } from '../utils/dynamicTable.utils'
import {
  buildDynamicColumns,
  extractGenericRequestNumber,
  getFormPanels,
  resolveFormJson,
} from './columns/useDynamicColumns'
import GenericStagePill from './GenericStagePill'

dayjs.extend(relativeTime)

interface Props {
  row: any
  workflow: WorkflowOption | null
  onRowClick: (item: any, tab: string) => void
}

// Card for a generic (non-Accounts-Payable) workflow's grid view. Reuses
// the exact same field-resolution + renderCell logic as the table columns
// (buildDynamicColumns) so the grid and table always agree on which
// fields are shown and how they're formatted — nothing here is
// hardcoded to a specific workflow's field names.
const GenericGridCard = ({ row, workflow, onRowClick }: Props) => {
  const dynamicFields = useMemo(() => {
    const form = resolveFormJson(workflow)
    if (!form) return []
    const allPanels = getFormPanels(form)
    if (!allPanels.length) return []
    const tableMetaByParentId = buildTableMeta(allPanels)
    return buildDynamicColumns(allPanels, null, tableMetaByParentId)
  }, [workflow])

  const requestNo = extractGenericRequestNumber(row)
  const raisedBy = row?.raisedBy || row?.transactionCreatedByEmail || '-'
  const raisedAt =
    row?.raisedAt || row?.createdAtUtc || row?.transactionCreatedAt
  const { currentLabel, isTerminal, previousLabel } = getGenericStageInfo(
    workflow,
    row,
  )

  return (
    <div
      className='group flex w-full cursor-pointer items-center gap-3 rounded-xl border border-gray-3 bg-surface p-3.5 transition-all hover:border-primary-4 hover:shadow-sm'
      onClick={() => onRowClick(row, 'Overview')}
    >
      <div
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full',
          isTerminal ? 'bg-green-2' : 'bg-orange-2',
        )}
      >
        <Icon
          name={isTerminal ? 'tabler:check' : 'tabler:clock'}
          className={cn(
            'size-4',
            isTerminal ? 'text-green-9' : 'text-orange-9',
          )}
        />
      </div>

      <div className='min-w-0 flex-1'>
        <div className='flex items-center gap-1.5'>
          <span className='shrink-0 text-13 font-bold text-gray-13'>
            {requestNo}
          </span>
          <span className='text-gray-6'>·</span>
          <span className='truncate text-12 text-gray-9'>{raisedBy}</span>
        </div>
        {dynamicFields.length > 0 && (
          <div className='mt-1.5 flex flex-wrap gap-1.5'>
            {dynamicFields.slice(0, 3).map((col) => (
              <span
                className='rounded-full border border-gray-3 px-2 py-0.5 text-11 font-medium text-gray-11'
                key={col.id}
              >
                {col.renderCell?.(row) ?? '-'}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className='hidden shrink-0 items-center gap-6 md:flex'>
        <GenericStagePill
          currentLabel={currentLabel}
          isTerminal={isTerminal}
          previousLabel={previousLabel}
        />
        {raisedAt && (
          <div className='flex flex-col items-end'>
            <span className='text-11 text-gray-9'>
              {dayjs(raisedAt).fromNow()}
            </span>
            <span className='text-12 font-bold text-gray-12'>
              {dayjs(raisedAt).format('MMM D')}
            </span>
          </div>
        )}
      </div>

      <Icon
        className='size-4 shrink-0 text-gray-6 transition-colors group-hover:text-gray-9'
        name='tabler:chevron-right'
      />
    </div>
  )
}

GenericGridCard.displayName = 'GenericGridCard'
export default GenericGridCard
