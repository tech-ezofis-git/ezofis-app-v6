import { useQuery } from '@tanstack/react-query'
import workflowsApiV6, { type V6FilterField } from '@/api/v6/workflows'
import type { InboxItem, TableGroup, WorkflowOption } from '../types'
import requestStore from '../stores/useRequestStore'
import { extractPONumber } from '../utils/inboxItemDisplay'
import {
  countInboxSplit,
  filterInboxItemsByTab,
  isDuplicatedInboxItem,
} from '../utils/inboxList.utils'
import { getActionsForActivity } from '../utils/workflow.utils'

/**
 * Grouping is applied entirely client-side against whatever page of items
 * the normal (ungrouped) list endpoints already returned — the backend's
 * grouped inbox-list endpoint is not used (see useInboxData's queryFn).
 */
const getGroupableFieldValue = (item: any, columnId: string): string => {
  if (columnId === 'poNumber') return extractPONumber(item)
  const raw = item?.[columnId]
  return raw == null || raw === '' ? 'N/A' : String(raw)
}

const applyClientGrouping = (
  items: InboxItem[],
  columnId: string,
): TableGroup[] => {
  const order: string[] = []
  const byGroup = new Map<string, InboxItem[]>()

  for (const item of items) {
    const key = getGroupableFieldValue(item, columnId) || 'N/A'
    if (!byGroup.has(key)) {
      byGroup.set(key, [])
      order.push(key)
    }
    byGroup.get(key)!.push(item)
  }

  return order.map((key) => {
    const groupItems = byGroup.get(key)!
    return {
      groupCount: groupItems.length,
      groupId: key,
      groupKey: key,
      groupValue: key,
      items: groupItems,
    }
  })
}

const toFiniteCount = (value: unknown): number | null => {
  const count = Number(value)
  return Number.isFinite(count) && count >= 0 ? count : null
}

const unwrapListPayload = (raw: unknown): Record<string, unknown> => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const record = raw as Record<string, unknown>
  if (Array.isArray(record.items) || record.totalCount != null) return record
  if (
    record.data &&
    typeof record.data === 'object' &&
    !Array.isArray(record.data)
  ) {
    return record.data as Record<string, unknown>
  }
  return record
}

const readListItems = (payload: Record<string, unknown>): any[] =>
  Array.isArray(payload.items) ? payload.items : []

const readListTotalCount = (
  payload: Record<string, unknown>,
  itemCount: number,
): number => {
  const meta =
    payload.meta && typeof payload.meta === 'object'
      ? (payload.meta as Record<string, unknown>)
      : null
  const fromApi =
    toFiniteCount(payload.totalCount) ??
    toFiniteCount(payload.TotalCount) ??
    toFiniteCount(payload.totalItems) ??
    toFiniteCount(payload.total) ??
    toFiniteCount(meta?.totalCount) ??
    toFiniteCount(meta?.totalItems)
  if (fromApi != null && (fromApi > 0 || itemCount === 0)) return fromApi
  return itemCount
}

