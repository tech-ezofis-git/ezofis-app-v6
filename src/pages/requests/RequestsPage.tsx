import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Option } from '@/types/option'
import formApi from '@/api/form/form'
import workflowsApiV6, {
  mapPublishedWorkflowListToOptions,
} from '@/api/v6/workflows'
import PageEmptyState from '@/components/common/PageEmptyState'
import setupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import type { InboxItem, IRequestMeta, WorkflowOption } from './types'
import Header from './components/Header'
import InboxList from './components/InboxList'
import { ProcessingBackgroundManager } from './components/ProcessingBackgroundManager'
import Request from './components/request/Request'
import { useInboxData } from './hooks/useInboxData'
import requestStore from './stores/useRequestStore'

type WorkflowLoadStatus = 'loading' | 'ready' | 'empty'

function flattenRows(groups: any[]): any[] {
  const out: any[] = []
  const walk = (node: any) => {
    if (!node) return
    if (Array.isArray(node.items)) out.push(...node.items)
    if (Array.isArray(node.value)) out.push(...node.value)
    if (Array.isArray(node.rows)) out.push(...node.rows)
    if (Array.isArray(node.children)) node.children.forEach(walk)
    if (Array.isArray(node.groups)) node.groups.forEach(walk)
  }
  ;(groups || []).forEach(walk)
  return out
}

