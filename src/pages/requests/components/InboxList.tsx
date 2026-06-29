import React, { useMemo } from 'react'
import DataTable from '@/components/base/data-table/DataTable'
import useDataTable from '@/components/base/data-table/hooks/useDataTable'
import useDataTableState from '@/components/base/data-table/hooks/useDataTableState'
import Pagination from '@/components/base/pagination/Pagination'
import type { TableGroup, WorkflowOption } from '../types'
import requestStore from '../stores/useRequestStore'
import { useDynamicColumns } from './columns/useDynamicColumns'
import GridView from './GridView'
import QuickFilters from './QuickFilters'
// import TableActionBar, { type TableActionButton } from '@/components/base/data-table/TableActionBar'
// import { getGroupedRowModel } from '@tanstack/react-table'

interface InboxListProps {
  data: TableGroup[]
  isLoading: boolean
  isRefetching: boolean
  page: number
  pageSize: number
  selectedItem: any
  totalItems: number
  viewMode: 'table' | 'grid'
  workflow: WorkflowOption | null
  activeTab?: string
  setPage: (p: number) => void
  setPageSize: (s: number) => void
  onGroupByChange?: (groups: string[]) => void
  onRefresh: () => void
  onRowClick: (item: any, tab: string) => void
}

// ✅ robust flattener for your backend shape (group.items)
function flattenRows(groups: any[]): any[] {
  const out: any[] = []

  const walk = (node: any) => {
    if (!node) return

    // Your shape: group has items: []
    if (Array.isArray(node.items)) {
      out.push(...node.items)
    }

    // Future-proof: some APIs use value/rows
    if (Array.isArray(node.value)) {
      out.push(...node.value)
    }
    if (Array.isArray(node.rows)) {
      out.push(...node.rows)
    }

    // Nested groups (if any)
    if (Array.isArray(node.children)) {
      node.children.forEach(walk)
    }
    if (Array.isArray(node.groups)) {
      node.groups.forEach(walk)
    }
  }

  ;(groups || []).forEach(walk)
  return out
}

const getParsedFormData = (row: any): any => {
  if (!row?.formData) return {}
  if (typeof row.formData === 'object') {
    return row.formData.fields || row.formData || {}
  }
  if (typeof row.formData === 'string') {
    try {
      const parsed = JSON.parse(row.formData)
      return parsed.fields || parsed || {}
    } catch {
      return {}
    }
  }
  return {}
}

const extractDueDate = (row: any): string => {
  if (!row) return '-'
  const agentData = row._agentData?.[0] || row._agentData || {}
  const parsedForm = getParsedFormData(row)

  let val =
    parsedForm['Due Date'] ||
    parsedForm['due_date'] ||
    parsedForm['Due_Date'] ||
    row.dueDate ||
    row.due_date ||
    row.payment_terms?.due_date ||
    row.paymentTerms?.due_date ||
    row.paymentTerms?.dueDate ||
    row.formData?.fields?.['Due Date'] ||
    row.formData?.fields?.['due_date'] ||
    row.formData?.fields?.['Due_Date'] ||
    row.formData?.['Due Date'] ||
    row.formData?.['due_date'] ||
    row.formData?.['Due_Date'] ||
    agentData?.payment_terms?.due_date ||
    agentData?.['Extracted Invoice JSON']?.invoice_header?.['Due Date'] ||
    agentData?.['Extracted Invoice JSON']?.invoice_header?.['due_date'] ||
    agentData?.po_matching?.due_date

  if ((!val || val === '-') && parsedForm['9F6tPVHoRnmONGx3kYJu2']) {
    const invDateStr = parsedForm['9F6tPVHoRnmONGx3kYJu2']
    const termsStr = parsedForm['vxnKCXsXkz8_acPogKe'] || ''
    const numMatch = /\d+/.exec(termsStr)
    if (numMatch) {
      const days = Number.parseInt(numMatch[0], 10)
      try {
        const d = new Date(invDateStr)
        if (!Number.isNaN(d.getTime())) {
          d.setDate(d.getDate() + days)
          val = d.toISOString().split('T')[0]
        }
      } catch (error) {
        console.debug('Failed to parse date fallback:', error)
      }
    }
  }

  if (!val || val === '-') return '-'
  return String(val)
}

