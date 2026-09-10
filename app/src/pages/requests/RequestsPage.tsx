import { useLingui } from '@lingui/react/macro'
import { useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { V6SearchFilterClause } from '@/api/v6/workflows'
import type { Option } from '@/types/option'
import formApi from '@/api/form/form'
import requestApi from '@/api/requests/requests'
import workflowsApiV6, {
  mapPublishedWorkflowListToOptions,
  type WorkflowOptionItem,
} from '@/api/v6/workflows'
import PageEmptyState from '@/components/common/PageEmptyState'
import setupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import useAuthUserStore from '@/stores/authUserStore'
import type {
  InboxItem,
  IRequestMeta,
  RequestViewMode,
  WorkflowOption,
} from './types'
import Header from './components/Header'
import InboxList from './components/InboxList'
import { ProcessingBackgroundManager } from './components/ProcessingBackgroundManager'
import Request from './components/request/Request'
import { transformProcess, useInboxData } from './hooks/useInboxData'
import requestStore from './stores/useRequestStore'
import {
  extractBlocks,
  isAccountsPayableWorkflow,
} from './utils/workflow.utils'

type WorkflowLoadStatus = 'loading' | 'ready' | 'empty'

const MANUALLY_SELECTED_WORKFLOW_ID_KEY =
  'v6_requests_manually_selected_workflow_id'

const getManuallySelectedWorkflowId = (): string | null => {
  try {
    return sessionStorage.getItem(MANUALLY_SELECTED_WORKFLOW_ID_KEY)
  } catch {
    return null
  }
}

const setManuallySelectedWorkflowId = (id: string | number) => {
  try {
    sessionStorage.setItem(MANUALLY_SELECTED_WORKFLOW_ID_KEY, String(id))
  } catch {
    // ignore
  }
}

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
  const [viewMode, setViewMode] = useState<RequestViewMode>(
    storedState?.viewMode === 'table' ||
      storedState?.viewMode === 'grid' ||
      storedState?.viewMode === 'kanban'
      ? storedState.viewMode
      : 'grid',
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
  const listTotalsRef = useRef<{
    closed: number | null
    inbox: number | null
    sent: number | null
  }>({ closed: null, inbox: null, sent: null })

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
    viewMode === 'kanban' ? 'Kanban' : activeTab,
    filterClauses,
  )

  const syncListTabFromItem = (row: InboxItem) => {
    const listTab = row._listTab || activeTab
    if (
      listTab === 'Inbox' ||
      listTab === 'Exceptions' ||
      listTab === 'Sent' ||
      listTab === 'Closed' ||
      listTab === 'Processed'
    ) {
      setRequestListTab(listTab === 'Exceptions' ? 'Inbox' : listTab)
    }
  }

  const handleRowClick = (row: InboxItem, tab: string, missingFieldIds?: string[]) => {
    syncListTabFromItem(row)
    if (selectedWorkflow?.id) {
      openRequest(row, selectedWorkflow, tab, missingFieldIds)
    }
  }

  // --- 3. HANDLERS ---
  const handleWorkflowSelect = useCallback(
    (opt: Option | null | ((prev: Option | null) => Option | null)) => {
      setWorkflow((prev) => {
        const next = typeof opt === 'function' ? opt(prev) : opt
        if (next?.id) {
          setManuallySelectedWorkflowId(next.id)
        }
        return next
      })
    },
    [],
  )

  const loadWorkflowList = useCallback(async () => {
    setWorkflowLoadStatus('loading')
    const procurementOption: WorkflowOptionItem = {
      disabled: false,
      id: 'procurement',
      name: 'Procurement',
    }
    try {
      const { data, error } = await workflowsApiV6.getWorkflows()
      if (error) throw new Error(error)

      const publishedOptions = mapPublishedWorkflowListToOptions(data)
      const options = [...publishedOptions]
      if (!options.some((opt) => String(opt.id).toLowerCase() === 'procurement')) {
        options.push(procurementOption)
      }

      if (options.length > 0) {
        setAllWorkflow(options)

        // First published workflow is the default for initial load / login.
        // Procurement is an extra appended option and should never load by default on login.
        const defaultWorkflow =
          publishedOptions.length > 0 ? publishedOptions[0] : options[0]
        const userSelectedId = getManuallySelectedWorkflowId()

        let selectedOpt: Option = defaultWorkflow
        if (userSelectedId) {
          const match = options.find(
            (opt) => String(opt.id) === String(userSelectedId),
          )
          if (match) {
            selectedOpt = match
          }
        }

        setWorkflow(selectedOpt)
      } else {
        setAllWorkflow([procurementOption])
        setWorkflow(procurementOption)
        setSelectedWorkflow({
          flowJson: '',
          formJson: '',
          id: 'procurement',
          name: 'Procurement',
          wFormId: '',
        })
        setWorkflowLoadStatus('ready')
      }
      setIsLoading(false)
    } catch {
      setAllWorkflow([procurementOption])
      setWorkflow(procurementOption)
      setSelectedWorkflow({
        flowJson: '',
        formJson: '',
        id: 'procurement',
        name: 'Procurement',
        wFormId: '',
      })
      setWorkflowLoadStatus('ready')
      setIsLoading(false)
    }
  }, [])

  const applyInstanceCount = useCallback((raw?: any) => {
    const data =
      raw && typeof raw === 'object' && raw.inboxCount == null && raw.data
        ? raw.data
        : raw
    const listTotals = listTotalsRef.current
    setMetaData({
      completedCount: String(listTotals.closed ?? data?.completedCount ?? 0),
      inboxCount: String(listTotals.inbox ?? data?.inboxCount ?? 0),
      sentCount: String(listTotals.sent ?? data?.sentCount ?? 0),
    })
  }, [])

  const refreshInstanceCounts = useCallback(
    async (workflowId: string) => {
      const countRes = await workflowsApiV6.getInstanceCount(workflowId)
      if (countRes?.data) applyInstanceCount(countRes.data)
    },
    [applyInstanceCount],
  )

  const loadSelectedWorkflow = useCallback(
    async (workflowId: string, workflowName?: string) => {
      setWorkflowLoadStatus('loading')
      if (String(workflowId).toLowerCase() === 'procurement') {
        setSelectedWorkflow({
          flowJson: '',
          formJson: '',
          id: 'procurement',
          name: 'Procurement',
          wFormId: '',
        })
        setMetaData({
          completedCount: '0',
          inboxCount: '0',
          sentCount: '0',
        })
        setWorkflowLoadStatus('ready')
        setIsLoading(false)
        return
      }
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
          applyInstanceCount(countRes.data)
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
          try {
            const formRes = await formApi.getFormDataById(String(wFormId))
            if (formRes?.data) {
              formJson = formRes.data.formJson ?? formRes.data
            }
          } catch (e) {
            console.warn('Failed to fetch form schema for workflow', e)
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
      } catch (err) {
        console.error('Failed to load selected workflow', err)
        setSelectedWorkflow(null)
        setWorkflowLoadStatus('empty')
      } finally {
        setIsLoading(false)
      }
    },
    [applyInstanceCount, setRawWorflow],
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
        handleWorkflowSelect(match)
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

  const lastLoadedWorkflowIdRef = useRef<string | number | null>(null)

  // Workflow Change Listener
  useEffect(() => {
    const wfId = workflow?.id
    if (!wfId) return

    const isNew = String(wfId) !== String(lastLoadedWorkflowIdRef.current)

    if (isNew || reloadMeta) {
      lastLoadedWorkflowIdRef.current = wfId
      if (isNew) {
        listTotalsRef.current = { closed: null, inbox: null, sent: null }
        requestStore.getState().clearQuickFilters()
      }
      loadSelectedWorkflow(String(wfId), workflow.name)
      if (reloadMeta) {
        stopRefresh()
        refetch()
      }
    }
  }, [workflow, reloadMeta, loadSelectedWorkflow, stopRefresh, refetch])
  useEffect(() => {
    // No longer need to manually clear local state
  }, [isClosed])

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    setRequestListTab(tab) // Sync to store
    requestStore.getState().clearQuickFilters()
    setPage(1)

    // Only grouping for Inbox
    if (tab !== 'Inbox') {
      setGroupBy([])
    }

    const workflowId = selectedWorkflow?.id || workflow?.id
    if (workflowId) {
      void refreshInstanceCounts(String(workflowId))
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

  // Keep Inbox / Sent / Completed badges in sync with the list that just
  // loaded. instance-count is fetched on workflow load and tab change, but
  // the active tab's total from the list API is what the user is looking at.
  useEffect(() => {
    if (isFetching || inboxResult?.totalItems == null) return

    const value = String(inboxResult.totalItems)
    if (activeTab === 'Inbox') listTotalsRef.current.inbox = inboxResult.totalItems
    if (activeTab === 'Sent') listTotalsRef.current.sent = inboxResult.totalItems
    if (activeTab === 'Closed') {
      listTotalsRef.current.closed = inboxResult.totalItems
    }
    setMetaData((prev) => {
      const current = {
        completedCount: prev?.completedCount ?? '0',
        inboxCount: prev?.inboxCount ?? '0',
        sentCount: prev?.sentCount ?? '0',
      }
      if (activeTab === 'Inbox' && current.inboxCount !== value) {
        return { ...current, inboxCount: value }
      }
      if (activeTab === 'Sent' && current.sentCount !== value) {
        return { ...current, sentCount: value }
      }
      if (activeTab === 'Closed' && current.completedCount !== value) {
        return { ...current, completedCount: value }
      }
      return prev ?? current
    })
  }, [activeTab, inboxResult?.totalItems, isFetching])

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
      if (selectedWorkflow) {
        syncListTabFromItem(prevItem)
        openRequest(prevItem, selectedWorkflow, activeTab)
      }
    }
  }

  const onNext = () => {
    if (hasNext) {
      const nextItem = flatRows[selectedIndex + 1]
      if (selectedWorkflow) {
        syncListTabFromItem(nextItem)
        openRequest(nextItem, selectedWorkflow, activeTab)
      }
    }
  }

  const user = useAuthUserStore((s) => s.user)
  const session = useAuthUserStore((s) => s.session)

  const canCreateNewRequest = useMemo(() => {
    if (workflow?.id === 'procurement' || selectedWorkflow?.id === 'procurement') return false
    // AP workflows always allow "+ New Request"
    if (isAccountsPayable) return true

    if (!selectedWorkflow) return true

    const blocks = extractBlocks(selectedWorkflow)
    const startBlock = blocks.find(
      (b: any) => String(b.type || '').toUpperCase() === 'START',
    )

    if (!startBlock || !startBlock.settings) return true

    const settings = startBlock.settings
    const allowedUsers: string[] = Array.isArray(settings.users)
      ? settings.users
      : []

    // If users array exists and has entries, validate logged-in user ID
    if (allowedUsers.length > 0) {
      const currentUserId =
        session?.id ||
        (session as any)?.userId ||
        (typeof user?.id === 'string' ? user.id : null)

      if (!currentUserId) return false

      return allowedUsers.some(
        (u: any) =>
          String(u).toLowerCase() === String(currentUserId).toLowerCase(),
      )
    }

    return true
  }, [isAccountsPayable, selectedWorkflow, session, user])

  const isWorkflowReady =
    workflowLoadStatus === 'ready' && !!selectedWorkflow?.id
  const showWorkflowEmpty = workflowLoadStatus === 'empty'
  const inboxIsLoading =
    workflowLoadStatus === 'loading' ||
    (isWorkflowReady && isPending && !inboxResult)

  return (
    <>
      <div className='flex h-full min-h-0 w-full overflow-hidden'>
        <div className='flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden'>
          {!selectedItem && (
            <Header
              // Pass state and setter to Header
              activeTab={activeTab}
              allWorkflows={allWorkflow}
              exceptionsCount={inboxResult?.exceptionsCount}
              hideListTabs={viewMode === 'kanban' || workflow?.id === 'procurement'}
              isAccountsPayable={isAccountsPayable}
              isLoading={isLoading}
              metaData={metaData}
              workflow={workflow}
              actionButtons={
                canCreateNewRequest
                  ? [
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
                    ]
                  : []
              }
              setActiveTab={handleTabChange}
              setWorkflow={handleWorkflowSelect}
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
            (workflow?.id === 'procurement' ? (
              <div className='flex h-full w-full flex-1 overflow-hidden border-0'>
                <iframe
                  allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
                  className='h-full w-full border-0'
                  src='https://arasuezofis-pr-agent.hf.space/'
                  title='Procurement'
                />
              </div>
            ) : showWorkflowEmpty ? (
              <PageEmptyState page='requests' variant='unavailable' />
            ) : (
              <InboxList
                activeTab={activeTab}
                canCreateNewRequest={canCreateNewRequest}
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
