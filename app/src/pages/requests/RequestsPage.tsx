import { useLingui } from '@lingui/react/macro'
import { useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { V6SearchFilterClause } from '@/api/v6/workflows'
import type { Option } from '@/types/option'
import formApi from '@/api/form/form'
import requestApi from '@/api/requests/requests'
import workflowsApiV6, {
  mapPublishedWorkflowListToOptions,
  type V6FilterField,
  type WorkflowOptionItem,
} from '@/api/v6/workflows'
import {
  connectWatchFox,
  getMailboxes,
  WATCHFOX_CONFIG,
} from '@/api/emailIngest'
import Icon from '@/components/base/icon/Icon'
import PageEmptyState from '@/components/common/PageEmptyState'
import showToast from '@/components/base/toast/showToast'
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

const isAccountsPayableWorkflowName = (name: string) =>
  name.trim().toLowerCase().includes('accounts payable')

const findAccountsPayableOption = (options: WorkflowOptionItem[]) =>
  options.find((opt) => isAccountsPayableWorkflowName(String(opt.name || '')))

const wait = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

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

  // The Requests-page tabs configured for this workflow (Workflow Settings
  // -> Request Views). Only the first 3 (by position) are wired to real
  // data - they map positionally to the Inbox/Sent/Completed (or
  // Invoices/Exceptions/Processed for AP) buckets regardless of their
  // custom label. Anything beyond that has no data source yet. An empty
  // config means "unconfigured" - fall back to the historical defaults.
  const requestTabs = useMemo(() => {
    const bucketKeys = isAccountsPayable
      ? ['Inbox', 'Exceptions', 'Processed']
      : ['Inbox', 'Sent', 'Closed']
    const defaultLabels = isAccountsPayable
      ? [t`Invoices`, t`Exceptions`, t`Processed`]
      : [t`Inbox`, t`Sent`, t`Completed`]

    const raw = rawWorkflowData?.workflowJson?.settings?.general?.requestTabs
    const configured = Array.isArray(raw) ? raw : []

    if (!configured.length) {
      return bucketKeys.map((value, index) => ({
        label: defaultLabels[index],
        value,
      }))
    }

    return configured.map((tabConfig: any, index: number) => ({
      label:
        String(tabConfig?.label || '').trim() ||
        defaultLabels[index] ||
        `Tab ${index + 1}`,
      value:
        index < bucketKeys.length
          ? bucketKeys[index]
          : `custom-${tabConfig?.id ?? index}`,
    }))
  }, [rawWorkflowData, isAccountsPayable, t])

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

  const [filterFields, setFilterFields] = useState<V6FilterField[]>([])
  const [isFilterFieldsLoaded, setIsFilterFieldsLoaded] = useState(false)

  useEffect(() => {
    setIsFilterFieldsLoaded(false)
    if (selectedWorkflow?.id) {
      workflowsApiV6
        .getFilterFields(String(selectedWorkflow.id))
        .then((res) => {
          if (res.data?.fields) {
            setFilterFields(res.data.fields)
          }
        })
        .finally(() => {
          setIsFilterFieldsLoaded(true)
        })
    } else {
      setFilterFields([])
      setIsFilterFieldsLoaded(true)
    }
  }, [selectedWorkflow?.id])

  const tabStageConfig = useMemo(() => {
    const general = rawWorkflowData?.workflowJson?.settings?.general
    const configuredTabs = Array.isArray(general?.requestTabs)
      ? general.requestTabs
      : []

    const isStageBased =
      general?.isStageBased === 1 ||
      general?.isStageBased === true ||
      configuredTabs.some(
        (t: any) => Array.isArray(t?.nodeIds) && t.nodeIds.length > 0,
      )

    if (!isStageBased) {
      return { isStageBased: false, nodeIds: [] }
    }

    let matchedTab = configuredTabs.find(
      (t: any) =>
        t?.id === activeTab ||
        String(t?.label || '').toLowerCase() === activeTab.toLowerCase(),
    )

    if (!matchedTab && configuredTabs.length > 0) {
      const index =
        activeTab === 'Inbox' || activeTab === 'Invoices'
          ? 0
          : activeTab === 'Sent' || activeTab === 'Exceptions'
            ? 1
            : activeTab === 'Closed' || activeTab === 'Completed' || activeTab === 'Processed'
              ? 2
              : -1
      if (index >= 0 && configuredTabs[index]) {
        matchedTab = configuredTabs[index]
      }
    }

    const nodeIds = Array.isArray(matchedTab?.nodeIds)
      ? matchedTab.nodeIds.map(String).filter(Boolean)
      : []

    return {
      isStageBased: true,
      nodeIds,
    }
  }, [rawWorkflowData, activeTab])

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
    filterFields,
    tabStageConfig,
  )

  const activeTabLabel = useMemo(() => {
    const match = requestTabs.find(
      (t) => t.value === activeTab || t.label === activeTab,
    )
    return match?.label || activeTab
  }, [requestTabs, activeTab])

  useEffect(() => {
    if (activeTabLabel) {
      setRequestListTab(activeTabLabel)
    }
  }, [activeTabLabel, setRequestListTab])

  const syncListTabFromItem = (row: InboxItem) => {
    const rawTab = row._listTab || activeTab
    const match = requestTabs.find(
      (t) => t.value === rawTab || t.label === rawTab,
    )
    const label = match?.label || activeTabLabel || rawTab
    setRequestListTab(label)
  }

  const handleRowClick = (
    row: InboxItem,
    tab: string,
    missingFieldIds?: string[],
  ) => {
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
    const preferAccountsPayable = requestStore.getState().pendingOpenNewRequest
    try {
      const { data, error } = await workflowsApiV6.getWorkflows()
      if (error) throw new Error(error)

      let publishedOptions = mapPublishedWorkflowListToOptions(data)
      let accountsPayableOption = findAccountsPayableOption(publishedOptions)

      // The workflow created during onboarding can lag the first list response.
      // Keep loading until Accounts Payable is present, then open the upload page.
      if (preferAccountsPayable && !accountsPayableOption) {
        for (let attempt = 0; attempt < 8; attempt += 1) {
          await wait(1000)
          const retry = await workflowsApiV6.getWorkflows()
          if (retry.error || !retry.data) continue
          publishedOptions = mapPublishedWorkflowListToOptions(retry.data)
          accountsPayableOption = findAccountsPayableOption(publishedOptions)
          if (accountsPayableOption) break
        }
      }

      const options = [...publishedOptions]
      if (
        !options.some((opt) => String(opt.id).toLowerCase() === 'procurement')
      ) {
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
        if (preferAccountsPayable && accountsPayableOption) {
          selectedOpt = accountsPayableOption
        } else if (userSelectedId) {
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


  const [stageTabCounts, setStageTabCounts] = useState<Record<string, number>>({})
  const [totalStageCount, setTotalStageCount] = useState<number | null>(null)

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

  const fetchStageCounts = useCallback(
    async (workflowId: string, wfDetailOverride?: any) => {
      const wfDetail = wfDetailOverride || rawWorkflowData
      const general = wfDetail?.workflowJson?.settings?.general
      const configuredTabs = Array.isArray(general?.requestTabs)
        ? general.requestTabs
        : []

      const isStageBased =
        general?.isStageBased === 1 ||
        general?.isStageBased === true ||
        configuredTabs.some(
          (t: any) => Array.isArray(t?.nodeIds) && t.nodeIds.length > 0,
        )

      if (!isStageBased || configuredTabs.length === 0) {
        setStageTabCounts({})
        setTotalStageCount(null)
        return
      }

      const allActivityIds: string[] = []
      configuredTabs.forEach((t: any) => {
        if (Array.isArray(t?.nodeIds)) {
          t.nodeIds.forEach((id: any) => {
            const strId = String(id).trim()
            if (strId && !allActivityIds.includes(strId)) {
              allActivityIds.push(strId)
            }
          })
        }
      })

      if (allActivityIds.length === 0) {
        setStageTabCounts({})
        setTotalStageCount(0)
        return
      }

      try {
        const countRes = await workflowsApiV6.getWorkflowsByActivityCounts(
          workflowId,
          allActivityIds,
        )
        if (countRes.data) {
          const itemsMap: Record<string, number> = {}
          ;(countRes.data.items || []).forEach((item) => {
            itemsMap[item.activityId] = item.count || 0
          })

          const bucketKeys = isAccountsPayable
            ? ['Inbox', 'Exceptions', 'Processed']
            : ['Inbox', 'Sent', 'Closed']

          const newCounts: Record<string, number> = {}
          configuredTabs.forEach((tabConfig: any, index: number) => {
            const nodeIds = Array.isArray(tabConfig?.nodeIds)
              ? tabConfig.nodeIds.map(String).filter(Boolean)
              : []
            const sum = nodeIds.reduce(
              (acc: number, id: string) => acc + (itemsMap[id] || 0),
              0,
            )

            if (tabConfig?.id) newCounts[tabConfig.id] = sum
            if (tabConfig?.label) newCounts[tabConfig.label] = sum

            if (index < bucketKeys.length) {
              newCounts[bucketKeys[index]] = sum
            }
          })

          setStageTabCounts(newCounts)
          setTotalStageCount(countRes.data.fullCount ?? 0)
        }
      } catch (err) {
        console.error('Error fetching stage activity counts', err)
      }
    },
    [rawWorkflowData, isAccountsPayable],
  )

  const refreshInstanceCounts = useCallback(
    async (workflowId: string, wfDetailOverride?: any) => {
      const countRes = await workflowsApiV6.getInstanceCount(workflowId)
      if (countRes?.data) applyInstanceCount(countRes.data)
      await fetchStageCounts(workflowId, wfDetailOverride)
    },
    [applyInstanceCount, fetchStageCounts],
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
        void fetchStageCounts(workflowId, wf)

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

    const workflowId = selectedWorkflow?.id || workflow?.id
    if (workflowId) {
      void refreshInstanceCounts(String(workflowId))
    }
  }

  // Sync initial tab
  useEffect(() => {
    setRequestListTab(activeTab)
  }, [])

  // If the configured tab list changes (workflow switch, or its Request
  // Views setting changed) while a tab that's no longer in the list is
  // active, fall back to the first configured tab.
  useEffect(() => {
    const validValues = requestTabs.map((tab) => tab.value)
    if (validValues.length && !validValues.includes(activeTab)) {
      handleTabChange(validValues[0])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestTabs])

  // Keep Inbox / Sent / Completed badges in sync with the list that just
  // loaded. instance-count is fetched on workflow load and tab change, but
  // the active tab's total from the list API is what the user is looking at.
  useEffect(() => {
    if (isFetching || inboxResult?.totalItems == null) return

    const value = String(inboxResult.totalItems)
    if (activeTab === 'Inbox')
      listTotalsRef.current.inbox = inboxResult.totalItems
    if (activeTab === 'Sent')
      listTotalsRef.current.sent = inboxResult.totalItems
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

  // Open the AP invoice upload only after the Accounts Payable workflow
  // from the list has finished loading. Opening earlier renders the generic
  // request sheet against an empty workflow ("no form configured").
  useEffect(() => {
    if (!pendingOpenNewRequest) return

    const loadedWorkflowId = rawWorkflowData?.id
    const selectedWorkflowId = workflow?.id
    const accountsPayableReady =
      workflowLoadStatus === 'ready' &&
      isAccountsPayable &&
      !!selectedWorkflowId &&
      !!loadedWorkflowId &&
      String(loadedWorkflowId) === String(selectedWorkflowId)

    if (!accountsPayableReady) {
      if (requestStore.getState().newRequest) {
        requestStore.getState().closeNewRequest()
      }
      return
    }

    openNewRequest('request')
    setPendingOpenNewRequest(false)
  }, [
    pendingOpenNewRequest,
    workflowLoadStatus,
    isAccountsPayable,
    rawWorkflowData,
    workflow?.id,
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
    if (
      workflow?.id === 'procurement' ||
      selectedWorkflow?.id === 'procurement'
    )
      return false
    // AP workflows always allow "+ New"
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
  }, [isAccountsPayable, selectedWorkflow, session, user, workflow?.id])

  const isRfqWorkflow = useMemo(() => {
    const currentWfId = String(
      workflow?.id || selectedWorkflow?.id || rawWorkflowData?.id || '',
    ).toLowerCase()
    const currentWfName = String(
      workflow?.name ||
        (workflow as any)?.label ||
        selectedWorkflow?.name ||
        rawWorkflowData?.name ||
        rawWorkflowData?.workflowJson?.name ||
        rawWorkflowData?.workflowJson?.settings?.general?.name ||
        '',
    ).toLowerCase()

    return (
      currentWfId === WATCHFOX_CONFIG.workflowId.toLowerCase() ||
      currentWfName.includes('rfq')
    )
  }, [
    workflow?.id,
    workflow?.name,
    (workflow as any)?.label,
    selectedWorkflow?.id,
    selectedWorkflow?.name,
    rawWorkflowData,
  ])

  const canShowWatchEmail = Boolean(isRfqWorkflow && canCreateNewRequest)

  const [isConnectingWatchEmail, setIsConnectingWatchEmail] = useState(false)
  const [connectedWatchEmail, setConnectedWatchEmail] = useState<string | null>(
    () => {
      try {
        const stored = localStorage.getItem('v6_watchfox_connected_email')
        if (stored) return stored
        const info = localStorage.getItem('v6_watchfox_connection_info')
        if (info) {
          const parsed = JSON.parse(info)
          return parsed?.email || null
        }
        return null
      } catch {
        return null
      }
    },
  )

  // On mount or workflow change: if watch email can be shown and not yet in local state, check server
  useEffect(() => {
    if (!canShowWatchEmail || connectedWatchEmail) return
    let cancelled = false
    getMailboxes()
      .then((res) => {
        if (cancelled) return
        const list = res.payload || []
        const currentWfId = String(
          workflow?.id || selectedWorkflow?.id || WATCHFOX_CONFIG.workflowId,
        ).toLowerCase()
        const match = list.find(
          (m) =>
            (String(m.workflowId).toLowerCase() === currentWfId ||
              String(m.workflowId).toLowerCase() ===
                WATCHFOX_CONFIG.workflowId.toLowerCase() ||
              m.isEnabled) &&
            Boolean(m.externalAccountEmail),
        )
        if (match?.externalAccountEmail) {
          setConnectedWatchEmail(match.externalAccountEmail)
          try {
            localStorage.setItem(
              'v6_watchfox_connected_email',
              match.externalAccountEmail,
            )
          } catch {
            // ignore
          }
        }
      })
      .catch(() => {
        // ignore
      })
    return () => {
      cancelled = true
    }
  }, [
    canShowWatchEmail,
    connectedWatchEmail,
    workflow?.id,
    selectedWorkflow?.id,
  ])

  const handleConnectWatchEmail = useCallback(async () => {
    if (isConnectingWatchEmail) return
    setIsConnectingWatchEmail(true)
    // Pre-open tab synchronously on user action to prevent browser popup blockers
    const newWindow =
      typeof window !== 'undefined'
        ? window.open('about:blank', '_blank')
        : null
    try {
      const targetWfId = String(
        workflow?.id || selectedWorkflow?.id || WATCHFOX_CONFIG.workflowId,
      )
      const data = await connectWatchFox({ workflowId: targetWfId })
      const targetUrl = data?.url || (data as any)?.data?.url
      if (targetUrl) {
        if (newWindow) {
          newWindow.location.href = targetUrl
        } else {
          window.open(targetUrl, '_blank')
        }
        setIsConnectingWatchEmail(false)
      } else {
        if (newWindow) newWindow.close()
        showToast({
          message: t`Failed to obtain sign-in URL from server.`,
          variant: 'error',
        })
        setIsConnectingWatchEmail(false)
      }
    } catch (err: any) {
      if (newWindow) newWindow.close()
      console.error('[WatchFox] Connect error:', err)
      const errorMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        t`Failed to connect watch email.`
      showToast({
        message: String(errorMsg),
        variant: 'error',
      })
      setIsConnectingWatchEmail(false)
    }
  }, [isConnectingWatchEmail, t])

  const [watchFoxSuccessState, setWatchFoxSuccessState] = useState<{
    isSuccess: boolean
    email: string
    connectionId: string
    watchId: string
  } | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const params = new URLSearchParams(window.location.search)
      if (params.get('status') === 'connected') {
        const initialEmail =
          params.get('email') ||
          params.get('accountEmail') ||
          params.get('mailboxEmail') ||
          params.get('account') ||
          params.get('user') ||
          session?.email ||
          user?.email ||
          ''
        return {
          isSuccess: true,
          email: initialEmail,
          connectionId: params.get('connectionId') || '',
          watchId: params.get('watchId') || '',
        }
      }
    } catch {
      // ignore
    }
    return null
  })

  // Handle WatchFox post-sign-in redirect (?status=connected / ?status=error)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const status = params.get('status')
    if (!status) return

    if (status === 'connected') {
      const connectionId = params.get('connectionId') || ''
      const watchId = params.get('watchId') || ''
      const initialEmail =
        params.get('email') ||
        params.get('accountEmail') ||
        params.get('mailboxEmail') ||
        params.get('account') ||
        params.get('user')

      let cancelled = false
      const applyConnectedState = async () => {
        let accountEmail = initialEmail
        if (!accountEmail) {
          try {
            const res = await getMailboxes()
            const list = res.payload || []
            const match = list.find(
              (m) =>
                (m.workflowId === WATCHFOX_CONFIG.workflowId || m.isEnabled) &&
                Boolean(m.externalAccountEmail),
            )
            if (match?.externalAccountEmail) {
              accountEmail = match.externalAccountEmail
            }
          } catch {
            // ignore
          }
        }
        if (!accountEmail) {
          accountEmail = session?.email || user?.email || ''
        }

        if (cancelled) return

        try {
          localStorage.setItem('v6_watchfox_connected_email', accountEmail)
          localStorage.setItem('v6_watchfox_connected_time', String(Date.now()))
          localStorage.setItem(
            'v6_watchfox_connection_info',
            JSON.stringify({
              connectionId,
              watchId,
              email: accountEmail,
              connectedAt: Date.now(),
            }),
          )
        } catch {
          // ignore
        }

        setConnectedWatchEmail(accountEmail)
        setWatchFoxSuccessState({
          isSuccess: true,
          email: accountEmail,
          connectionId,
          watchId,
        })

        // 1. BroadcastChannel for cross-tab sync even if opener was severed
        try {
          const bc = new BroadcastChannel('ezofis_watchfox_channel')
          bc.postMessage({
            type: 'WATCHFOX_CONNECTED',
            accountEmail,
            connectionId,
            watchId,
          })
          setTimeout(() => {
            try {
              bc.close()
            } catch {
              // ignore
            }
          }, 500)
        } catch {
          // ignore
        }

        // 2. Opener window postMessage
        try {
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage(
              {
                type: 'WATCHFOX_CONNECTED',
                accountEmail,
                connectionId,
                status: 'connected',
                watchId,
              },
              '*',
            )
          }
        } catch {
          // ignore
        }

        // 3. Success toast
        showToast({
          message: t`Connected with ${accountEmail}`,
          variant: 'success',
        })
        console.info('[WatchFox] Mailbox connected successfully:', {
          accountEmail,
          connectionId,
          watchId,
        })

        // 4. Automatically close the callback tab
        setTimeout(() => {
          try {
            window.close()
          } catch {
            // ignore
          }
        }, 1800)
      }

      void applyConnectedState()
      return () => {
        cancelled = true
      }
    } else if (status === 'error') {
      const errorMsg =
        params.get('error') ||
        params.get('message') ||
        t`Sign-in or watch creation failed.`
      showToast({
        message: String(errorMsg),
        variant: 'error',
      })
      console.error('[WatchFox] Connection error:', errorMsg)

      try {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(
            {
              type: 'WATCHFOX_ERROR',
              error: errorMsg,
              status: 'error',
            },
            '*',
          )
        }
      } catch {
        // ignore
      }
    }

    // Clean up query parameters from browser address bar
    const cleanUrl = new URL(window.location.href)
    cleanUrl.searchParams.delete('status')
    cleanUrl.searchParams.delete('connectionId')
    cleanUrl.searchParams.delete('watchId')
    cleanUrl.searchParams.delete('tenantId')
    cleanUrl.searchParams.delete('workflowId')
    cleanUrl.searchParams.delete('email')
    cleanUrl.searchParams.delete('accountEmail')
    cleanUrl.searchParams.delete('mailboxEmail')
    cleanUrl.searchParams.delete('account')
    cleanUrl.searchParams.delete('error')
    cleanUrl.searchParams.delete('message')
    window.history.replaceState(
      {},
      '',
      cleanUrl.pathname + (cleanUrl.search ? cleanUrl.search : ''),
    )
  }, [session?.email, t, user?.email])

  // Multi-channel cross-tab sync: listen for connection events across all channels
  useEffect(() => {
    if (typeof window === 'undefined') return

    const updateEmail = (email: string) => {
      if (!email) return
      setConnectedWatchEmail(email)
      showToast({
        message: t`Connected with ${email}`,
        variant: 'success',
      })
    }

    // Channel 1: BroadcastChannel
    let bc: BroadcastChannel | null = null
    try {
      bc = new BroadcastChannel('ezofis_watchfox_channel')
      bc.onmessage = (event) => {
        if (
          event.data?.type === 'WATCHFOX_CONNECTED' &&
          event.data.accountEmail
        ) {
          updateEmail(event.data.accountEmail)
        }
      }
    } catch {
      // BroadcastChannel not available in environment
    }

    // Channel 2: window.postMessage (from popup opener)
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'WATCHFOX_CONNECTED') {
        const accountEmail =
          event.data.accountEmail ||
          session?.email ||
          user?.email ||
          ''
        updateEmail(accountEmail)
      }
    }

    // Channel 3: localStorage storage event
    const handleStorage = (event: StorageEvent) => {
      if (
        (event.key === 'v6_watchfox_connected_email' ||
          event.key === 'v6_watchfox_connected_time') &&
        event.newValue
      ) {
        const stored =
          localStorage.getItem('v6_watchfox_connected_email') ||
          event.newValue
        if (stored) {
          updateEmail(stored)
        }
      }
    }

    // Channel 4: window focus & tab visibility change
    const handleFocus = () => {
      const stored = localStorage.getItem('v6_watchfox_connected_email')
      if (stored && stored !== connectedWatchEmail) {
        updateEmail(stored)
      }
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleFocus()
      }
    }

    window.addEventListener('message', handleMessage)
    window.addEventListener('storage', handleStorage)
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      try {
        bc?.close()
      } catch {
        // ignore
      }
      window.removeEventListener('message', handleMessage)
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [connectedWatchEmail, session?.email, t, user?.email])

  const headerActionButtons = useMemo(() => {
    const buttons = []

    // Only show "Connect Email Watch" button if RFQ workflow, user has access to New, and not yet connected
    if (canShowWatchEmail && !connectedWatchEmail) {
      buttons.push({
        color: 'primary',
        disabled: isConnectingWatchEmail,
        icon: 'tabler:mail',
        id: 'connect-email-watch',
        label: t`Connect Email Watch`,
        loading: isConnectingWatchEmail,
        variant: 'outline',
        onClick: handleConnectWatchEmail,
      })
    }

    if (canCreateNewRequest) {
      buttons.push({
        color: 'primary',
        icon: 'tabler:plus',
        id: 'new-request',
        label: t`New`,
        variant: 'solid',
        onClick: () => {
          console.log('am running')
          openNewRequest('request')
        },
      })
    }

    return buttons
  }, [
    canCreateNewRequest,
    canShowWatchEmail,
    connectedWatchEmail,
    handleConnectWatchEmail,
    isConnectingWatchEmail,
    openNewRequest,
    t,
  ])



  const isWorkflowReady =
    workflowLoadStatus === 'ready' && !!selectedWorkflow?.id
  const showWorkflowEmpty = workflowLoadStatus === 'empty'
  const inboxIsLoading =
    workflowLoadStatus === 'loading' ||
    (isWorkflowReady && isPending && !inboxResult)

  if (watchFoxSuccessState?.isSuccess) {
    return (
      <div className='flex h-screen w-full items-center justify-center bg-[var(--surface-primary,#f8fafc)] p-6'>
        <div className='animate-in fade-in zoom-in-95 flex w-full max-w-md flex-col items-center rounded-2xl border border-green-4 bg-surface p-8 text-center shadow-2xl duration-300'>
          <div className='mb-4 flex size-16 items-center justify-center rounded-full bg-green-2 text-green-9 ring-8 ring-green-1'>
            <Icon name='tabler:circle-check-filled' className='size-10 text-green-9' />
          </div>
          <h2 className='text-xl font-bold tracking-tight text-gray-13'>
            {t`Connected Successfully!`}
          </h2>
          <p className='mt-2 text-14 text-gray-11'>
            {t`Your mailbox has been connected and the enquiry watch is active.`}
          </p>
          <div className='mt-4 flex items-center gap-2 rounded-lg border border-green-4 bg-green-2 px-3.5 py-1.5 text-13 font-semibold text-green-12 shadow-2xs'>
            <Icon name='tabler:mail-check' className='size-4 text-green-9' />
            <span>{watchFoxSuccessState.email}</span>
          </div>
          <p className='mt-5 text-12 text-gray-10'>
            {t`This tab will close automatically...`}
          </p>
          <button
            type='button'
            className='mt-4 inline-flex cursor-pointer items-center justify-center rounded-lg bg-[var(--primary-9,#2563eb)] px-6 py-2.5 text-13 font-semibold text-white shadow-sm transition-all hover:bg-[var(--primary-10,#1d4ed8)] active:scale-95'
            onClick={() => window.close()}
          >
            {t`Close Tab`}
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className='flex h-full min-h-0 w-full overflow-hidden'>
        <div className='flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden'>
          {!selectedItem && (
            <Header
              // Pass state and setter to Header
              activeTab={activeTab}
              allWorkflows={allWorkflow}
              connectedWatchEmail={
                canShowWatchEmail ? connectedWatchEmail : null
              }
              exceptionsCount={inboxResult?.exceptionsCount}
              isLoading={isLoading}
              metaData={metaData}
              onReconnectWatchEmail={
                canShowWatchEmail ? handleConnectWatchEmail : undefined
              }
              stageCounts={stageTabCounts}
              tabs={requestTabs}
              totalStageCount={totalStageCount}
              workflow={workflow}
              actionButtons={headerActionButtons}
              hideListTabs={
                viewMode === 'kanban' || workflow?.id === 'procurement'
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
              key={selectedItem.processId || selectedItem.id}
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
                filterFields={filterFields}
                isFilterFieldsLoaded={isFilterFieldsLoaded}
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
                onRefresh={() => {
                  refetch()
                  const wfId = selectedWorkflow?.id || workflow?.id
                  if (wfId) {
                    void refreshInstanceCounts(String(wfId))
                  }
                }}
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