const isOverdue = (row: any) => {
  const dueDateStr = extractDueDate(row)
  if (!dueDateStr || dueDateStr === '-') return false
  try {
    const dueDate = new Date(dueDateStr)
    if (Number.isNaN(dueDate.getTime())) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    dueDate.setHours(0, 0, 0, 0)
    return dueDate < today
  } catch {
    return false
  }
}

const extractAmountStr = (val: any): string | null => {
  if (val == null) return null
  let actualVal = val
  if (typeof val === 'object') {
    actualVal =
      val['Invoice Value'] || val['InvoiceValue'] || val['value'] || val['val']
  }
  if (actualVal == null) return null
  const str = String(actualVal).trim()
  return str !== '' && str !== '-' ? str : null
}

const searchInvoiceAmountInObj = (obj: any): string | null => {
  if (!obj || typeof obj !== 'object') return null

  const directKeys = [
    'suyqsm0SYii_8vsj4p0c_',
    'WksH1Mrs42X4J9AHgoBtw',
    'Invoice Amount',
    'Invoice Amount Value',
    'Invoice No',
    'Invoice No.',
    'Invoice Number',
    'Invoice_No',
    'Invoice_Number',
    'InvoiceNo',
    'InvoiceNumber',
    'PO Amount',
    'PO_Amount',
    'POAmount',
    'Invoice Value',
    'PO Value',
    'Amount',
    'total',
    'amount',
  ]
  for (const key of directKeys) {
    const extracted = extractAmountStr(obj[key])
    if (extracted !== null) return extracted
  }

  for (const key of Object.keys(obj)) {
    const k = key
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim()
    if (
      k === 'invoiceamount' ||
      k === 'totalamount' ||
      k === 'amount' ||
      k === 'total' ||
      k === 'suyqsm0syii8vsj4p0c' ||
      k === 'wksh1mrs42x4j9ahgobtw'
    ) {
      const extracted = extractAmountStr(obj[key])
      if (extracted !== null) return extracted
    }
  }
  return null
}

const findInvoiceAmount = (row: any): string | null => {
  if (!row) return null
  const parsedForm = getParsedFormData(row)

  const fromForm = searchInvoiceAmountInObj(parsedForm)
  if (fromForm) return fromForm

  const agentData =
    row._agentResponse || row._agentData?.[0] || row._agentData || {}
  const fromAgent = searchInvoiceAmountInObj(agentData)
  if (fromAgent) return fromAgent

  const invoiceHeader = agentData?.['Extracted Invoice JSON']?.invoice_header
  if (invoiceHeader) {
    const fromHeader = searchInvoiceAmountInObj(invoiceHeader)
    if (fromHeader) return fromHeader
  }

  const poMatching = agentData?.po_matching
  if (poMatching) {
    const fromPO = searchInvoiceAmountInObj(poMatching)
    if (fromPO) return fromPO
  }

  return null
}

