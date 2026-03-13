import { useCallback, useEffect, useState } from 'react'
import type { Option } from '@/types/option'
import formApi from '@/api/form/form'
import requestApi from '@/api/requests/requests'
import type { InboxItem, IRequestMeta, WorkflowOption } from './types'
import Header from './components/Header'
import InboxList from './components/InboxList'
// import Request from './components/request/Request'
// import InboxList from './components/InboxList'
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
  const [selectedItem, setSelectedItem] = useState<InboxItem | null>(null)

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [groupBy, setGroupBy] = useState<string[]>([])

  const openRequest = requestStore((state) => state.openRequest)
  const isClosed = requestStore((state) => state.isClosed)
  const setRawWorflow = requestStore((state) => state.setRawWorkflowData)
  const reloadMeta = requestStore((state) => state.reloadMeta)
  const stopRefresh = requestStore((state) => state.stopRefresh)
  const setRequestListTab = requestStore((state) => state.setRequestListTab)
  // --- 2. DATA FETCHING ---
  // Pass 'activeTab' to the hook so it knows which API to call
  const {
    data: inboxResult,
    isFetching,
    isPending,
    refetch,
  } = useInboxData(selectedWorkflow, page, pageSize, groupBy, activeTab)

  const handleRowClick = (row: InboxItem, tab: string) => {
    setSelectedItem(row)
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
    setSelectedItem(null)
  }, [isClosed])

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    setRequestListTab(tab) // Sync to store
    setSelectedItem(null)

    // Only grouping for Inbox
    if (tab !== 'Inbox') {
      setGroupBy([])
    }
  }

  // Sync initial tab
  useEffect(() => {
    setRequestListTab(activeTab)
  }, [])
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
        setSelectedItem={setSelectedItem}
        onGroupByChange={setGroupBy}
        onRefresh={refetch}
        onRowClick={handleRowClick}
      />
    </>
  )
}

RequestsPage.displayName = 'RequestsPage'
export default RequestsPage
