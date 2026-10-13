import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  InboxItem,
  IRequestMeta,
  WorkflowOption,
} from '@/pages/requests/types'
import type { Option } from '@/types/option'
import formApi from '@/api/form/form'
import workflowsApiV6, {
  isExcludedFilterFieldDataType,
  mapPublishedWorkflowListToOptions,
  type V6FilterField,
} from '@/api/v6/workflows'
import { useInboxData } from '@/pages/requests/hooks/useInboxData'
import requestStore from '@/pages/requests/stores/useRequestStore'
import {
  countQuickFilterMatches,
  filterRowsByQuickFilters,
  flattenInboxGroups,
  mapInboxItemToRequestCard,
} from '@/pages/requests/utils/inboxItemDisplay'
import { buildV6FilterClauses } from '@/pages/requests/utils/requestFilterMapper'
import {
  extractWorkflowGeneral,
  isAccountsPayableWorkflow,
} from '@/pages/requests/utils/workflow.utils'

export type MobileRequestTab = { count: number; label: string; value: string }

const PAGE_SIZE = 20

type RequestTabConfig = {
  id?: string
  label?: string
  nodeIds?: unknown[]
}

type WorkflowDetail = Record<string, unknown>

type WorkflowLoadStatus = 'loading' | 'ready' | 'empty'

const asRequestTabs = (value: unknown): RequestTabConfig[] =>
  Array.isArray(value) ? (value as RequestTabConfig[]) : []

const rowKey = (item: {
  id?: unknown
  processId?: unknown
  workflowInstanceId?: unknown
}) => String(item.processId || item.workflowInstanceId || item.id || '')