const InboxList: React.FC<InboxListProps> = ({
  activeTab,
  data,
  isLoading,
  isRefetching,
  page,
  pageSize,
  selectedItem,
  totalItems,
  viewMode,
  workflow,
  setPage,
  setPageSize,
  onGroupByChange,
  onRefresh,
  onRowClick,
}) => {
  const openNewRequest = requestStore((state) => state.openNewRequest)
  const columns =
    useDynamicColumns(workflow, onRowClick, selectedItem, activeTab) || []

  const initialVisibilityState = {
    createdAt: false,
    createdBy: false,
    updatedAt: false,
    updatedBy: false,
  }

  const {
    expandState,
    groupState,
    searchState,
    sortState,
    setExpandState,
    ...rest
  } = useDataTableState({
    initialVisibilityState,
  })

  // ✅ Sync groupState with parent
  React.useEffect(() => {
    if (onGroupByChange) {
      onGroupByChange(groupState)
    }
  }, [groupState, onGroupByChange])

  // ✅ Use your actual API shape: data[0].items etc.
  const flatRows = useMemo(() => flattenRows(data as any), [data])

  const activeQuickFilters = requestStore((state) => state.activeQuickFilters)

  const counts = useMemo(() => {
    let overdue = 0
    let matched = 0
    let discrepancies = 0
    let highValue = 0

    flatRows.forEach((row) => {
      if (isOverdue(row)) overdue++

      const parsedForm = getParsedFormData(row)
      const agentData =
        row._agentResponse || row._agentData?.[0] || row._agentData || {}
      const rawDecision = String(
        parsedForm['2MH_BMDFEVKsU0uAQjoI1'] ||
          agentData?.decision ||
          row.decision ||
          row.status ||
          '',
      ).toUpperCase()

      if (rawDecision === 'APPROVED' || rawDecision === 'MATCHED') {
        matched++
      }

      if (
        rawDecision === 'PARTIALLY APPROVED' ||
        rawDecision === 'REJECTED' ||
        rawDecision === 'NO MATCH' ||
        row.isDuplicateInvoice === true
      ) {
        discrepancies++
      }

      const amtStr = findInvoiceAmount(row)
      const amount = amtStr ? Number(amtStr.replace(/[^0-9.-]/g, '')) : 0
      if (amount >= 10000) {
        highValue++
      }
    })

    return { discrepancies, highValue, matched, overdue }
  }, [flatRows])

  const quickFilteredRows = useMemo(() => {
    if (activeTab !== 'Inbox' || activeQuickFilters.length === 0) {
      return flatRows
    }

    return flatRows.filter((row: any) => {
      const isOvr = isOverdue(row)

      const parsedForm = getParsedFormData(row)
      const agentData =
        row._agentResponse || row._agentData?.[0] || row._agentData || {}
      const rawDecision = String(
        parsedForm['2MH_BMDFEVKsU0uAQjoI1'] ||
          agentData?.decision ||
          row.decision ||
          row.status ||
          '',
      ).toUpperCase()

      const isMtc = rawDecision === 'APPROVED' || rawDecision === 'MATCHED'
      const isDisc =
        rawDecision === 'PARTIALLY APPROVED' ||
        rawDecision === 'REJECTED' ||
        rawDecision === 'NO MATCH' ||
        row.isDuplicateInvoice === true

      const amtStr = findInvoiceAmount(row)
      const amount = amtStr ? Number(amtStr.replace(/[^0-9.-]/g, '')) : 0
      const isHigh = amount >= 10000

      return activeQuickFilters.some((filter) => {
        if (filter === 'overdue') return isOvr
        if (filter === 'matched') return isMtc
        if (filter === 'discrepancies') return isDisc
        if (filter === 'highValue') return isHigh
        return true
      })
    })
  }, [flatRows, activeQuickFilters, activeTab])

  // ✅ Filter rows based on search state
  const filteredFlatRows = useMemo(() => {
    if (!searchState?.value || searchState.value.trim() === '') {
      return quickFilteredRows
    }

    const searchValue = searchState.value.toLowerCase().trim()
    const searchColumnId = searchState.id

    return quickFilteredRows.filter((row: any) => {
      // If searching in a specific column
      if (searchColumnId) {
        const cellValue = row[searchColumnId]
        if (cellValue == null) return false
        return String(cellValue).toLowerCase().includes(searchValue)
      }

      // Search across all columns
      return Object.entries(row).some(([key, value]) => {
        if (value == null || key === 'id') return false

        if (
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean'
        ) {
          return String(value).toLowerCase().includes(searchValue)
        }
        if (typeof value === 'object') {
          return JSON.stringify(value).toLowerCase().includes(searchValue)
        }
        return false
      })
    })
  }, [quickFilteredRows, searchState])

  // ✅ Rebuild grouped data structure with filtered rows
  const filteredData = useMemo(() => {
    if (!data) return data

    const hasSearch = searchState?.value && searchState.value.trim() !== ''
    const hasQuickFilters = activeQuickFilters && activeQuickFilters.length > 0

    if (!hasSearch && !hasQuickFilters) {
      return data
    }

    // Create a Set of filtered row IDs for fast lookup
    const filteredIds = new Set(
      filteredFlatRows.map(
        (row: any) => row.id || row.transactionId || row.processId,
      ),
    )

    // Filter the grouped data structure
    return data
      .map((group: any) => {
        if (!group.items || !Array.isArray(group.items)) return group

        return {
          ...group,
          items: group.items.filter((item: any) =>
            filteredIds.has(item.id || item.transactionId || item.processId),
          ),
        }
      })
      .filter((group: any) => !group.items || group.items.length > 0)
  }, [data, searchState, activeQuickFilters, filteredFlatRows])

  // Inject processing processes from store
  const processingProcesses = requestStore((state) => state.processingProcesses)

  const finalData = useMemo(() => {
    if (
      activeTab !== 'Inbox' ||
      !processingProcesses ||
      processingProcesses.length === 0
    ) {
      return filteredData
    }

    const existingIds = new Set()
    const outData = (filteredData || []).map((g) => {
      g.items?.forEach((i: any) => existingIds.add(String(i.processId || i.id)))
      return { ...g, items: [...(g.items || [])] }
    })

    const newProcessingItems = processingProcesses
      .filter((p) => !existingIds.has(String(p.processId || p.id)))
      .map((p) => ({
        ...p,
        _groupKey: 'root',
        documentNumber: p.requestNo || p.name || 'Processing...',
        id: p.processId || p.id,
        isProcessing: true,
        processId: p.processId || p.id,
        raisedAt: new Date().toISOString(),
        stage: p.stage || 'Start',
        status: 'Progressing',
      }))

    if (newProcessingItems.length > 0) {
      const rootGroup = outData.find((g) => g.groupId === 'root')
      if (rootGroup) {
        rootGroup.items.unshift(...newProcessingItems)
        rootGroup.groupCount = rootGroup.items.length
      } else {
        outData.unshift({
          groupCount: newProcessingItems.length,
          groupId: 'root',
          groupKey: 'root',
          groupValue: 'root',
          items: newProcessingItems,
        })
      }
    }

    return outData
  }, [filteredData, processingProcesses, activeTab])

  // ✅ Flatten final data to render flat table rows when viewMode is 'table'
  const flatFinalRows = useMemo(() => {
    const items: any[] = []
    finalData.forEach((group: any) => {
      if (Array.isArray(group.items)) {
        items.push(...group.items)
      }
    })
    return items
  }, [finalData])

  // ✅ Handle default expansion: Expand ALL groups when data or grouping changes
  // ✅ Handle default expansion: Default to COLLAPSED
  React.useEffect(() => {
    // User requested default collapsed state
    setExpandState({})
  }, [filteredData, groupState, setExpandState])

  // ✅ Create table with filtered data
  const { table } = useDataTable({
    columns,
    enableRowSelection: false,
    rows: (viewMode === 'table'
      ? [{ items: flatFinalRows }]
      : finalData) as any,

    state: {
      expandState,
      groupState,
      searchState,
      sortState,
      setExpandState,
      ...rest,
    },
  })

  // Debug (keep for a bit until stable)
  // console.log({ selectedIndex, hasPrev, hasNext, flatRowsLen: flatRows.length, selectedItem }, 'nav-debug')
  const handlePoSheet = () => {
    // alert("hi")
    openNewRequest('po')
  }
  return (
    <div className='bg-primary flex min-h-0 flex-1 flex-col overflow-hidden px-6 py-2 md:px-6'>
      {!selectedItem && activeTab === 'Inbox' && (
        <QuickFilters counts={counts} />
      )}
      <div className='relative flex min-h-0 w-full flex-1 flex-col'>
        <div className='flex h-full w-full gap-3'>
          {/* Left */}
          {!selectedItem && viewMode === 'table' && (
            <div className='flex h-full min-w-0 flex-1 flex-col'>
              <DataTable
                component={selectedItem}
                emptyPage='requests'
                hideGrouping={true}
                isLoading={isLoading}
                isReLoading={isRefetching}
                pageSize={pageSize}
                stickyHeader={true}
                table={table}
                actions={[
                  {
                    align: 'right', // or 'left'
                    icon: 'tabler:upload',
                    label: 'Upload PO',
                    onClick: () => {
                      handlePoSheet()
                    },
                  },
                ]}
                onEmptyPrimaryAction={() => openNewRequest('request')}
                onReload={onRefresh}
              />
            </div>
          )}

          {!selectedItem && viewMode === 'grid' && (
            <div className='h-full min-w-0 flex-1 overflow-hidden'>
              <GridView
                activeTab={activeTab}
                data={finalData} // ✅ Use final data
                hideGrouping={activeTab !== 'Inbox'}
                isLoading={isLoading}
                isReloading={isRefetching}
                table={table} // Pass the instance
                actions={[
                  {
                    align: 'right',
                    icon: 'tabler:upload',
                    label: 'Upload PO',
                    onClick: () => {
                      handlePoSheet()
                    },
                  },
                ]}
                onNewRequest={() => openNewRequest('request')}
                onReload={onRefresh}
                onRowClick={onRowClick}
              />
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      {!selectedItem && (
        <div className='z-10 shrink-0 bg-primary-1 pt-2'>
          <Pagination
            itemLabel='Requests'
            page={page}
            pageSize={pageSize}
            showPageNumbers={false}
            totalItems={totalItems}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}
    </div>
  )
}

export default InboxList
