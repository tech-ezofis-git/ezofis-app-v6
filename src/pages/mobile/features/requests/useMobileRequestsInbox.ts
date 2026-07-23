import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Option } from '@/types/option'
import formApi from '@/api/form/form'
import workflowsApiV6, {
  mapPublishedWorkflowListToOptions,
} from '@/api/v6/workflows'
import { useInboxData } from '@/pages/requests/hooks/useInboxData'
import requestStore from '@/pages/requests/stores/useRequestStore'
import type { InboxItem, IRequestMeta, WorkflowOption } from '@/pages/requests/types'
import {
  countQuickFilterMatches,
  filterRowsByQuickFilters,
  flattenInboxGroups,
  mapInboxItemToRequestCard,
} from '@/pages/requests/utils/inboxItemDisplay'

export type MobileInboxTab = 'Inbox' | 'Exceptions' | 'Processed'

const PAGE_SIZE = 100

type WorkflowLoadStatus = 'loading' | 'ready' | 'empty'

export function useMobileRequestsInbox() {
  const {
    activeQuickFilters,
    clearQuickFilters,
    openRequest,
    setRawWorkflowData,
    setRequestListTab,
    toggleQuickFilter,
  } = requestStore()

  const [activeTab, setActiveTab] = useState<MobileInboxTab>('Inbox')
  const [page, setPage] = useState(1)
  const [workflowLoadStatus, setWorkflowLoadStatus] =
    useState<WorkflowLoadStatus>('loading')
  const [allWorkflows, setAllWorkflows] = useState<Option[]>([])
  const [workflow, setWorkflow] = useState<Option | null>(null)
  const [metaData, setMetaData] = useState<IRequestMeta>()
  const [selectedWorkflow, setSelectedWorkflow] =
    useState<WorkflowOption | null>(null)

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
    void loadSelectedWorkflow(String(workflow.id), workflow.name)
    // Only re-run when the chosen workflow id changes (same as web RequestsPage).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflow?.id, loadSelectedWorkflow])

  useEffect(() => {
    setRequestListTab(activeTab)
    clearQuickFilters()
    setPage(1)
  }, [activeTab, clearQuickFilters, setRequestListTab])

  const {
    data: inboxResult,
    isFetching,
    isPending,
    refetch,
  } = useInboxData(selectedWorkflow, page, PAGE_SIZE, [], activeTab)

  const flatRows = useMemo(
    () => flattenInboxGroups(inboxResult?.data || []),
    [inboxResult?.data],
  )

  const filteredRows = useMemo(() => {
    if (activeTab !== 'Inbox') return flatRows
    return filterRowsByQuickFilters(flatRows, activeQuickFilters)
  }, [activeQuickFilters, activeTab, flatRows])

  const cards = useMemo(
    () => filteredRows.map(mapInboxItemToRequestCard),
    [filteredRows],
  )

  const filterCounts = useMemo(
    () => countQuickFilterMatches(flatRows),
    [flatRows],
  )

  const totalItems = Number(inboxResult?.totalItems ?? filteredRows.length)

  const tabCounts = useMemo(
    () => ({
      exceptions: Number(inboxResult?.exceptionsCount ?? 0),
      invoices: Number(
        inboxResult?.inboxTabCount ?? metaData?.inboxCount ?? flatRows.length,
      ),
      processed:
        Number(metaData?.completedCount ?? 0) +
        Number(metaData?.sentCount ?? 0),
    }),
    [
      flatRows.length,
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
        (item) =>
          String(item.processId || item.workflowInstanceId || item.id) ===
          String(cardId),
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

  const rangeStart = filteredRows.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(page * PAGE_SIZE, totalItems || filteredRows.length)

  return {
    activeQuickFilters,
    activeTab,
    allWorkflows,
    cards,
    filterCounts,
    handleOpenRequest,
    handleQuickFilter,
    handleSelectWorkflow,
    isLoading:
      workflowLoadStatus === 'loading' ||
      (!!selectedWorkflow && isPending),
    isRefreshing: isFetching,
    page,
    pageSize: PAGE_SIZE,
    rangeEnd,
    rangeStart,
    refetch,
    selectedWorkflow,
    selectedWorkflowId: selectedWorkflow?.id ?? workflow?.id ?? null,
    setActiveTab,
    setPage,
    tabCounts,
    totalItems: totalItems || filteredRows.length,
    workflowLoadStatus,
    workflowName: selectedWorkflow?.name || workflow?.name || 'Accounts Payable',
  }
}
