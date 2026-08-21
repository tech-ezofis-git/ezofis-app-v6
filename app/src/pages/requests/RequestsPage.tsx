import { useLingui } from '@lingui/react/macro'
import { useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { V6SearchFilterClause } from '@/api/v6/workflows'
import type { Option } from '@/types/option'
import formApi from '@/api/form/form'
import requestApi from '@/api/requests/requests'
import workflowsApiV6, {
  mapPublishedWorkflowListToOptions,
} from '@/api/v6/workflows'
import PageEmptyState from '@/components/common/PageEmptyState'
import setupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import { getFromLocalStorage, setToLocalStorage } from '@/utils/local-storage'
import type { InboxItem, IRequestMeta, WorkflowOption } from './types'
import Header from './components/Header'
import InboxList from './components/InboxList'
import { ProcessingBackgroundManager } from './components/ProcessingBackgroundManager'
import Request from './components/request/Request'
import { transformProcess, useInboxData } from './hooks/useInboxData'
import requestStore from './stores/useRequestStore'
import { isAccountsPayableWorkflow } from './utils/workflow.utils'

type WorkflowLoadStatus = 'loading' | 'ready' | 'empty'

const LAST_WORKFLOW_ID_KEY = 'v6_requests_last_workflow_id'

const getLastSelectedWorkflowId = () =>
  getFromLocalStorage<string>(LAST_WORKFLOW_ID_KEY, 'STRING')

const setLastSelectedWorkflowId = (id: string | number) =>
  setToLocalStorage(String(id), LAST_WORKFLOW_ID_KEY, 'STRING')

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

const SESSION_KEY = 'ezofis_requests_page_state'

function getStoredState() {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

const RequestsPage = () => {
  const { t } = useLingui()
  const storedState = useMemo(() => getStoredState(), [])
  const [activeTab, setActiveTab] = useState<string>(
    storedState?.activeTab ?? 'Inbox',
  )
  const [viewMode, setViewMode] = useState<'table' | 'grid'>(
    storedState?.viewMode ?? 'grid',
  )

  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [workflowLoadStatus, setWorkflowLoadStatus] =
    useState<WorkflowLoadStatus>('loading')
  const [allWorkflow, setAllWorkflow] = useState<Option[] | null>(null)
  const [workflow, setWorkflow] = useState<Option | null>(null)
  const [metaData, setMetaData] = useState<IRequestMeta>()
  const [selectedWorkflow, setSelectedWorkflow] =
    useState<WorkflowOption | null>(requestStore.getState().selectedWorkflow)
  const [filterClauses, setFilterClauses] = useState<V6SearchFilterClause[]>(
    storedState?.filterClauses ?? [],
  )

  const {
    clearPendingDeepLink,
    closeRequest,
    isClosed,
    openNewRequest,
    openRequest,
    pendingDeepLink,
    pendingOpenNewRequest,
    rawWorkflowData,
    reloadMeta,
    selectedItem,
    stopRefresh,
    setPendingOpenNewRequest,
    setRawWorkflowData: setRawWorflow,
    setRequestListTab,
  } = requestStore()

  const isAccountsPayable = useMemo(
    () => isAccountsPayableWorkflow(rawWorkflowData),
    [rawWorkflowData],
  )

  const navigate = useNavigate()

  const [page, setPage] = useState(storedState?.page ?? 1)
  const [pageSize, setPageSize] = useState(storedState?.pageSize ?? 100)
  const [groupBy, setGroupBy] = useState<string[]>(storedState?.groupBy ?? [])

  useEffect(() => {
    try {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          activeTab,
          filterClauses,
          groupBy,
          page,
          pageSize,
          viewMode,
        }),
      )
    } catch {
      // ignore
    }
  }, [activeTab, viewMode, filterClauses, page, pageSize, groupBy])

  // --- 2. DATA FETCHING ---
  // Pass 'activeTab' and 'filterClauses' to the hook so it knows which API to call
  const {
    data: inboxResult,
    isFetching,
    isPending,
    refetch,
  } = useInboxData(
    selectedWorkflow,
    page,
    pageSize,
    groupBy,
    activeTab,
    filterClauses,
  )

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
        // Re-select whatever workflow was last active instead of always
        // defaulting to the first one — this page remounts (and loses its
        // local `workflow` state) whenever the user navigates away and
        // back, or when the New Request panel opens/closes.
        const lastId = getLastSelectedWorkflowId()
        const restored =
          lastId && options.find((opt) => String(opt.id) === String(lastId))
        setWorkflow(restored || options[0])
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

        setRawWorflow({ ...wf, formJson, id: workflowId })

        let flowJson = ''
        if (typeof wf.flowJson === 'string') {
          flowJson = wf.flowJson
        } else if (wf.flowJson) {
          flowJson = JSON.stringify(wf.flowJson)
        } else if (wf.workflowJson) {
          // The real V6 workflow detail response only returns workflowJson
          // (no separate flowJson string) — fall back to it so consumers
          // of selectedWorkflow.flowJson (getActionsForActivity, etc.)
          // still see the actual blocks/rules instead of an empty flow.
          flowJson = JSON.stringify(wf.workflowJson)
        }

        setSelectedWorkflow({
          flowJson,
          formJson: formJson ?? '',
          id: workflowId,
          name:
            wf.name ?? wf.settings?.general?.name ?? workflowName ?? 'Workflow',
          wFormId: wFormId || '',
          workflowJson: wf.workflowJson,
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

  // Notification deep-link: switch to the target workflow once the list is loaded
  useEffect(() => {
    if (!pendingDeepLink || !allWorkflow) return
    console.log('📌 [RequestsPage Step 6: Workflow Matching Effect]', {
      availableWorkflows: allWorkflow.map((w) => ({ id: w.id, name: w.name })),
      currentWorkflowId: workflow?.id,
      pendingDeepLinkWorkflowId: pendingDeepLink.workflowId,
    })

    const match = allWorkflow.find(
      (opt) => String(opt.id) === String(pendingDeepLink.workflowId),
    )
    if (match) {
      console.log('📌 [RequestsPage Step 6.1: Found Matching Workflow]', match)
      if (String(match.id) !== String(workflow?.id)) {
        setWorkflow(match)
      }
    } else {
      console.warn(
        '⚠️ [RequestsPage Step 6.2: Workflow ID not found in user workflows list!]',
        pendingDeepLink.workflowId,
      )
    }
  }, [pendingDeepLink, allWorkflow, workflow])

  // Notification deep-link: once the target workflow's data is ready, fetch and open the row
  useEffect(() => {
    if (!pendingDeepLink || !selectedWorkflow) return

    // Prevent redundant reloading if the clicked ticket is ALREADY open in overview
    const currentInstId =
      selectedItem?.workflowInstanceId ||
      selectedItem?.processId ||
      selectedItem?.id
    const currentTxId = selectedItem?.transactionId

    const targetInstId = pendingDeepLink.processId
    const targetTxId = pendingDeepLink.transactionId

    const isAlreadyOpen =
      !!selectedItem &&
      ((currentInstId &&
        targetInstId &&
        String(currentInstId).toLowerCase() ===
          String(targetInstId).toLowerCase()) ||
        (currentTxId &&
          targetTxId &&
          String(currentTxId).toLowerCase() ===
            String(targetTxId).toLowerCase()))

    if (isAlreadyOpen) {
      console.log(
        'ℹ️ [RequestsPage] Ticket is ALREADY currently open in overview. Skipping redundant reload.',
      )
      clearPendingDeepLink()
      return
    }

    console.log('📌 [RequestsPage Step 7: Ticket Retrieval Effect Triggered]', {
      pendingDeepLink,
      selectedWorkflowId: selectedWorkflow.id,
      selectedWorkflowName: selectedWorkflow.name,
    })

    if (String(selectedWorkflow.id) !== String(pendingDeepLink.workflowId)) {
      console.log(
        '📌 [RequestsPage Step 7.1: Waiting for selectedWorkflow.id to equal pendingDeepLink.workflowId]',
        {
          pendingDeepLinkWorkflowId: pendingDeepLink.workflowId,
          selectedWorkflowId: selectedWorkflow.id,
        },
      )
      return
    }

    let cancelled = false
    ;(async () => {
      let row: any = null
      const wfId = String(pendingDeepLink.workflowId)
      const instId = pendingDeepLink.processId
      const txId = pendingDeepLink.transactionId

      console.log(
        '📌 [RequestsPage Step 8: Fetching single ticket instance from V6 API]',
        { instId, txId, wfId },
      )

      // 1. Primary: Fetch via V6 /Workflows/inbox, /sent, and /completed using instanceId
      try {
        const [inboxRes, sentRes, completedRes] = await Promise.all([
          workflowsApiV6.getInboxList(wfId, 1, 10, instId, txId),
          workflowsApiV6.getSentList(wfId, 1, 10, instId, txId),
          workflowsApiV6.getCompletedList(wfId, 1, 10, instId, txId),
        ])

        console.log('📌 [RequestsPage Step 8.1: API Responses Received]', {
          completedItemsCount: completedRes.data?.items?.length || 0,
          inboxItemsCount: inboxRes.data?.items?.length || 0,
          sentItemsCount: sentRes.data?.items?.length || 0,
        })

        const candidateItems = [
          ...(inboxRes.data?.items || []),
          ...(sentRes.data?.items || []),
          ...(completedRes.data?.items || []),
        ]

        row = candidateItems.find(
          (item: any) =>
            String(item.workflowInstanceId || item.processId || item.id) ===
              String(instId) ||
            (txId && String(item.transactionId) === String(txId)),
        )
        if (row) {
          console.log(
            '📌 [RequestsPage Step 8.2: Found Ticket in V6 API Response]',
            row,
          )
        }
      } catch (e) {
        console.warn('⚠️ V6 instance fetch error', e)
      }

      // 2. Secondary fallback: try getProcess rowInfo
      if (!row) {
        console.log(
          '📌 [RequestsPage Step 8.3: Trying getProcess rowInfo fallback]',
        )
        try {
          row = await requestApi.getProcess(
            pendingDeepLink.workflowId,
            pendingDeepLink.processId,
            pendingDeepLink.transactionId ?? pendingDeepLink.processId,
          )
          console.log(
            '📌 [RequestsPage Step 8.4: getProcess rowInfo returned]',
            row,
          )
        } catch (e) {
          console.warn('⚠️ getProcess request failed', e)
        }
      }

      // 3. Fallback: search currently loaded inboxResult items
      if (!row && inboxResult?.data) {
        console.log('📌 [RequestsPage Step 8.5: Searching inboxResult items]')
        const allItems = inboxResult.data.flatMap(
          (group: any) => group.items || [],
        )
        row = allItems.find(
          (item: any) =>
            String(item.processId || item.workflowInstanceId || item.id) ===
              String(instId) ||
            (txId && String(item.transactionId) === String(txId)),
        )
        if (row) {
          console.log(
            '📌 [RequestsPage Step 8.6: Found Ticket in inboxResult]',
            row,
          )
        }
      }

      // Transform row to full InboxItem format if needed
      let transformedRow = row
      if (row && !row._actions) {
        console.log(
          '📌 [RequestsPage Step 9: Transforming raw process item via transformProcess...]',
        )
        transformedRow = transformProcess(
          row,
          'Inbox',
          0,
          'Inbox',
          selectedWorkflow,
        )
      }

      if (cancelled) return

      if (transformedRow) {
        console.log(
          '🚀 [RequestsPage Step 10: Calling openRequest to open detail drawer!]',
          {
            selectedWorkflow,
            tab: pendingDeepLink.tab ?? 'Details',
            transformedRow,
          },
        )
        closeRequest()
        openRequest(
          transformedRow,
          selectedWorkflow,
          pendingDeepLink.tab ?? 'Details',
        )
      } else {
        console.error(
          '❌ [RequestsPage Error: Could not locate ticket item for instanceId]',
          instId,
        )
      }

      if (!cancelled) {
        console.log('📌 [RequestsPage Step 11: Clearing pendingDeepLink]')
        clearPendingDeepLink()
      }
    })()

    return () => {
      cancelled = true
    }
  }, [
    pendingDeepLink,
    selectedWorkflow,
    selectedItem,
    inboxResult,
    openRequest,
    closeRequest,
    clearPendingDeepLink,
    navigate,
  ])

  // Remember the active workflow so it survives this page remounting
  // (navigating away and back, or opening/closing New Request).
  useEffect(() => {
    if (workflow?.id) {
      setLastSelectedWorkflowId(workflow.id)
    }
  }, [workflow?.id])

  // Workflow Change Listener
  useEffect(() => {
    if (workflow?.id) {
      const isNewWorkflow =
        !selectedWorkflow || String(workflow.id) !== String(selectedWorkflow.id)
      if (isNewWorkflow) {
        requestStore.getState().clearQuickFilters()
      }
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
    requestStore.getState().clearQuickFilters()

    // Only grouping for Inbox
    if (tab !== 'Inbox') {
      setGroupBy([])
    }
  }

  // Sync initial tab
  useEffect(() => {
    setRequestListTab(activeTab)
  }, [])

  // Generic workflows use Inbox/Sent/Closed tabs; AP workflows use
  // Inbox/Exceptions/Processed. If the workflow type changes while a tab
  // that doesn't exist for the new type is active, fall back to Inbox.
  useEffect(() => {
    const validTabs = isAccountsPayable
      ? ['Inbox', 'Exceptions', 'Processed']
      : ['Inbox', 'Sent', 'Closed']
    if (!validTabs.includes(activeTab)) {
      handleTabChange('Inbox')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAccountsPayable])

  useEffect(() => {
    setupStore.getState().setIsActivatingAutomation(false)
  }, [])

  // Open new request after AP setup activation
  useEffect(() => {
    if (!pendingOpenNewRequest) return

    openNewRequest('request')
    setPendingOpenNewRequest(false)
  }, [pendingOpenNewRequest, openNewRequest, setPendingOpenNewRequest])

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
      <div className='flex h-full min-h-0 w-full overflow-hidden'>
        <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
          {!selectedItem && (
            <Header
              // Pass state and setter to Header
              activeTab={activeTab}
              allWorkflows={allWorkflow}
              exceptionsCount={inboxResult?.exceptionsCount}
              isAccountsPayable={isAccountsPayable}
              isLoading={isLoading}
              metaData={metaData}
              workflow={workflow}
              actionButtons={[
                {
                  color: 'primary',
                  icon: 'tabler:plus',
                  id: 'new-request',
                  label: t`New Request`,
                  variant: 'solid',
                  onClick: () => {
                    console.log('am running')
                    openNewRequest('request')
                  },
                },
              ]}
              setActiveTab={handleTabChange}
              setWorkflow={setWorkflow}
            />
          )}
          {selectedItem && (
            <Request
              isFourthItem={selectedIndex === 3}
              isThirdItem={selectedIndex === 2}
              item={selectedItem}
              workflowId={selectedWorkflow?.id}
              onBack={closeRequest}
              onNext={hasNext ? onNext : undefined}
              onPrev={hasPrev ? onPrev : undefined}
            />
          )}
          {!selectedItem &&
            (showWorkflowEmpty ? (
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
                setViewMode={setViewMode}
                onFilterClausesChange={setFilterClauses}
                onGroupByChange={setGroupBy}
                onRefresh={refetch}
                onRowClick={handleRowClick}
              />
            ))}
        </div>
      </div>
      <ProcessingBackgroundManager />
    </>
  )
}

RequestsPage.displayName = 'RequestsPage'
export default RequestsPage