export function useMobileRequestsInbox() {
  const {
    activeQuickFilters,
    clearQuickFilters,
    openRequest,
    toggleQuickFilter,
    setRawWorkflowData,
    setRequestListTab,
  } = requestStore()

  const [activeTab, setActiveTab] = useState('Inbox')
  const [workflowDetail, setWorkflowDetail] = useState<WorkflowDetail | null>(
    null,
  )
  const [stageTabCounts, setStageTabCounts] = useState<Record<string, number>>(
    {},
  )
  const [page, setPage] = useState(1)
  const [accumulatedRows, setAccumulatedRows] = useState<InboxItem[]>([])
  const [workflowLoadStatus, setWorkflowLoadStatus] =
    useState<WorkflowLoadStatus>('loading')
  const [allWorkflows, setAllWorkflows] = useState<Option[]>([])
  const [workflow, setWorkflow] = useState<Option | null>(null)
  const [metaData, setMetaData] = useState<IRequestMeta>()
  const [selectedWorkflow, setSelectedWorkflow] =
    useState<WorkflowOption | null>(null)
  const [filterFields, setFilterFields] = useState<V6FilterField[]>([])
  const [fieldFilters, setFieldFilters] = useState<Record<string, string[]>>({})

  const lastMergedPageRef = useRef(0)
  const fieldFilterKey = JSON.stringify(fieldFilters)
  const listResetKey = `${selectedWorkflow?.id ?? ''}:${activeTab}:${fieldFilterKey}`

  const isAccountsPayable = isAccountsPayableWorkflow(workflowDetail)

  const requestTabDefs = useMemo(() => {
    const bucketKeys = isAccountsPayable
      ? ['Inbox', 'Exceptions', 'Processed']
      : ['Inbox', 'Sent', 'Closed']
    const defaultLabels = isAccountsPayable
      ? ['Invoices', 'Exceptions', 'Processed']
      : ['Inbox', 'Sent', 'Completed']
    const general = extractWorkflowGeneral(workflowDetail)
    const configured = asRequestTabs(general?.requestTabs)

    if (!configured.length) {
      return bucketKeys.map((value, index) => ({
        label: defaultLabels[index],
        value,
      }))
    }

    return configured.map((tabConfig, index) => ({
      label:
        String(tabConfig?.label || '').trim() ||
        defaultLabels[index] ||
        `View ${index + 1}`,
      value:
        index < bucketKeys.length
          ? bucketKeys[index]
          : `custom-${tabConfig?.id ?? index}`,
    }))
  }, [isAccountsPayable, workflowDetail])

  const tabStageConfig = useMemo(() => {
    const general = extractWorkflowGeneral(workflowDetail)
    const configuredTabs = asRequestTabs(general?.requestTabs)
    const isStageBased =
      general?.isStageBased === 1 ||
      general?.isStageBased === true ||
      configuredTabs.some(
        (tab) => Array.isArray(tab?.nodeIds) && tab.nodeIds.length > 0,
      )

    if (!isStageBased) return { isStageBased: false, nodeIds: [] as string[] }

    let matchedTab = configuredTabs.find(
      (tab) =>
        tab?.id === activeTab ||
        String(tab?.label || '').toLowerCase() === activeTab.toLowerCase(),
    )

    if (!matchedTab && configuredTabs.length > 0) {
      const index =
        activeTab === 'Inbox' || activeTab === 'Invoices'
          ? 0
          : activeTab === 'Sent' || activeTab === 'Exceptions'
            ? 1
            : activeTab === 'Closed' ||
                activeTab === 'Completed' ||
                activeTab === 'Processed'
              ? 2
              : requestTabDefs.findIndex((tab) => tab.value === activeTab)
      if (index >= 0 && configuredTabs[index])
        matchedTab = configuredTabs[index]
    }

    const nodeIds = Array.isArray(matchedTab?.nodeIds)
      ? matchedTab.nodeIds.map(String).filter(Boolean)
      : []

    return { isStageBased: true, nodeIds }
  }, [activeTab, requestTabDefs, workflowDetail])

  const loadStageCounts = useCallback(
    async (workflowId: string, detail: WorkflowDetail) => {
      const general = extractWorkflowGeneral(detail)
      const configuredTabs = asRequestTabs(general?.requestTabs)
      const stageBased =
        general?.isStageBased === 1 ||
        general?.isStageBased === true ||
        configuredTabs.some(
          (tab) => Array.isArray(tab?.nodeIds) && tab.nodeIds.length > 0,
        )

      if (!stageBased || configuredTabs.length === 0) {
        setStageTabCounts({})
        return
      }

      const activityIds: string[] = []
      configuredTabs.forEach((tab) => {
        if (!Array.isArray(tab?.nodeIds)) return
        tab.nodeIds.forEach((id) => {
          const value = String(id).trim()
          if (value && !activityIds.includes(value)) activityIds.push(value)
        })
      })

      if (!activityIds.length) {
        setStageTabCounts({})
        return
      }

      try {
        const countRes = await workflowsApiV6.getWorkflowsByActivityCounts(
          workflowId,
          activityIds,
        )
        const itemsMap: Record<string, number> = {}
        ;(countRes.data?.items || []).forEach((item) => {
          itemsMap[item.activityId] = item.count || 0
        })
        const bucketKeys = isAccountsPayableWorkflow(detail)
          ? ['Inbox', 'Exceptions', 'Processed']
          : ['Inbox', 'Sent', 'Closed']
        const next: Record<string, number> = {}
        configuredTabs.forEach((tabConfig, index) => {
          const nodeIds = Array.isArray(tabConfig?.nodeIds)
            ? tabConfig.nodeIds.map(String).filter(Boolean)
            : []
          const sum = nodeIds.reduce(
            (total: number, id: string) => total + (itemsMap[id] || 0),
            0,
          )
          if (tabConfig?.id) next[tabConfig.id] = sum
          if (tabConfig?.label) next[String(tabConfig.label)] = sum
          if (index < bucketKeys.length) next[bucketKeys[index]] = sum
        })
        setStageTabCounts(next)
      } catch {
        setStageTabCounts({})
      }
    },
    [],
  )

  const loadSelectedWorkflow = useCallback(
    async (workflowId: string, workflowName?: string) => {
      setWorkflowLoadStatus('loading')
      try {
        const [workflowRes, countRes] = await Promise.all([
          workflowsApiV6.getWorkflowById(workflowId),
          workflowsApiV6.getInstanceCount(workflowId),
        ])

        if (workflowRes.error || !workflowRes.data) {
          throw new Error(workflowRes.error || 'Failed to load workflow')
        }

        const wf = workflowRes.data

        if (countRes?.data) {
          setMetaData({
            completedCount: String(countRes.data.completedCount ?? 0),
            inboxCount: String(countRes.data.inboxCount ?? 0),
            sentCount: String(countRes.data.sentCount ?? 0),
          })
        } else {
          setMetaData({
            completedCount: '0',
            inboxCount: '0',
            sentCount: '0',
          })
        }

        const wFormId =
          wf.formId ??
          wf.wFormId ??
          wf.settings?.general?.initiateUsing?.formId ??
          ''

        let formJson = wf.formJson
        if (wFormId) {
          const formRes = await formApi.getFormDataById(String(wFormId))
          if (formRes?.data) {
            formJson = formRes.data.formJson ?? formRes.data
          }
        }

        const detail = { ...wf, formJson, id: workflowId }
        setWorkflowDetail(detail)
        setRawWorkflowData(detail)
        void loadStageCounts(workflowId, detail)

        let flowJson = ''
        if (typeof wf.flowJson === 'string') {
          flowJson = wf.flowJson
        } else if (wf.flowJson) {
          flowJson = JSON.stringify(wf.flowJson)
        }

        setSelectedWorkflow({
          flowJson,
          formJson: formJson ?? '',
          id: workflowId,
          name:
            wf.name ?? wf.settings?.general?.name ?? workflowName ?? 'Workflow',
          wFormId: wFormId || '',
        })
        setWorkflowLoadStatus('ready')
      } catch {
        setSelectedWorkflow(null)
        setWorkflowLoadStatus('empty')
      }
    },
    [loadStageCounts, setRawWorkflowData],
  )

  const loadWorkflowList = useCallback(async () => {
    setWorkflowLoadStatus('loading')
    try {
      const { data, error } = await workflowsApiV6.getWorkflows()
      if (error) throw new Error(error)

      const options = mapPublishedWorkflowListToOptions(data)
      if (options.length > 0) {
        setAllWorkflows(options)
        setWorkflow(options[0])
      } else {
        setAllWorkflows([])
        setWorkflow(null)
        setSelectedWorkflow(null)
        setWorkflowLoadStatus('empty')
      }
    } catch {
      setAllWorkflows([])
      setWorkflow(null)
      setSelectedWorkflow(null)
      setWorkflowLoadStatus('empty')
    }
  }, [])

  useEffect(() => {
    void loadWorkflowList()
  }, [loadWorkflowList])

  useEffect(() => {
    const workflowId = selectedWorkflow?.id
    if (!workflowId) {
      setFilterFields([])
      return
    }
    let cancelled = false
    void workflowsApiV6.getFilterFields(String(workflowId)).then((res) => {
      if (cancelled) return
      setFilterFields(res.data?.fields || [])
    })
    return () => {
      cancelled = true
    }
  }, [selectedWorkflow?.id])

  useEffect(() => {
    if (!workflow?.id) return
    const currentId = selectedWorkflow?.id
    const isNewWorkflow =
      !currentId || String(workflow.id) !== String(currentId)
    if (!isNewWorkflow) return
    clearQuickFilters()
    setFieldFilters({})
    setPage(1)
    setAccumulatedRows([])
    lastMergedPageRef.current = 0
    void loadSelectedWorkflow(String(workflow.id), workflow.name)
    // Only re-run when the chosen workflow id changes (same as web RequestsPage).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflow?.id, loadSelectedWorkflow])

  useEffect(() => {
    if (!requestTabDefs.length) return
    if (requestTabDefs.some((tab) => tab.value === activeTab)) return
    setActiveTab(requestTabDefs[0].value)
  }, [activeTab, requestTabDefs])

  useEffect(() => {
    const label =
      requestTabDefs.find((tab) => tab.value === activeTab)?.label || activeTab
    setRequestListTab(label)
    clearQuickFilters()
    setPage(1)
    setAccumulatedRows([])
    lastMergedPageRef.current = 0
  }, [activeTab, clearQuickFilters, requestTabDefs, setRequestListTab])

  const workflowFilterFields = useMemo(
    () =>
      filterFields
        .filter((field) => !isExcludedFilterFieldDataType(field.dataType))
        .map((field) => ({
          dataType: field.dataType,
          id: field.sqlColumnName || field.name,
          label: field.name || field.sqlColumnName,
        }))
        .filter((field) => field.id),
    [filterFields],
  )

  const filterClauses = useMemo(
    () =>
      buildV6FilterClauses(
        fieldFilters,
        filterFields,
        isAccountsPayable ? activeQuickFilters : [],
      ),
    [activeQuickFilters, fieldFilters, filterFields, isAccountsPayable],
  )

  const {
    data: inboxResult,
    dataUpdatedAt,
    isFetching,
    isPending,
    refetch,
  } = useInboxData(
    selectedWorkflow,
    page,
    PAGE_SIZE,
    [],
    activeTab,
    filterClauses,
    filterFields,
    tabStageConfig,
  )

  // Merge pages for infinite scroll
  useEffect(() => {
    if (!inboxResult) return
    const rows = flattenInboxGroups(inboxResult.data || [])

    if (page === 1) {
      setAccumulatedRows(rows)
      lastMergedPageRef.current = 1
      return
    }

    if (lastMergedPageRef.current >= page) return

    setAccumulatedRows((prev) => {
      const seen = new Set(prev.map(rowKey))
      const next = rows.filter((row) => {
        const key = rowKey(row)
        if (!key || seen.has(key)) return false
        seen.add(key)
        return true
      })
      return next.length ? [...prev, ...next] : prev
    })
    lastMergedPageRef.current = page
  }, [dataUpdatedAt, inboxResult, listResetKey, page])

  const filteredRows = useMemo(() => {
    if (activeTab !== 'Inbox') return accumulatedRows
    return filterRowsByQuickFilters(accumulatedRows, activeQuickFilters)
  }, [accumulatedRows, activeQuickFilters, activeTab])

  const requestTabs = useMemo<MobileRequestTab[]>(() => {
    const countFor = (tab: { label: string; value: string }) => {
      if (tab.value in stageTabCounts) return stageTabCounts[tab.value]
      if (tab.label in stageTabCounts) return stageTabCounts[tab.label]
      switch (tab.value) {
        case 'Closed':
          return Number(metaData?.completedCount ?? 0)
        case 'Exceptions':
          return Number(inboxResult?.exceptionsCount ?? 0)
        case 'Inbox':
          return Number(
            inboxResult?.inboxTabCount ??
              metaData?.inboxCount ??
              accumulatedRows.length,
          )
        case 'Processed':
          return (
            Number(metaData?.completedCount ?? 0) +
            Number(metaData?.sentCount ?? 0)
          )
        case 'Sent':
          return Number(metaData?.sentCount ?? 0)
        default:
          return 0
      }
    }
    return requestTabDefs.map((tab) => ({ ...tab, count: countFor(tab) }))
  }, [
    accumulatedRows.length,
    inboxResult?.exceptionsCount,
    inboxResult?.inboxTabCount,
    metaData?.completedCount,
    metaData?.inboxCount,
    metaData?.sentCount,
    requestTabDefs,
    stageTabCounts,
  ])

  const cards = useMemo(
    () => filteredRows.map(mapInboxItemToRequestCard),
    [filteredRows],
  )

  const filterCounts = useMemo(
    () => countQuickFilterMatches(accumulatedRows),
    [accumulatedRows],
  )

  const totalItems = Number(inboxResult?.totalItems ?? accumulatedRows.length)

  const hasMore = accumulatedRows.length < totalItems && totalItems > 0

  const tabCounts = useMemo(
    () => ({
      exceptions: Number(inboxResult?.exceptionsCount ?? 0),
      invoices: Number(
        inboxResult?.inboxTabCount ??
          metaData?.inboxCount ??
          accumulatedRows.length,
      ),
      processed:
        Number(metaData?.completedCount ?? 0) +
        Number(metaData?.sentCount ?? 0),
    }),
    [
      accumulatedRows.length,
      inboxResult?.exceptionsCount,
      inboxResult?.inboxTabCount,
      metaData?.completedCount,
      metaData?.inboxCount,
      metaData?.sentCount,
    ],
  )

  const handleOpenRequest = useCallback(
    (cardId: string) => {
      const row = filteredRows.find(
        (item) => rowKey(item) === String(cardId),
      ) as InboxItem | undefined
      if (!row || !selectedWorkflow?.id) return
      openRequest(
        row,
        selectedWorkflow,
        activeTab === 'Processed' ? 'Processed' : 'Overview',
      )
    },
    [activeTab, filteredRows, openRequest, selectedWorkflow],
  )

  const handleQuickFilter = useCallback(
    (id: string) => {
      if (activeTab !== 'Inbox') return
      toggleQuickFilter(id)
    },
    [activeTab, toggleQuickFilter],
  )

  const applyFieldFilters = useCallback((next: Record<string, string[]>) => {
    setPage(1)
    setAccumulatedRows([])
    lastMergedPageRef.current = 0
    setFieldFilters(next)
  }, [])

  const replaceQuickFilters = useCallback(
    (ids: string[]) => {
      clearQuickFilters()
      ids.forEach((id) => toggleQuickFilter(id))
    },
    [clearQuickFilters, toggleQuickFilter],
  )

  const toggleFieldValue = useCallback((fieldId: string, value: string) => {
    setPage(1)
    setAccumulatedRows([])
    lastMergedPageRef.current = 0
    setFieldFilters((current) => {
      const selected = current[fieldId] || []
      const nextValues = selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value]
      const next = { ...current }
      if (nextValues.length) next[fieldId] = nextValues
      else delete next[fieldId]
      return next
    })
  }, [])

  const clearFieldFilters = useCallback(() => {
    setPage(1)
    setAccumulatedRows([])
    lastMergedPageRef.current = 0
    setFieldFilters({})
  }, [])

  const handleSelectWorkflow = useCallback(
    (id: string) => {
      const next = allWorkflows.find((w) => String(w.id) === String(id))
      if (next) setWorkflow(next)
    },
    [allWorkflows],
  )

  const loadMore = useCallback(() => {
    if (isFetching || isPending || !hasMore) return
    setPage((prev) => prev + 1)
  }, [hasMore, isFetching, isPending])

  const refresh = useCallback(async () => {
    setPage(1)
    lastMergedPageRef.current = 0
    await refetch()
  }, [refetch])

  const isInitialLoading =
    workflowLoadStatus === 'loading' ||
    (!!selectedWorkflow && isPending && page === 1 && cards.length === 0)

  const isLoadingMore = isFetching && page > 1
  const showTopLoader =
    isInitialLoading || (isFetching && page === 1 && cards.length > 0)

  return {
    activeQuickFilters,
    activeTab,
    applyFieldFilters,
    allWorkflows,
    cards,
    clearFieldFilters,
    fieldFilters,
    filterCounts,
    handleOpenRequest,
    handleQuickFilter,
    handleSelectWorkflow,
    hasMore,
    isAccountsPayable,
    isInitialLoading,
    isLoading:
      workflowLoadStatus === 'loading' ||
      (!!selectedWorkflow && isPending && page === 1),
    isLoadingMore,
    isRefreshing: isFetching && page === 1,
    loadMore,
    page,
    pageSize: PAGE_SIZE,
    refetch: refresh,
    replaceQuickFilters,
    requestTabs,
    selectedWorkflow,
    selectedWorkflowId: selectedWorkflow?.id ?? workflow?.id ?? null,
    showTopLoader,
    tabCounts,
    toggleFieldValue,
    totalItems: totalItems || accumulatedRows.length,
    workflowFilterFields,
    workflowLoadStatus,
    workflowName:
      selectedWorkflow?.name || workflow?.name || 'Accounts Payable',
    setActiveTab,
  }
}
