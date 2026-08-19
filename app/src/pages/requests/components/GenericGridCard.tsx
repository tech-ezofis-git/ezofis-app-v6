import { useMemo } from 'react'
import type { WorkflowOption } from '@/pages/requests/types'
import Icon from '@/components/base/icon/Icon'
import { buildTableMeta } from '../utils/dynamicTable.utils'
import {
  buildDynamicColumns,
  extractGenericRequestNumber,
  getFormPanels,
  resolveFormJson,
} from './columns/useDynamicColumns'

interface Props {
  row: any
  workflow: WorkflowOption | null
  onRowClick: (item: any, tab: string) => void
}

// Card for a generic (non-Accounts-Payable) workflow's grid view. Reuses
// the exact same field-resolution + renderCell logic as the table columns
// (buildDynamicColumns) so the grid and table always agree on which 3
// fields are shown and how they're formatted — nothing here is
// hardcoded to a specific workflow's field names.
const GenericGridCard = ({ row, workflow, onRowClick }: Props) => {
  const dynamicFields = useMemo(() => {
    const form = resolveFormJson(workflow)
    if (!form) return []
    const allPanels = getFormPanels(form)
    if (!allPanels.length) return []
    const tableMetaByParentId = buildTableMeta(allPanels)
    return buildDynamicColumns(allPanels, null, tableMetaByParentId).slice(0, 3)
  }, [workflow])

  const requestNo = extractGenericRequestNumber(row)
  const statusText = row?.status || row?.stage || '-'
  const raisedBy = row?.raisedBy || '-'
  const raisedAt = row?.raisedAt

  return (
    <div
      className='group flex w-full cursor-pointer flex-col gap-3 rounded-xl border border-gray-3 bg-surface p-4 transition-all hover:border-primary-4 hover:shadow-sm'
      onClick={() => onRowClick(row, 'Overview')}
    >
      <div className='flex items-start justify-between gap-3'>
        <div className='flex items-center gap-2.5'>
          <div className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-1'>
            <Icon className='size-4 text-primary-9' name='tabler:file-text' />
          </div>
          <div className='min-w-0'>
            <div className='truncate text-13 font-bold text-gray-13 group-hover:text-primary-9'>
              {requestNo}
            </div>
            <div className='truncate text-11 text-gray-9'>
              {raisedBy}
              {raisedAt ? ` · ${new Date(raisedAt).toLocaleDateString()}` : ''}
            </div>
          </div>
        </div>
        <span className='shrink-0 rounded-md border border-gray-4 bg-gray-2 px-2 py-0.5 text-11 font-semibold whitespace-nowrap text-gray-11'>
          {statusText}
        </span>
      </div>

      {dynamicFields.length > 0 && (
        <div className='grid grid-cols-1 gap-2 border-t border-gray-2 pt-3 sm:grid-cols-3'>
          {dynamicFields.map((col) => (
            <div className='min-w-0' key={col.id}>
              <div className='text-10 truncate font-bold tracking-wide text-gray-8 uppercase'>
                {col.label}
              </div>
              <div className='truncate text-12 font-medium text-gray-12'>
                {col.renderCell?.(row) ?? '-'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

GenericGridCard.displayName = 'GenericGridCard'
export default GenericGridCard
