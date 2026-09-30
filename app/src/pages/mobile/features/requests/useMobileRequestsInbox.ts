import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  InboxItem,
  IRequestMeta,
  WorkflowOption,
} from '@/pages/requests/types'
import type { Option } from '@/types/option'
import formApi from '@/api/form/form'
import workflowsApiV6, {
  mapPublishedWorkflowListToOptions,
} from '@/api/v6/workflows'
import { useInboxData } from '@/pages/requests/hooks/useInboxData'
import requestStore from '@/pages/requests/stores/useRequestStore'
import {
  countQuickFilterMatches,
  filterRowsByQuickFilters,
  flattenInboxGroups,
  mapInboxItemToRequestCard,
} from '@/pages/requests/utils/inboxItemDisplay'

export type MobileInboxTab = 'Inbox' | 'Exceptions' | 'Processed'

const PAGE_SIZE = 20

type WorkflowLoadStatus = 'loading' | 'ready' | 'empty'

const rowKey = (item: any) =>
  String(item.processId || item.workflowInstanceId || item.id || '')

export function useMobileRequestsInbox() {
  const {
    activeQuickFilters,
    clearQuickFilters,
    openRequest,
    toggleQuickFilter,
    setRawWorkflowData,
    setRequestListTab,
  } = requestStore()

  const [activeTab, setActiveTab] = useState<MobileInboxTab>('Inbox')
  const [page, setPage] = useState(1)
  const [accumulatedRows, setAccumulatedRows] = useState<any[]>([])
  const [workflowLoadStatus, setWorkflowLoadStatus] =
    useState<WorkflowLoadStatus>('loading')
  const [allWorkflows, setAllWorkflows] = useState<Option[]>([])
  const [workflow, setWorkflow] = useState<Option | null>(null)
  const [metaData, setMetaData] = useState<IRequestMeta>()
  const [selectedWorkflow, setSelectedWorkflow] =
    useState<WorkflowOption | null>(null)

  const lastMergedPageRef = useRef(0)
  const listResetKey = `${selectedWorkflow?.id ?? ''}:${activeTab}`

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

        setRawWorkflowData({ ...wf, formJson, id: workflowId })

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
    [setRawWorkflowData],
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
    if (!workflow?.id) return
    const currentId = selectedWorkflow?.id
    const isNewWorkflow =
      !currentId || String(workflow.id) !== String(currentId)
    if (!isNewWorkflow) return
    clearQuickFilters()
    setPage(1)
    setAccumulatedRows([])
    lastMergedPageRef.current = 0
    void loadSelectedWorkflow(String(workflow.id), workflow.name)
    // Only re-run when the chosen workflow id changes (same as web RequestsPage).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflow?.id, loadSelectedWorkflow])

  useEffect(() => {
    setRequestListTab(activeTab)
    clearQuickFilters()
    setPage(1)
    setAccumulatedRows([])
    lastMergedPageRef.current = 0
  }, [activeTab, clearQuickFilters, setRequestListTab])

  const {
    data: inboxResult,
    dataUpdatedAt,
    isFetching,
    isPending,
    refetch,
  } = useInboxData(selectedWorkflow, page, PAGE_SIZE, [], activeTab)

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
    allWorkflows,
    cards,
    filterCounts,
    handleOpenRequest,
    handleQuickFilter,
    handleSelectWorkflow,
    hasMore,
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
    selectedWorkflow,
    selectedWorkflowId: selectedWorkflow?.id ?? workflow?.id ?? null,
    showTopLoader,
    tabCounts,
    totalItems: totalItems || accumulatedRows.length,
    workflowLoadStatus,
    workflowName:
      selectedWorkflow?.name || workflow?.name || 'Accounts Payable',
    setActiveTab,
  }
}