export const transformProcess = (
  process: any,
  groupKey: string,
  originalIndex: number,
  activeTab: string,
  selectedWorkflow: WorkflowOption | null,
): InboxItem => {
  let fieldsSource: any = {}
  if (process.formData) {
    if (typeof process.formData === 'string') {
      try {
        const parsed = JSON.parse(process.formData)
        fieldsSource = parsed?.fields || parsed || {}
      } catch {
        fieldsSource = {}
      }
    } else if (typeof process.formData === 'object') {
      fieldsSource = process.formData?.fields || process.formData || {}
    }
  }

  // Parse any nested stringified JSON objects/arrays in fieldsSource
  Object.keys(fieldsSource).forEach((key) => {
    let val = fieldsSource[key]
    if (
      typeof val === 'string' &&
      ((val.trim().startsWith('[') && val.trim().endsWith(']')) ||
        (val.trim().startsWith('{') && val.trim().endsWith('}')))
    ) {
      try {
        val = JSON.parse(val)
        fieldsSource[key] = val
      } catch {
        // Keep original
      }
    }
  })

  let parsedAgentResponse = null
  if (process.agentResponse) {
    if (typeof process.agentResponse === 'string') {
      try {
        parsedAgentResponse = JSON.parse(process.agentResponse)
      } catch {
        parsedAgentResponse = null
      }
    } else if (typeof process.agentResponse === 'object') {
      parsedAgentResponse = process.agentResponse
    }
  }

  const hasAgentResponse = !!(
    parsedAgentResponse && Object.keys(parsedAgentResponse).length > 0
  )

  const isStatusMatched =
    String(process.status || '').toUpperCase() === 'MATCHED'
  const isDecisionMatched =
    String(process.decision || '').toUpperCase() === 'MATCHED'
  const isReviewMatched =
    String(process.review || '').toUpperCase() === 'MATCHED'

  const status = isStatusMatched && !hasAgentResponse ? '' : process.status
  const decision =
    isDecisionMatched && !hasAgentResponse ? '' : process.decision
  const review = isReviewMatched && !hasAgentResponse ? '' : process.review

  const processCopy = {
    ...process,
    decision,
    formData: {
      ...(typeof process.formData === 'object' ? process.formData : {}),
      fields: fieldsSource,
    },
    review,
    status,
  }

  const listTab = process._listTab || activeTab
  const canMove = listTab === 'Inbox' || listTab === 'Exceptions'

  const dynamicFields = fieldsSource
  let actions: any[] = []
  if (listTab === 'Inbox' || listTab === 'Exceptions' || listTab === 'Sent') {
    actions = getActionsForActivity(
      process.activityId,
      selectedWorkflow?.flowJson,
    )
  }
  const processId = process.workflowInstanceId || process.processId
  const referenceNumber =
    process.referenceNumber == null
      ? ''
      : String(process.referenceNumber).trim()
  const formEntryId = process.formEntryId
  const requestNo =
    referenceNumber ||
    (formEntryId !== undefined && formEntryId !== null && formEntryId !== ''
      ? `REQ-${formEntryId}`
      : '') ||
    (processId && typeof processId === 'string'
      ? `REQ-${processId.substring(0, 8).toUpperCase()}`
      : '') ||
    process.requestNo ||
    ''

  const hasAgentDecision = !!(
    processCopy.review ||
    parsedAgentResponse?.decision ||
    process.completedAtUtc
  )
  const isAgentProcessing =
    process.stageType === 'AP_AGENT' && !hasAgentDecision

  if (parsedAgentResponse) {
    parsedAgentResponse = {
      ...parsedAgentResponse,
      id:
        process.activityId ||
        parsedAgentResponse.id ||
        Math.random().toString(),
      reqNo: requestNo,
      stage: process.stageType === 'AP_AGENT' ? process.stage : 'AI Agent',
    }
  }

  const isDuplicateInvoice = isDuplicatedInboxItem({
    _agentData: parsedAgentResponse ? [parsedAgentResponse] : [],
    _agentResponse: parsedAgentResponse,
    decision: processCopy.decision,
    formData: processCopy.formData,
    review: processCopy.review,
    status: processCopy.status,
  })

  return {
    ...processCopy,
    ...dynamicFields,
    _actions: actions,
    _agentData: parsedAgentResponse ? [parsedAgentResponse] : [],
    _agentResponse: parsedAgentResponse,
    _canMove: canMove,
    _groupKey: groupKey || listTab,
    _listTab: listTab,
    _originalIndex: originalIndex,
    documentNumber: requestNo,
    id: processId || process.id,
    isDuplicateInvoice,
    processId: processId,
    raisedAt:
      process.createdAtUtc || process.transactionCreatedAt || process.raisedAt,
    raisedBy: process.transactionCreatedByEmail || process.raisedBy,
    requestNo: requestNo,
    ...(isAgentProcessing
      ? (() => {
          const rowId = processId || process.id
          const storeState = requestStore.getState()
          const jobStatuses = storeState.jobStatuses || {}
          const jobMappings = storeState.jobMappings || {}

          let matchedJobStatus = jobStatuses[String(rowId)]
          if (!matchedJobStatus && process.apAgentJobId) {
            const mappedJobId = jobMappings[String(process.apAgentJobId)]
            if (mappedJobId) {
              matchedJobStatus =
                jobStatuses[String(mappedJobId)] ||
                jobStatuses[`job-${mappedJobId}`]
            }
            if (!matchedJobStatus) {
              matchedJobStatus = jobStatuses[`job-${process.apAgentJobId}`]
            }
          }

          const isCompleted = matchedJobStatus?.isCompleted || false
          const stage = matchedJobStatus?.stage || process.stage || 'Start'
          const statusVal = isCompleted
            ? matchedJobStatus?.decision || (hasAgentResponse ? 'Matched' : '')
            : 'Progressing'

          return {
            isProcessing: !isCompleted,
            stage,
            status: statusVal,
          }
        })()
      : {}),
  }
}

