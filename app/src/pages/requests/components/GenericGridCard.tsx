import dayjs from 'dayjs'
import { useMemo } from 'react'
import type { WorkflowOption } from '@/pages/requests/types'
import Icon from '@/components/base/icon/Icon'
import Tooltip from '@/components/base/Tooltip'
import { normalizeFieldKey } from '@/pages/folders/utils/repositoryFieldUtils'
import {
  extractPreviewValues,
  getGenericStageInfo,
} from '@/pages/requests/utils/workflow.utils'
import cn from '@/utils/cn'
import { parseUtcDate } from '@/utils/utcDate'
import { buildTableMeta } from '../utils/dynamicTable.utils'
import {
  buildDynamicColumns,
  extractGenericRequestNumber,
  extractInvoiceNumber,
  extractPONumber,
  findSupplierName,
  getFormPanels,
  resolveFormJson,
  resolveConfiguredTitle,
} from './columns/useDynamicColumns'
import GenericStagePill from './GenericStagePill'

// Matches the "Xh Ym ago" granularity already used in the request-detail
// History panel, instead of dayjs's coarser "8 hours ago".
const formatRunningTime = (date: any): string => {
  if (!date) return ''
  // Bare ISO datetimes from the API are UTC without a Z/offset — parse them
  // as UTC (parseUtcDate) before diffing, otherwise the browser reads them
  // as local time and the "ago" value is off by the local UTC offset.
  const parsed = parseUtcDate(date)
  if (!parsed) return ''
  const ms = Math.abs(Date.now() - parsed.getTime())
  if (Number.isNaN(ms)) return ''
  const secs = Math.floor(ms / 1000)
  if (secs < 60) return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ${mins % 60}m ago`
  const days = Math.floor(hours / 24)
  return `${days}d ${hours % 24}h ago`
}

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
  // Only show fields the workflow's Settings -> Configuration -> Field
  // Selection preview list opted into (matched by label, case/spacing
  // insensitive). No preview fields configured -> render nothing here,
  // rather than falling back to an arbitrary "first 3 fields" guess.
  const previewValues = useMemo(
    () => extractPreviewValues(workflow),
    [workflow],
  )

  const dynamicFields = useMemo(() => {
    if (!previewValues.length) return []

    const form = resolveFormJson(workflow)
    if (!form) return []
    const allPanels = getFormPanels(form)
    if (!allPanels.length) return []
    const tableMetaByParentId = buildTableMeta(allPanels)
    const allFields = buildDynamicColumns(allPanels, null, tableMetaByParentId)

    const wantedLabels = new Set(
      previewValues.map((label) => normalizeFieldKey(label)),
    )
    return allFields.filter((col) =>
      wantedLabels.has(normalizeFieldKey(col.label)),
    )
  }, [workflow, previewValues])

  const dynamicFieldRows = useMemo(() => {
    const rows: (typeof dynamicFields)[] = []
    for (let i = 0; i < dynamicFields.length; i += 3) {
      rows.push(dynamicFields.slice(i, i + 3))
    }
    return rows
  }, [dynamicFields])

  const isDocumentApproval = workflow?.name === 'Document Approval'
  const configuredTitle = resolveConfiguredTitle(row, workflow, isDocumentApproval)

  const requestNo = configuredTitle || (isDocumentApproval 
    ? (row?.repositoryItem?.fileName || extractGenericRequestNumber(row))
    : extractGenericRequestNumber(row))
  const raisedBy =
    row?.createdByName ||
    row?.createdByEmail ||
    row?.transactionCreatedByEmail ||
    row?.raisedBy ||
    row?.createdBy ||
    row?.userName ||
    '-'
  const startedAt =
    row?.startedAtUtc ||
    row?.createdAtUtc ||
    row?.createdAt ||
    row?.raisedAt ||
    row?.createdOn
  const lastActionBy =
    row?.transactionCreatedByEmail ||
    row?.lastActionBy ||
    row?.lastActionUser ||
    row?.updatedBy ||
    raisedBy
  const lastActionAt =
    row?.transactionCreatedAt ||
    row?.lastActionDate ||
    row?.lastAction?.date ||
    row?.lastAction?.createdAt ||
    row?.lastActionAt ||
    row?.updatedAt ||
    row?.actionDate ||
    startedAt

  const { currentLabel, isTerminal, previousLabel } = getGenericStageInfo(
    workflow,
    row,
  )

  const isAgentStage = Boolean(row?.stageType?.toUpperCase().includes('AGENT'))

  return (
    <div
      className='group flex w-full cursor-pointer items-center gap-3 rounded-xl border border-gray-3 bg-surface p-3.5 transition-all hover:border-primary-4 hover:shadow-sm'
      onClick={() => onRowClick(row, 'Overview')}
    >
      <div
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full',
          isAgentStage ? 'bg-orange-2' : isTerminal ? 'bg-green-2' : 'bg-orange-2',
        )}
      >
        <Icon
          name={isAgentStage ? 'tabler:loader-2' : isTerminal ? 'tabler:check' : 'tabler:clock'}
          className={cn(
            'size-4',
            isAgentStage ? 'text-orange-9 animate-spin' : isTerminal ? 'text-green-9' : 'text-orange-9',
          )}
        />
      </div>

      <div className='min-w-0 flex-1 overflow-hidden'>
        {/* Left Side: Request Number + Current Stage Pill next to Request Number */}
        <div className='flex flex-wrap items-center gap-2 min-w-0 max-w-full'>
          <span className='shrink-0 text-13 font-bold text-gray-13'>
            {requestNo}
          </span>
          <GenericStagePill
            currentLabel={currentLabel}
            isTerminal={isTerminal}
            previousLabel={previousLabel}
          />
        </div>

        {dynamicFieldRows.length > 0 && (
          <div className='mt-1.5 flex flex-col gap-1 min-w-0 max-w-full overflow-hidden'>
            {dynamicFieldRows.map((fieldRow, rowIdx) => (
              <div
                className='flex flex-wrap items-center gap-1.5 min-w-0 max-w-full overflow-hidden'
                key={fieldRow.map((col) => col.id).join('-') || rowIdx}
              >
                {fieldRow.map((col, idx) => (
                  <span className='flex min-w-0 max-w-full items-center gap-1.5 overflow-hidden' key={col.id}>
                    {idx > 0 && <span className='text-gray-6 shrink-0'>·</span>}
                    <div className='min-w-0 max-w-full overflow-hidden text-11 font-medium text-gray-10'>
                      {col.renderCell?.(row) ?? '-'}
                    </div>
                  </span>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right Side: Raised By & Date + Running Time from Last Action */}
      <div className='hidden shrink-0 items-center gap-5 text-12 md:flex'>
        <div className='flex flex-col items-end gap-0.5 text-right'>
          {raisedBy && raisedBy !== '-' && (
            <Tooltip content={`Raised By: ${raisedBy}`} position='bottom'>
              <div className='flex items-center gap-1.5 font-medium text-gray-11'>
                <Icon className='size-3.5 text-gray-8' name='tabler:user' />
                <span className='max-w-[150px] truncate'>{raisedBy}</span>
              </div>
            </Tooltip>
          )}
          {startedAt && (
            <Tooltip
              content={`Raised Date: ${dayjs(parseUtcDate(startedAt)).format('DD-MMM-YYYY hh:mm A')}`}
              position='bottom'
            >
              <div className='flex items-center gap-1 text-11 text-gray-9'>
                <Icon className='size-3 text-gray-7' name='tabler:calendar' />
                <span>
                  {dayjs(parseUtcDate(startedAt)).format('DD-MMM-YYYY hh:mm A')}
                </span>
              </div>
            </Tooltip>
          )}
        </div>

        <div className='flex flex-col items-end gap-0.5 text-right'>
          {lastActionAt && (
            <Tooltip
              position='bottom'
              content={
                lastActionBy && lastActionBy !== '-'
                  ? `Last action by ${lastActionBy}`
                  : 'Time running from last action'
              }
            >
              <span className='inline-flex items-center gap-1 rounded-full border border-orange-3 bg-orange-1 px-2.5 py-0.5 text-11 font-semibold text-orange-11'>
                <Icon className='size-3 text-orange-9' name='tabler:clock' />
                <span>{formatRunningTime(lastActionAt)}</span>
              </span>
            </Tooltip>
          )}
        </div>
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
