import { useEffect, useState } from 'react'
import Header from './components/Header'
// import Request from './components/request/Request'
// import InboxList from './components/InboxList'
import { useInboxData } from './hooks/useInboxData'
import requestApi from '@/api/requests/requests'
import type { Option } from '@/types/option'
import type { IRequestMeta, WorkflowOption } from './types'
import requestStore from './stores/useRequestStore'
import InboxList from './components/InboxList'
import formApi from '@/api/form/form'

const RequestsPage = () => {
  const [activeTab, setActiveTab] = useState<string>('Inbox')
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid')

  const [isLoading, setIsLoading] = useState<Boolean>(false)
  const [allWorkflow, setAllWorkflow] = useState<Option[] | null>(null)
  const [workflow, setWorkflow] = useState<Option | null>(null)
  const [metaData, setMetaData] = useState<IRequestMeta>()
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowOption | null>(null)
  const [selectedItem, setSelectedItem] = useState(null);

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const openRequest = requestStore((state) => state.openRequest)
  const isClosed = requestStore((state) => state.isClosed)
  const setRawWorflow = requestStore((state) => state.setRawWorkflowData)
  const reloadMeta = requestStore((state) => state.reloadMeta)
  const stopRefresh = requestStore((state) => state.stopRefresh)

  // --- 2. DATA FETCHING ---
  // Pass 'activeTab' to the hook so it knows which API to call
  const {
    data: inboxResult,
    isPending,
    isFetching,
    refetch
  } = useInboxData(selectedWorkflow, page, pageSize, [], activeTab);

  const handleRowClick = (row: any, tab: string) => {
    setSelectedItem(row);
    // Only open if we have a valid workflow ID
    if (selectedWorkflow?.id) {

      openRequest(row, selectedWorkflow, tab);
    }
  }

  // --- 3. HANDLERS ---
  const handleSelectAllRequests = async () => {
    try {
      const browseConfig = {
        mode: "BROWSE",
        sortBy: { criteria: "name", order: "ASC" },
        groupBy: "flowstatus",
        filterBy: [],
        itemsPerPage: 100,
        currentPage: 1,
        hasSecurity: true
      };
      const response = await requestApi?.getAllRequests(browseConfig);

      let data
      if (response?.data) {
        data = response?.data[0]?.value.map((request: any) => ({
          disabled: false,
          id: request?.id,
          name: request?.name
        }))
      }
      if (data && data.length > 0) {
        setAllWorkflow(data)
        setWorkflow(data[0]) // This triggers the useEffect below
      }
      setIsLoading(false)
    } catch (error) {
      setIsLoading(false)
      console.error(error)
    }
  }

  const handleGetAllRequestMetaById = async (id: Number) => {
    try {
      const response = await requestApi?.getMetaDataByRequest(id)
      if (response?.data?.length) {
        // Update Metadata counts
        setRawWorflow(response.data[0])
        setMetaData({
          inboxCount: response.data[0].inboxCount,
          sentCount: response.data[0].processCount,
          completedCount: response.data[0].completedCount
        });
        console.log(response?.data, "this is meta data request")
        // Update Selected Workflow Details
        const wf = response.data[0];

        let formJson = wf.formJson

        if (!formJson && wf.wFormId) {

          const formRes = await formApi.getFormDataById(wf.wFormId)
          console.log("formRes", formRes)
          formJson = formRes?.data
        }
        setSelectedWorkflow({
          id: wf.id,
          name: wf.name,
          flowJson: wf.flowJson,
          wFormId: wf.wFormId ?? "",
          formJson: formJson ?? ""
        });
      }
      setIsLoading(false)
    } catch (error) {
      setIsLoading(false)
    }
  }

  // Initial Load
  useEffect(() => {

    setIsLoading(true)
    handleSelectAllRequests()

  }, [])

  // Workflow Change Listener
  useEffect(() => {
    console.log(reloadMeta, isFetching, "this is reload meta")

    if (workflow?.id && !reloadMeta && !isFetching) {
      if (reloadMeta) {
        setIsLoading(true)
      }

      handleGetAllRequestMetaById(workflow.id)
      // Note: We don't need manual API calls here anymore. 
      // The useInboxData hook watches 'selectedWorkflow' and auto-fetches.
    } else {
      if (reloadMeta) {
        workflow?.id && handleGetAllRequestMetaById(workflow.id)
        stopRefresh()
        refetch()

      }
    }



  }, [workflow, reloadMeta, isFetching])
  useEffect(() => {
    setSelectedItem(null)

  }, [isClosed])
  console.log(inboxResult?.data, "this is inboxlist data ")

  console.log("selectedWorkflow", selectedWorkflow)


  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    setSelectedItem(null)


  }
  return (
    <>
      {!selectedItem && <Header
        isLoading={isLoading}
        workflow={workflow}
        allWorkflows={allWorkflow}
        setWorkflow={setWorkflow}
        metaData={metaData}
        // Pass state and setter to Header
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />}
      {/* <Table /> */}
      <InboxList
        workflow={selectedWorkflow}
        data={inboxResult?.data || []}
        totalItems={inboxResult?.totalItems || 0}
        isLoading={isPending}
        isRefetching={isFetching}
        page={page}
        pageSize={pageSize}
        setPage={setPage}
        setPageSize={setPageSize}
        onRefresh={refetch}
        onRowClick={handleRowClick}
        selectedItem={selectedItem}
        setSelectedItem={setSelectedItem}
        viewMode={viewMode}
      />

    </>
  )
}

RequestsPage.displayName = 'RequestsPage'
export default RequestsPage