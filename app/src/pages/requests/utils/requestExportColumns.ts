import type { V6GroupItem, V6UserListItem } from '@/api/v6/user'
import type { Column } from '@/components/base/data-table/types'
import { formatDatetime } from '@/utils/dayjs'
import { parseUtcDate } from '@/utils/utcDate'
import type { WorkflowOption } from '../types'
import { extractWorkflowGraph, getGenericStageInfo } from './workflow.utils'

interface RequestDetailLookups {
  groups: V6GroupItem[]
  /** Raw workflow definition from the request store (steps + blocks). */
  rawWorkflowData: RowLike | null
  users: V6UserListItem[]
  workflow: WorkflowOption | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RowLike = Record<string, any>

/** List columns the request-detail columns already cover. */
const SUPERSEDED_LIST_COLUMN_IDS = new Set(['lastActionAt', 'status'])

const normalizeLabel = (label: string) =>
  label.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')

const toDateTime = (value: unknown) => {
  if (!value) return ''
  const parsed = parseUtcDate(value as string)
  return parsed ? formatDatetime(parsed.toISOString(), 'datetime') : ''
}

const firstDate = (...values: unknown[]) => {
  for (const value of values) {
    const text = toDateTime(value)
    if (text) return text
  }
  return ''
}

const getReceivedOn = (row: RowLike) =>
  firstDate(
    row.createdAtUtc,
    row.transactionCreatedAt,
    row.raisedAt,
    row.createdAt,
  )

/**
 * When the request reached its current stage: the last action moved it
 * here. A request nobody has acted on yet arrived when it was raised.
 */
const getReceivedByUserOn = (row: RowLike) =>
  firstDate(
    row.lastActionDate,
    row.lastAction?.createdAt,
    row.updatedAt,
    row.createdAtUtc,
    row.transactionCreatedAt,
    row.raisedAt,
    row.createdAt,
  )

const userName = (user: V6UserListItem | undefined) =>
  user?.displayName ||
  [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
  user?.email ||
  ''

/**
 * Who the request is waiting on. Prefers the user the list API reports for
 * the current activity, then falls back to the assignees configured on the
 * current stage of the workflow (same sources the request screen uses for
 * its "Pending with" label).
 */
const getPendingWith = (
  row: RowLike,
  { groups, rawWorkflowData, users, workflow }: RequestDetailLookups,
) => {
  if (row.completedAtUtc) return ''

  const activityEmail = String(row.activityUserEmail || '').trim()
  if (activityEmail) {
    const match = users.find(
      (user) => user.email?.toLowerCase() === activityEmail.toLowerCase(),
    )
    return userName(match) || activityEmail
  }

  const activityId = row.activityId
  if (!activityId) return ''

  const step = (rawWorkflowData?.steps || []).find(
    (candidate: RowLike) => String(candidate.activityId) === String(activityId),
  )
  const graph = extractWorkflowGraph(rawWorkflowData)
  const { blocks } = graph.blocks.length
    ? graph
    : extractWorkflowGraph(workflow)
  const settings: RowLike =
    blocks.find((block: RowLike) => String(block.id) === String(activityId))
      ?.settings || {}

  const names: string[] = []

  const userIds: string[] = step?.assignedToUserId
    ? [String(step.assignedToUserId)]
    : (settings.users || []).map(String)
  userIds.forEach((id) => {
    const match = users.find((user) => String(user.id) === id)
    if (match) names.push(userName(match))
  })
  ;(settings.groups || []).map(String).forEach((id: string) => {
    const match = groups.find(
      (group) => String(group.groupId ?? group.id) === id,
    )
    const name = (match as RowLike | undefined)?.groupName ?? match?.name
    if (name) names.push(String(name))
  })

  if (settings.isManagerEnabled) names.push('Manager')
  if (settings.isToRequesterEnabled) names.push('Requester')
  if (settings.isCoordinatorEnabled) names.push('Coordinator')

  return names.join(', ')
}

/** Request-level columns that are not (all) on the list screen. */
export const buildRequestDetailColumns = (
  lookups: RequestDetailLookups,
): Column[] => [
  {
    exportValue: getReceivedOn,
    id: 'export_receivedOn',
    label: 'Request Received On',
  },
  {
    id: 'export_runStatus',
    label: 'Status',
    exportValue: (row: RowLike) =>
      row.completedAtUtc ? 'Completed' : 'Running',
  },
  {
    id: 'export_currentStage',
    label: 'Current Stage',
    exportValue: (row: RowLike) => {
      const jobId = String(row.apAgentJobId || row.jobId || '').trim()
      if (row.isProcessing && jobId) return `JOB-${jobId}`
      return getGenericStageInfo(lookups.workflow, row).currentLabel
    },
  },
  {
    exportValue: getReceivedByUserOn,
    id: 'export_receivedByUserOn',
    label: 'Received By User On',
  },
  {
    id: 'export_pendingWith',
    label: 'Pending With',
    exportValue: (row: RowLike) => getPendingWith(row, lookups),
  },
]

/**
 * Final export column order: request number, request details, the list
 * columns the user can see, then every remaining form field. Columns are
 * de-duplicated by label so e.g. "PO Number" appears once.
 */
export const assembleExportColumns = ({
  detailColumns,
  formColumns,
  listColumns,
  visibleColumnIds,
}: {
  detailColumns: Column[]
  formColumns: Column[]
  listColumns: Column[]
  visibleColumnIds: string[]
}): Column[] => {
  const visible = new Set(visibleColumnIds)
  const shown = listColumns.filter(
    (column) =>
      column.exportValue &&
      visible.has(column.id) &&
      !SUPERSEDED_LIST_COLUMN_IDS.has(column.id),
  )

  const requestNo = shown.filter((column) => column.id === 'requestNo')
  const otherShown = shown.filter((column) => column.id !== 'requestNo')

  const taken = new Set(
    [...requestNo, ...detailColumns, ...otherShown].map((column) =>
      normalizeLabel(column.exportLabel || column.label),
    ),
  )
  const formExtras = formColumns.filter((column) => {
    const key = normalizeLabel(column.label)
    if (!column.exportValue || !key || taken.has(key)) return false
    taken.add(key)
    return true
  })

  return [...requestNo, ...detailColumns, ...otherShown, ...formExtras]
}