const listItemKey = (item: any): string =>
  String(item?.workflowInstanceId || item?.processId || item?.id || '')

const mergeKanbanLists = (
  inboxItems: any[],
  sentItems: any[],
  completedItems: any[],
) => {
  const seen = new Set<string>()
  const merged: any[] = []
  const add = (items: any[], listTab: string) => {
    for (const item of items) {
      const key = listItemKey(item)
      if (key && seen.has(key)) continue
      if (key) seen.add(key)
      merged.push({ ...item, _listTab: listTab })
    }
  }
  add(inboxItems, 'Inbox')
  add(sentItems, 'Sent')
  add(completedItems, 'Closed')
  return merged
}

const fetchInboxDataFn = async (
  activeTab: string,
  workflowId: string,
  page: number,
  pageSize: number,
) => {
  switch (activeTab) {
    case 'Kanban': {
      const [inboxRes, sentRes, completedRes] = await Promise.all([
        workflowsApiV6.getInboxList(workflowId, page, pageSize),
        workflowsApiV6.getSentList(workflowId, page, pageSize),
        workflowsApiV6.getCompletedList(workflowId, page, pageSize),
      ])

      if (inboxRes.error && sentRes.error && completedRes.error) {
        throw new Error(inboxRes.error || sentRes.error || completedRes.error)
      }

      const inboxPayload = unwrapListPayload(
        inboxRes.error ? {} : inboxRes.data,
      )
      const sentPayload = unwrapListPayload(sentRes.error ? {} : sentRes.data)
      const completedPayload = unwrapListPayload(
        completedRes.error ? {} : completedRes.data,
      )
      const inboxItems = inboxRes.error ? [] : readListItems(inboxPayload)
      const sentItems = sentRes.error ? [] : readListItems(sentPayload)
      const completedItems = completedRes.error
        ? []
        : readListItems(completedPayload)
      const merged = mergeKanbanLists(inboxItems, sentItems, completedItems)
      const totalItems =
        (inboxRes.error
          ? 0
          : readListTotalCount(inboxPayload, inboxItems.length)) +
        (sentRes.error
          ? 0
          : readListTotalCount(sentPayload, sentItems.length)) +
        (completedRes.error
          ? 0
          : readListTotalCount(completedPayload, completedItems.length))

      return {
        data: [
          {
            key: 'root',
            value: merged,
          },
        ],
        meta: {
          totalItems: totalItems || merged.length,
        },
      }
    }
    case 'Sent': {
      const sentRes = await workflowsApiV6.getSentList(
        workflowId,
        page,
        pageSize,
      )
      if (sentRes.error) {
        throw new Error(sentRes.error)
      }
      const payload = unwrapListPayload(sentRes.data)
      const items = readListItems(payload)
      return {
        data: [
          {
            key: 'root',
            value: items,
          },
        ],
        meta: {
          totalItems: readListTotalCount(payload, items.length),
        },
      }
    }
    case 'Closed': {
      const completedRes = await workflowsApiV6.getCompletedList(
        workflowId,
        page,
        pageSize,
      )
      if (completedRes.error) {
        throw new Error(completedRes.error)
      }
      const payload = unwrapListPayload(completedRes.data)
      const items = readListItems(payload)
      return {
        data: [
          {
            key: 'root',
            value: items,
          },
        ],
        meta: {
          totalItems: readListTotalCount(payload, items.length),
        },
      }
    }
    case 'Processed': {
      const [sentRes, completedRes] = await Promise.all([
        workflowsApiV6.getSentList(workflowId, page, pageSize),
        workflowsApiV6.getCompletedList(workflowId, page, pageSize),
      ])

      if (sentRes.error) throw new Error(sentRes.error)
      if (completedRes.error) throw new Error(completedRes.error)

      const sentPayload = unwrapListPayload(sentRes.data)
      const completedPayload = unwrapListPayload(completedRes.data)
      const sentItems = readListItems(sentPayload)
      const completedItems = readListItems(completedPayload)
      const combinedData = [...sentItems, ...completedItems]
      const totalItems =
        readListTotalCount(sentPayload, sentItems.length) +
        readListTotalCount(completedPayload, completedItems.length)

      return {
        data: [
          {
            key: 'root',
            value: combinedData,
          },
        ],
        meta: {
          totalItems,
        },
      }
    }
    case 'Exceptions':
    case 'Inbox': {
      const v6Res = await workflowsApiV6.getInboxList(
        workflowId,
        page,
        pageSize,
      )
      if (v6Res.error) {
        throw new Error(v6Res.error)
      }
      const payload = unwrapListPayload(v6Res.data)
      const items = readListItems(payload)
      return {
        data: [
          {
            key: 'root',
            value: items,
          },
        ],
        meta: {
          totalItems: readListTotalCount(payload, items.length),
        },
      }
    }
    default:
      // Custom tabs beyond the first 3 (Inbox/Sent/Closed or
      // Inbox/Exceptions/Processed) have no data source yet.
      return {
        data: [{ key: 'root', value: [] }],
        meta: { totalItems: 0 },
      }
  }
}

