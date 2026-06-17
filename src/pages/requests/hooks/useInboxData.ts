import { useQuery } from '@tanstack/react-query'
import workflowsApiV6 from '@/api/v6/workflows'
import type { InboxItem, TableGroup, WorkflowOption } from '../types'
import {
  countInboxSplit,
  filterInboxItemsByTab,
  isDuplicatedInboxItem,
} from '../utils/inboxList.utils'
import { getActionsForActivity } from '../utils/workflow.utils'

const transformProcess = (
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

  const processCopy = {
    ...process,
    formData: {
      ...(typeof process.formData === 'object' ? process.formData : {}),
      fields: fieldsSource,
    },
  }

  const dynamicFields = fieldsSource
  let actions: any[] = []
  if (activeTab === 'Inbox' || activeTab === 'Exceptions') {
    actions = getActionsForActivity(
      process.activityId,
      selectedWorkflow?.flowJson,
    )
  }
  const processId = process.workflowInstanceId || process.processId
  const requestNo =
    process.referenceNumber ||
    (processId && typeof processId === 'string'
      ? `REQ-${processId.substring(0, 8).toUpperCase()}`
      : '') ||
    process.requestNo ||
    ''
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

  const hasAgentDecision = !!(
    process.review ||
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
    decision: process.decision,
    formData: processCopy.formData,
    review: process.review,
    status: process.status,
  })

  return {
    ...processCopy,
    ...dynamicFields,
    _actions: actions,
    _agentData: parsedAgentResponse ? [parsedAgentResponse] : [],
    _agentResponse: parsedAgentResponse,
    _groupKey: groupKey || activeTab,
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
      ? {
          isProcessing: true,
          stage: process.stage || 'Start',
          status: 'Progressing',
        }
      : {}),
  }
}

const fetchInboxDataFn = async (
  activeTab: string,
  workflowId: string,
  page: number,
  pageSize: number,
) => {
  switch (activeTab) {
    case 'Sent': {
      const sentRes = await workflowsApiV6.getSentList(
        workflowId,
        page,
        pageSize,
      )
      if (sentRes.error) {
        throw new Error(sentRes.error)
      }
      const responseData = sentRes.data || {}
      return {
        data: [
          {
            key: 'root',
            value: responseData.items || [],
          },
        ],
        meta: {
          totalItems:
            responseData.totalCount || responseData.items?.length || 0,
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
      const responseData = completedRes.data || {}
      return {
        data: [
          {
            key: 'root',
            value: responseData.items || [],
          },
        ],
        meta: {
          totalItems:
            responseData.totalCount || responseData.items?.length || 0,
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

      const sentItems = sentRes.data?.items || []
      const completedItems = completedRes.data?.items || []
      const combinedData = [...sentItems, ...completedItems]
      const totalItems =
        (sentRes.data?.totalCount || sentItems.length) +
        (completedRes.data?.totalCount || completedItems.length)

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
    case 'Inbox':
    default: {
      const v6Res = await workflowsApiV6.getInboxList(
        workflowId,
        page,
        pageSize,
      )
      if (v6Res.error) {
        throw new Error(v6Res.error)
      }
      const responseData = v6Res.data || {}
      return {
        data: [
          {
            key: 'root',
            value: responseData.items || [],
          },
        ],
        meta: {
          totalItems:
            responseData.totalCount || responseData.items?.length || 0,
        },
      }
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
) => {
  return useQuery({
    enabled: !!selectedWorkflow?.id,
    queryKey: [
      'inbox',
      selectedWorkflow?.id,
      page,
      pageSize,
      groupBy,
      activeTab,
    ],

    queryFn: async () => {
      const config: any = {
        currentPage: page,
        filterBy: [],
        itemsPerPage: pageSize,
        sortBy: { criteria: '', order: 'DESC' },
      }

      // Only add groupBy for Inbox to avoid API errors
      if (activeTab === 'Inbox') {
        config.groupBy =
          groupBy.length > 0 ? groupBy : ['RXwLGHILLrreMmRqlk9mj']
      }

      const workflowId = selectedWorkflow?.id
      if (!workflowId) {
        return { data: [], meta: { totalItems: 0 } }
      }

      try {
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

      return {
        data: filteredGroupedData,
        exceptionsCount,
        inboxTabCount,
        totalItems,
      }
    },
  })
}
