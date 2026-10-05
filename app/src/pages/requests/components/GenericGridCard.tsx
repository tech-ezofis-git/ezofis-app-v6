import dayjs from 'dayjs'
import { useMemo } from 'react'
import type { WorkflowOption } from '@/pages/requests/types'
import Icon from '@/components/base/icon/Icon'
import Tooltip from '@/components/base/Tooltip'
import AiBrandIcon from '@/components/common/AiBrandIcon'
import useAskAIStore from '@/components/common/ask-ai/stores/useAskAIStore'
import { normalizeFieldKey } from '@/pages/folders/utils/repositoryFieldUtils'
import requestStore from '@/pages/requests/stores/useRequestStore'
import { resolveApAgentJobMessage } from '@/pages/requests/utils/resolveApAgentJobMessage'
import { getGenericStageInfo } from '@/pages/requests/utils/workflow.utils'
import usePlaygroundStore from '@/stores/usePlaygroundStore'
import cn from '@/utils/cn'
import { parseUtcDate } from '@/utils/utcDate'
import HoverExpandableText from './HoverExpandableText'
import {
  extractGenericRequestNumber,
  readPreviewChipText,
  resolveConfiguredTitle,
  resolvePreviewFieldColumns,
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
  const isPlaygroundOpen = usePlaygroundStore((state) => state.isOpen)
  const isAskAIOpen = useAskAIStore((state) => state.isOpen)
  const isSidebarOpen = isPlaygroundOpen || isAskAIOpen

  const jobStatuses = requestStore((state) => state.jobStatuses)
  const jobMappings = requestStore((state) => state.jobMappings)
  const processingProcesses = requestStore((state) => state.processingProcesses)
  const rawWorkflowData = requestStore((state) => state.rawWorkflowData)
  const jobMessage = useMemo(() => {
    const direct = resolveApAgentJobMessage(row)
    if (direct) return direct

    // List rows often lack apAgentJobId; match the in-flight Hangfire
    // process by request number / instance id so the status text still shows.
    const rowIds = new Set(
      [
        row?.id,
        row?.processId,
        row?.workflowInstanceId,
        row?.instanceId,
        row?.apAgentJobId,
        row?.jobId,
        row?.requestNo,
        row?.reqNo,
      ]
        .filter((v) => v !== null && v !== undefined && String(v).trim() !== '')
        .map(String),
    )
    if (rowIds.size === 0) return ''

    for (const process of processingProcesses || []) {
      const processIds = [
        process.apAgentJobId,
        process.jobId,
        process.processId,
        process.id,
        process.instanceId,
        process.requestNo,
      ]
        .filter(Boolean)
        .map(String)
      if (!processIds.some((id) => rowIds.has(id))) continue

      const jobId = process.apAgentJobId || process.jobId
      if (!jobId) continue
      return (
        resolveApAgentJobMessage({
          ...row,
          apAgentJobId: jobId,
          id: process.processId || process.id || row?.id,
          jobId,
        }) || ''
      )
    }

    return ''
  }, [row, jobStatuses, jobMappings, processingProcesses])

  // Only show fields the workflow's Settings -> Configuration -> Field
  // Selection preview list opted into (matched by label, case/spacing
  // insensitive). No preview fields configured -> render nothing here,
  // rather than falling back to an arbitrary "first 3 fields" guess.
  // Fall back to the store workflow so opening a request cannot drop the
  // configured labels when the list's workflow object is replaced.
  const { columns: dynamicFields, previewValues } = useMemo(
    () => resolvePreviewFieldColumns(workflow, rawWorkflowData),
    [workflow, rawWorkflowData],
  )

  const previewChips = useMemo(() => {
    const chips: { id: string; text: string }[] = []
    const seen = new Set<string>()
    for (const col of dynamicFields) {
      const text = readPreviewChipText(row, col.id, col.label)
      const key = normalizeFieldKey(col.label || col.id)
      if (!text || !key || seen.has(key)) continue
      seen.add(key)
      chips.push({ id: col.id, text })
    }
    for (const label of previewValues) {
      const key = normalizeFieldKey(label)
      if (!key || seen.has(key)) continue
      const text = readPreviewChipText(row, label, label)
      if (!text) continue
      seen.add(key)
      chips.push({ id: label, text })
    }
    return chips
  }, [dynamicFields, previewValues, row])

  const aiInsight = useMemo(() => {
    const agentData =
      row?._agentResponse || row?._agentData?.[0] || row?._agentData || {}
    const qualify = row?.qualifyAgentResponse?.qualifier_result
    const raw = String(
      agentData?.ai_insight ||
        agentData?.aiInsight ||
        agentData?.ai_insect ||
        qualify?.['AI Insight'] ||
        qualify?.['Ai Insight'] ||
        qualify?.aiInsight ||
        '',
    ).trim()
    return raw.replace(/^[✨\u2728\u2729\u2730\s]+/, '').trim()
  }, [row])

  const isDocumentApproval = workflow?.name === 'Document Approval'
  const configuredTitle = resolveConfiguredTitle(
    row,
    workflow,
    isDocumentApproval,
    rawWorkflowData,
  )

  const requestNo =
    configuredTitle ||
    (isDocumentApproval
      ? row?.repositoryItem?.fileName || extractGenericRequestNumber(row)
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

  // Only the Hangfire job-driven path uses the spinner-only card.
  // Agent-stage rows without a job id keep the normal stage/title card.
  const activeJobId = String(
    row?.apAgentJobId ||
      row?.jobId ||
      processingProcesses?.find((p: any) => {
        const ids = [
          p.processId,
          p.id,
          p.instanceId,
          p.requestNo,
          p.apAgentJobId,
        ]
          .filter(Boolean)
          .map(String)
        return [
          row?.id,
          row?.processId,
          row?.workflowInstanceId,
          row?.instanceId,
          row?.requestNo,
          row?.reqNo,
          row?.apAgentJobId,
        ]
          .filter(Boolean)
          .map(String)
          .some((id) => ids.includes(id))
      })?.apAgentJobId ||
      '',
  ).trim()

  const jobStatusForActive =
    (activeJobId && jobStatuses?.[`job-${activeJobId}`]) ||
    (activeJobId && jobStatuses?.[activeJobId]) ||
    null

  const isJobProcessing =
    Boolean(activeJobId) &&
    !jobStatusForActive?.isCompleted &&
    (Boolean(row?.isProcessing) ||
      Boolean(jobMessage) ||
      Boolean(jobStatusForActive))

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
          className={cn(
            'size-4',
            isJobProcessing && 'animate-spin text-orange-9',
            !isJobProcessing && isTerminal && 'text-green-9',
            !isJobProcessing && !isTerminal && 'text-orange-9',
          )}
          name={
            isJobProcessing
              ? 'tabler:loader-2'
              : isTerminal
                ? 'tabler:check'
                : 'tabler:clock'
          }
        />
      </div>

      <div className='min-w-0 flex-1 overflow-hidden'>
        {/* Left Side: Request Number + Current Stage Pill next to Request Number */}
        <div className='group/inv flex min-w-0 flex-nowrap items-center gap-2.5'>
          <h3
            className='shrink-0 text-[15px] font-medium tracking-tight whitespace-nowrap text-[var(--text-primary)] transition-colors group-hover:text-[var(--primary-9)] group-hover:underline'
            style={{ fontWeight: 500 }}
          >
            {requestNo}
          </h3>
          <GenericStagePill
            currentLabel={currentLabel}
            isTerminal={isTerminal}
            previousLabel={previousLabel}
          />
        </div>

        {previewChips.length > 0 && (
          <div className='mt-1.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 overflow-hidden'>
            {previewChips.map((chip, idx) => (
              <span
                className='flex max-w-full min-w-0 items-center gap-1.5'
                key={chip.id}
              >
                {idx > 0 && <span className='shrink-0 text-gray-6'>·</span>}
                <div className='min-w-0 truncate text-11 font-medium text-gray-10'>
                  {chip.text}
                </div>
              </span>
            ))}
          </div>
        )}
        {isJobProcessing && jobMessage ? (
          <div className='mt-0.5 truncate text-12 font-semibold text-[var(--orange-9)]'>
            {jobMessage}
          </div>
        ) : null}
        {/* AI Insight stacked inside left column when playground/chat/sidebar is open */}
        {aiInsight && isSidebarOpen && (
          <div className='mt-0.5 flex min-w-0 items-center gap-1.5 text-[12px] font-medium text-[var(--primary-9)]'>
            <AiBrandIcon
              className='size-3.5 shrink-0'
              variant='outline-purple'
            />
            <HoverExpandableText
              className='text-[12px] font-medium text-[var(--primary-9)]'
              expandStyle='inline'
              maxLines={2}
              normalMaxWidthClass='max-w-[180px]'
              text={aiInsight}
            />
          </div>
        )}
      </div>

      {/* AI Insight Line - Centered in middle of row (visible ONLY when sidebar is closed) */}
      {aiInsight && !isSidebarOpen && (
        <div className='flex min-w-0 flex-1 items-center justify-center px-4'>
          <div className='flex min-w-0 items-center gap-1.5'>
            <AiBrandIcon
              className='size-3.5 shrink-0 text-[var(--primary-9)]'
              variant='outline-purple'
            />
            <HoverExpandableText
              className='text-[13px] font-medium text-[var(--gray-11)]'
              expandStyle='inline'
              maxLines={2}
              normalMaxWidthClass='max-w-[180px] sm:max-w-[240px] md:max-w-[320px] lg:max-w-[450px]'
              text={aiInsight}
            />
          </div>
        </div>
      )}

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