interface IndexTracker {
  value: number
}

const handleGroupedInner = (
  inner: any,
  idx: number,
  activeTab: string,
  selectedWorkflow: WorkflowOption | null,
  tracker: IndexTracker,
  groupedData: TableGroup[],
) => {
  const validItems = []
  for (const p of inner.value) {
    if (p && (p.processId || p.id || p.workflowInstanceId)) {
      validItems.push(p)
    }
  }

  const groupItems = validItems.map((p) => {
    const item = transformProcess(
      p,
      inner.key,
      tracker.value,
      activeTab,
      selectedWorkflow,
    )
    tracker.value++
    return item
  })

  if (groupItems.length > 0) {
    groupedData.push({
      groupCount: groupItems.length,
      groupId: inner.key || `group-${idx}`,
      groupKey: inner.key,
      groupValue: inner.key,
      items: groupItems,
    })
  }
}

const handleFlatInner = (
  inner: any,
  activeTab: string,
  selectedWorkflow: WorkflowOption | null,
  tracker: IndexTracker,
  groupedData: TableGroup[],
) => {
  const transformed = transformProcess(
    inner,
    activeTab,
    tracker.value,
    activeTab,
    selectedWorkflow,
  )
  tracker.value++

  const rootGroup = groupedData.find((g) => g.groupId === 'root')
  if (rootGroup) {
    rootGroup.items.push(transformed)
    rootGroup.groupCount = rootGroup.items.length
  } else {
    groupedData.push({
      groupCount: 1,
      groupId: 'root',
      items: [transformed],
    })
  }
}