const RequestsPage = () => {
  const [activeTab, setActiveTab] = useState<string>('Inbox')
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid')

  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [workflowLoadStatus, setWorkflowLoadStatus] =
    useState<WorkflowLoadStatus>('loading')
  const [allWorkflow, setAllWorkflow] = useState<Option[] | null>(null)
  const [workflow, setWorkflow] = useState<Option | null>(null)
  const [metaData, setMetaData] = useState<IRequestMeta>()
  const [selectedWorkflow, setSelectedWorkflow] =
    useState<WorkflowOption | null>(null)
  const {
    closeRequest,
    isClosed,
    openNewRequest,
    openRequest,
    pendingOpenNewRequest,
    reloadMeta,
    selectedItem,
    stopRefresh,
    setPendingOpenNewRequest,
    setRawWorkflowData: setRawWorflow,
    setRequestListTab,
  } = requestStore()

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(100)
  const [groupBy, setGroupBy] = useState<string[]>([])

  // --- 2. DATA FETCHING ---
  // Pass 'activeTab' to the hook so it knows which API to call
  const {
    data: inboxResult,
    isFetching,
    isPending,
    refetch,
  } = useInboxData(selectedWorkflow, page, pageSize, groupBy, activeTab)

  const handleRowClick = (row: InboxItem, tab: string) => {
    // Only open if we have a valid workflow ID
    if (selectedWorkflow?.id) {
      openRequest(row, selectedWorkflow, tab)
    }
  }

  // --- 3. HANDLERS ---
  const loadWorkflowList = useCallback(async () => {
    setWorkflowLoadStatus('loading')
    try {
      const { data, error } = await workflowsApiV6.getWorkflows()
      if (error) throw new Error(error)

      const options = mapPublishedWorkflowListToOptions(data)
      if (options.length > 0) {
        setAllWorkflow(options)
        setWorkflow(options[0])
      } else {
        setAllWorkflow([])
        setWorkflow(null)
        setSelectedWorkflow(null)
        setWorkflowLoadStatus('empty')
      }
      setIsLoading(false)
    } catch {
      setAllWorkflow([])
      setWorkflow(null)
      setSelectedWorkflow(null)
      setWorkflowLoadStatus('empty')
      setIsLoading(false)
    }
  }, [])

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

        setRawWorflow({ ...wf, formJson })

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
        setIsLoading(false)
      } catch {
        setSelectedWorkflow(null)
        setWorkflowLoadStatus('empty')
        setIsLoading(false)
      }
    },
    [formApi, setRawWorflow],
  )

  // Initial Load
  useEffect(() => {
    setIsLoading(true)
    loadWorkflowList()
  }, [loadWorkflowList])

  // Workflow Change Listener
  useEffect(() => {
    if (workflow?.id) {
      const isNewWorkflow = !selectedWorkflow || String(workflow.id) !== String(selectedWorkflow.id)
      if (isNewWorkflow && !reloadMeta) {
        loadSelectedWorkflow(String(workflow.id), workflow.name)
      } else if (reloadMeta) {
        loadSelectedWorkflow(String(workflow.id), workflow.name)
        stopRefresh()
        refetch()
      }
    }
  }, [
    workflow,
    reloadMeta,
    selectedWorkflow,
    loadSelectedWorkflow,
    stopRefresh,
    refetch,
  ])
  useEffect(() => {
    // No longer need to manually clear local state
  }, [isClosed])

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    setRequestListTab(tab) // Sync to store

    // Only grouping for Inbox
    if (tab !== 'Inbox') {
      setGroupBy([])
    }
  }

  // Sync initial tab
  useEffect(() => {
    setRequestListTab(activeTab)
  }, [])

  useEffect(() => {
    setupStore.getState().setIsActivatingAutomation(false)
  }, [])

  // Open new request after AP setup activation, once workflow data is loaded
  useEffect(() => {
    if (!pendingOpenNewRequest) return

    if (workflowLoadStatus === 'empty') {
      setPendingOpenNewRequest(false)
      return
    }

    if (selectedWorkflow?.id) {
      openNewRequest('request')
      setPendingOpenNewRequest(false)
    }
  }, [
    pendingOpenNewRequest,
    selectedWorkflow?.id,
    workflowLoadStatus,
    openNewRequest,
    setPendingOpenNewRequest,
  ])

  // --- 4. NAVIGATION & FLATTENING ---

  const flatRows = useMemo(
    () => flattenRows(inboxResult?.data || []),
    [inboxResult?.data],
  )

  const selectedIndex = useMemo(() => {
    if (!selectedItem) return -1
    const selId =
      selectedItem?.processId || selectedItem?.transactionId || selectedItem?.id
    return flatRows.findIndex((r: any) => {
      const rId = r?.processId || r?.transactionId || r?.id
      return String(selId) === String(rId)
    })
  }, [flatRows, selectedItem])

  const hasPrev = selectedIndex > 0
  const hasNext = selectedIndex >= 0 && selectedIndex < flatRows.length - 1

  const onPrev = () => {
    if (hasPrev) {
      const prevItem = flatRows[selectedIndex - 1]
      if (selectedWorkflow) openRequest(prevItem, selectedWorkflow, activeTab)
    }
  }

  const onNext = () => {
    if (hasNext) {
      const nextItem = flatRows[selectedIndex + 1]
      if (selectedWorkflow) openRequest(nextItem, selectedWorkflow, activeTab)
    }
  }

  const isWorkflowReady =
    workflowLoadStatus === 'ready' && !!selectedWorkflow?.id
  const showWorkflowEmpty = workflowLoadStatus === 'empty'
  const inboxIsLoading =
    workflowLoadStatus === 'loading' ||
    (isWorkflowReady && (isPending || isFetching))

  return (
    <>
      {!selectedItem && (
        <Header
          // Pass state and setter to Header
          activeTab={activeTab}
          allWorkflows={allWorkflow}
          isLoading={isLoading}
          metaData={metaData}
          viewMode={viewMode}
          workflow={workflow}
          setActiveTab={handleTabChange}
          setViewMode={setViewMode}
          setWorkflow={setWorkflow}
        />
      )}
      {selectedItem && (
        <Request
          item={selectedItem}
          workflowId={selectedWorkflow?.id}
          onBack={closeRequest}
          onNext={onNext}
          onPrev={onPrev}
        />
      )}
      {showWorkflowEmpty && !selectedItem ? (
        <PageEmptyState page='requests' variant='unavailable' />
      ) : (
        <InboxList
          activeTab={activeTab}
          data={inboxResult?.data || []}
          isLoading={inboxIsLoading}
          isRefetching={isWorkflowReady && isFetching}
          page={page}
          pageSize={pageSize}
          selectedItem={selectedItem}
          totalItems={inboxResult?.totalItems || 0}
          viewMode={viewMode}
          workflow={selectedWorkflow}
          setPage={setPage}
          setPageSize={setPageSize}
          onGroupByChange={setGroupBy}
          onRefresh={refetch}
          onRowClick={handleRowClick}
        />
      )}
      <ProcessingBackgroundManager />
    </>
  )
}

RequestsPage.displayName = 'RequestsPage'
export default RequestsPage
