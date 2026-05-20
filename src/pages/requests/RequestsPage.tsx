import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Option } from '@/types/option'
import formApi from '@/api/form/form'
import requestApi from '@/api/requests/requests'
import type { InboxItem, IRequestMeta, WorkflowOption } from './types'
import Header from './components/Header'
import InboxList from './components/InboxList'
import { ProcessingBackgroundManager } from './components/ProcessingBackgroundManager'
import Request from './components/request/Request'
import { useInboxData } from './hooks/useInboxData'
import requestStore from './stores/useRequestStore'

const RequestsPage = () => {
  const [activeTab, setActiveTab] = useState<string>('Inbox')
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid')

  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [allWorkflow, setAllWorkflow] = useState<Option[] | null>(null)
  const [workflow, setWorkflow] = useState<Option | null>(null)
  const [metaData, setMetaData] = useState<IRequestMeta>()
  const [selectedWorkflow, setSelectedWorkflow] =
    useState<WorkflowOption | null>(null)
  const {
    closeRequest,
    isClosed,
    openRequest,
    reloadMeta,
    selectedItem,
    stopRefresh,
    setRawWorkflowData: setRawWorflow,
    setRequestListTab,
  } = requestStore()

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
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
  const handleSelectAllRequests = useCallback(async () => {
    try {
      const browseConfig = {
        currentPage: 1,
        filterBy: [],
        groupBy: 'flowstatus',
        hasSecurity: true,
        itemsPerPage: 100,
        mode: 'BROWSE',
        sortBy: { criteria: 'name', order: 'ASC' },
      }
      const response = await requestApi?.getAllRequests(browseConfig)

      let data
      if (response?.data) {
        data = response?.data[0]?.value.map((request: any) => ({
          disabled: false,
          id: request?.id || request?.requestId,
          name: request?.name || request?.requestNo || 'Request',
        }))
      }
      if (data && data.length > 0) {
        setAllWorkflow(data)
        setWorkflow(data[0]) // This triggers the useEffect below
      }
      setIsLoading(false)
    } catch {
      setIsLoading(false)
    }
  }, [requestApi])

  const handleGetAllRequestMetaById = useCallback(
    async (id: string | number) => {
      try {
        const response = await requestApi?.getMetaDataByRequest(id)
        if (response?.data?.length) {
          // Update Metadata counts
          setRawWorflow(response.data[0])
          setMetaData({
            completedCount: response.data[0].completedCount,
            inboxCount: response.data[0].inboxCount,
            sentCount: response.data[0].processCount,
          })
          console.log(response?.data, 'this is meta data request')
          // Update Selected Workflow Details
          const wf = response.data[0]

          let formJson = wf.formJson

          if (!formJson && wf.wFormId) {
            const formRes = await formApi.getFormDataById(wf.wFormId)
            console.log('formRes', formRes)
            formJson = formRes?.data
          }
          setSelectedWorkflow({
            flowJson: wf.flowJson,
            formJson: formJson ?? '',
            id: wf.id,
            name: wf.name,
            wFormId: wf.wFormId ?? '',
          })
        }
        setIsLoading(false)
      } catch {
        setIsLoading(false)
      }
    },
    [requestApi, formApi, setRawWorflow],
  )

  // Initial Load
  useEffect(() => {
    setIsLoading(true)
    handleSelectAllRequests()
  }, [handleSelectAllRequests])

  // Workflow Change Listener
  useEffect(() => {
    console.log(reloadMeta, isFetching, 'this is reload meta')

    if (workflow?.id && !reloadMeta && !isFetching) {
      if (reloadMeta) {
        setIsLoading(true)
      }

      handleGetAllRequestMetaById(workflow.id)
      // Note: We don't need manual API calls here anymore.
      // The useInboxData hook watches 'selectedWorkflow' and auto-fetches.
    } else {
      if (reloadMeta) {
        if (workflow?.id) handleGetAllRequestMetaById(workflow.id)
        stopRefresh()
        refetch()
      }
    }
  }, [
    workflow,
    reloadMeta,
    isFetching,
    handleGetAllRequestMetaById,
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

  // --- 4. NAVIGATION & FLATTENING ---
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
      {/* <Table /> */}
      <InboxList
        activeTab={activeTab}
        data={inboxResult?.data || []}
        isLoading={isPending}
        isRefetching={isFetching}
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
      <ProcessingBackgroundManager />
    </>
  )
}

RequestsPage.displayName = 'RequestsPage'
export default RequestsPage
