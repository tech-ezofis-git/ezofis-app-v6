import dayjs from 'dayjs'
import { useMemo } from 'react'
import type { V6WorkflowDetail } from '@/api/v6/workflows'
import type { WorkflowOption } from '@/pages/requests/types'
import Icon from '@/components/base/icon/Icon'
import Tooltip from '@/components/base/Tooltip'
import { normalizeFieldKey } from '@/pages/folders/utils/repositoryFieldUtils'
import {
  buildDynamicColumns,
  extractGenericRequestNumber,
  getFormPanels,
  resolveFormJson,
} from '@/pages/requests/components/columns/useDynamicColumns'
import GenericStagePill from '@/pages/requests/components/GenericStagePill'
import { buildTableMeta } from '@/pages/requests/utils/dynamicTable.utils'
import {
  extractPreviewValues,
  getGenericStageInfo,
} from '@/pages/requests/utils/workflow.utils'
import cn from '@/utils/cn'
import { parseUtcDate } from '@/utils/utcDate'
import { submissionInstanceIds } from '../helpers/portalDetail'
import {
  PORTAL_STATUS_TONE,
  type PortalSubmission,
} from '../helpers/portalSubmissions'

const formatRunningTime = (date: unknown): string => {
  if (!date) return ''
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

type PortalSubmissionRowProps = {
  submission: PortalSubmission
  workflow?: V6WorkflowDetail | null
  onOpen: (submission: PortalSubmission) => void
}

const asRecord = (value: unknown) =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null

const toListRow = (submission: PortalSubmission): Record<string, any> => {
  const { activityId } = submissionInstanceIds(submission)
  const raw = submission.raw
  return {
    ...raw,
    activityId: activityId || raw.activityId,
    formEntryId: raw.formEntryId,
    requestNo: submission.requestNo,
    stage: raw.stage || raw.stageName || submission.status,
  }
}

export default function PortalSubmissionRow({
  submission,
  workflow,
  onOpen,
}: PortalSubmissionRowProps) {
  const row = useMemo(() => toListRow(submission), [submission])
  const previewValues = useMemo(
    () => extractPreviewValues(workflow),
    [workflow],
  )

  const dynamicFields = useMemo(() => {
    if (!previewValues.length || !workflow) return []
    const form = resolveFormJson((workflow || null) as WorkflowOption | null)
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
  }, [previewValues, workflow])

  const dynamicFieldRows = useMemo(() => {
    const rows: (typeof dynamicFields)[] = []
    for (let i = 0; i < dynamicFields.length; i += 3) {
      rows.push(dynamicFields.slice(i, i + 3))
    }
    return rows
  }, [dynamicFields])

  const requestNo = extractGenericRequestNumber(row)
  const raisedBy = String(
    row.createdByName ||
      row.createdByEmail ||
      row.transactionCreatedByEmail ||
      row.raisedBy ||
      row.createdBy ||
      row.userName ||
      '',
  ).trim()
  const startedAt =
    row.startedAtUtc ||
    row.createdAtUtc ||
    row.createdAt ||
    row.raisedAt ||
    row.createdOn ||
    submission.submittedAt
  const lastAction = asRecord(row.lastAction)
  const lastActionBy = String(
    row.transactionCreatedByEmail ||
      row.lastActionBy ||
      row.lastActionUser ||
      row.updatedBy ||
      raisedBy ||
      '',
  )
  const lastActionAt =
    row.transactionCreatedAt ||
    row.lastActionDate ||
    lastAction?.date ||
    lastAction?.createdAt ||
    row.lastActionAt ||
    row.updatedAt ||
    row.actionDate ||
    startedAt

  const { currentLabel, isTerminal, previousLabel } = getGenericStageInfo(
    workflow,
    row,
  )

  return (
    <button
      className='group w-full cursor-pointer border-t border-gray-3 bg-surface text-left transition hover:bg-gray-2 active:bg-gray-3'
      type='button'
      onClick={() => onOpen(submission)}
    >
      <div className='overflow-x-auto'>
        <div className='grid w-full min-w-[820px] grid-cols-[minmax(0,1.3fr)_9.75rem_11.75rem_minmax(0,1fr)_7.25rem_1rem] items-center gap-3 px-1 py-3.5'>
          <div className='flex min-w-0 items-center gap-2'>
            <span className='shrink-0 text-13 font-bold text-gray-13'>
              {requestNo}
            </span>
            <GenericStagePill
              currentLabel={currentLabel}
              isTerminal={isTerminal}
              previousLabel={previousLabel}
            />
            {dynamicFieldRows.length > 0 ? (
              <div className='hidden min-w-0 flex-1 truncate lg:block'>
                {dynamicFieldRows.map((fieldRow, rowIdx) => (
                  <div
                    className='flex items-center gap-1.5 truncate'
                    key={fieldRow.map((col) => col.id).join('-') || rowIdx}
                  >
                    {fieldRow.map((col, idx) => (
                      <span className='flex items-center gap-1.5' key={col.id}>
                        {idx > 0 && <span className='text-gray-6'>·</span>}
                        <span className='truncate text-11 font-medium text-gray-10'>
                          {col.renderCell?.(row) ?? '-'}
                        </span>
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            ) : submission.title !== submission.requestNo ? (
              <span className='hidden truncate text-11 font-medium text-gray-10 lg:inline'>
                {submission.title}
              </span>
            ) : null}
          </div>

          <div className='flex min-w-0 justify-start'>
            <span
              className={cn(
                'inline-flex h-6 w-full max-w-[9.75rem] items-center justify-center gap-1.5 rounded-full px-2.5 text-12 font-medium',
                PORTAL_STATUS_TONE[submission.status],
              )}
            >
              <span className='size-1.5 shrink-0 rounded-full bg-current' />
              <span className='truncate'>{submission.status}</span>
            </span>
          </div>

          <div className='flex min-w-0 items-center'>
            {startedAt ? (
              <Tooltip
                content={`Raised Date: ${dayjs(parseUtcDate(startedAt)).format('DD-MMM-YYYY hh:mm A')}`}
                position='bottom'
              >
                <div className='flex items-center gap-1 text-11 whitespace-nowrap text-gray-9'>
                  <Icon
                    className='size-3 shrink-0 text-gray-7'
                    name='tabler:calendar'
                  />
                  <span>
                    {dayjs(parseUtcDate(startedAt)).format(
                      'DD-MMM-YYYY hh:mm A',
                    )}
                  </span>
                </div>
              </Tooltip>
            ) : null}
          </div>

          <div className='flex min-w-0 items-center justify-end'>
            {raisedBy ? (
              <Tooltip content={`Raised By: ${raisedBy}`} position='bottom'>
                <div className='flex min-w-0 items-center gap-1.5 font-medium text-gray-11'>
                  <Icon
                    className='size-3.5 shrink-0 text-gray-8'
                    name='tabler:user'
                  />
                  <span className='truncate'>{raisedBy}</span>
                </div>
              </Tooltip>
            ) : null}
          </div>

          <div className='flex justify-end'>
            {lastActionAt ? (
              <Tooltip
                position='bottom'
                content={
                  lastActionBy
                    ? `Last action by ${lastActionBy}`
                    : 'Time running from last action'
                }
              >
                <span className='inline-flex items-center gap-1 rounded-full border border-orange-3 bg-orange-1 px-2.5 py-0.5 text-11 font-semibold whitespace-nowrap text-orange-11'>
                  <Icon className='size-3 text-orange-9' name='tabler:clock' />
                  <span>{formatRunningTime(lastActionAt)}</span>
                </span>
              </Tooltip>
            ) : null}
          </div>

          <Icon
            name='tabler:chevron-right'
            className={cn(
              'size-4 shrink-0 justify-self-end text-gray-6 transition-colors group-hover:text-gray-9',
            )}
          />
        </div>
      </div>
    </button>
  )
}

PortalSubmissionRow.displayName = 'PortalSubmissionRow'