export const useInboxData = (
  selectedWorkflow: WorkflowOption | null,
  page: number,
  pageSize: number,
  groupBy: string[],
  activeTab: string = 'Inbox',
  filterClauses: any[] = [],
  // Unused: grouping is resolved client-side without the field schema.
  _filterFields: V6FilterField[] = [],
) => {
  return useQuery({
    enabled: !!selectedWorkflow?.id && selectedWorkflow.id !== 'procurement',
    gcTime: 5 * 60 * 1000,
    // `groupBy`/`filterFields` deliberately excluded: grouping is applied
    // client-side in `select` below and never triggers a refetch.
    queryKey: [
      'inbox',
      selectedWorkflow?.id,
      page,
      pageSize,
      activeTab,
      filterClauses,
    ],
    retry: 1,
    staleTime: 10000,

    queryFn: async () => {
      const workflowId = selectedWorkflow?.id
      if (!workflowId || workflowId === 'procurement') {
        return { data: [], meta: { totalItems: 0 } }
      }

      try {
        // Grouping is applied client-side in `select` below (see
        // applyClientGrouping) — it is intentionally never sent to the
        // backend, so `groupBy` never changes which endpoint/payload we use.
        if (filterClauses && filterClauses.length > 0) {
          const searchRes = await workflowsApiV6.searchTickets(
            String(workflowId),
            {
              currentPage: page,
              filterBy: filterClauses,
              groupBy: '',
              itemsPerPage: pageSize,
              sortBy: { criteria: 'raisedAt', order: 'DESC' },
            },
          )
          if (searchRes.error) throw new Error(searchRes.error)
          return searchRes.data || { data: [], meta: { totalItems: 0 } }
        }

        return await fetchInboxDataFn(
          activeTab,
          String(workflowId),
          page,
          pageSize,
        )
      } catch (error) {
        console.error(error)
        return { data: [], meta: { totalItems: 0 } }
      }
    },

    select: (payload: any) => {
      const apiData = payload?.data?.data || payload?.data || []
      const totalItems =
        payload?.meta?.totalItems || payload?.data?.meta?.totalItems || 0

      const groupedData: TableGroup[] = []
      const tracker = { value: 0 }

      if (Array.isArray(apiData)) {
        for (const outer of apiData) {
          if (!outer || !Array.isArray(outer.value)) continue

          for (let idx = 0; idx < outer.value.length; idx++) {
            const inner = outer.value[idx]
            if (!inner) continue

            if (Array.isArray(inner.value)) {
              handleGroupedInner(
                inner,
                idx,
                activeTab,
                selectedWorkflow,
                tracker,
                groupedData,
              )
            } else if (
              inner.processId ||
              inner.id ||
              inner.workflowInstanceId
            ) {
              handleFlatInner(
                inner,
                activeTab,
                selectedWorkflow,
                tracker,
                groupedData,
              )
            }
          }
        }
      }

      const allItems = groupedData.flatMap((group) => group.items)
      const { exceptionsCount, inboxTabCount } = countInboxSplit(allItems)

      const filteredGroupedData =
        activeTab === 'Inbox' || activeTab === 'Exceptions'
          ? groupedData
              .map((group) => {
                const items = filterInboxItemsByTab(group.items, activeTab)
                return {
                  ...group,
                  groupCount: items.length,
                  items,
                }
              })
              .filter((group) => group.items.length > 0)
          : groupedData

      let tabTotalItems = totalItems > 0 ? totalItems : inboxTabCount
      if (activeTab === 'Exceptions') tabTotalItems = exceptionsCount

      const finalGroupedData =
        groupBy && groupBy.length > 0
          ? applyClientGrouping(
              filteredGroupedData.flatMap((group) => group.items),
              groupBy[0],
            )
          : filteredGroupedData

      return {
        data: finalGroupedData,
        exceptionsCount,
        inboxTabCount,
        totalItems: tabTotalItems,
      }
    },
  })
}
