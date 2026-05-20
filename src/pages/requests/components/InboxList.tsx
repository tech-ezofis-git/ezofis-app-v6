import React, { useMemo } from 'react'
import DataTable from '@/components/base/data-table/DataTable'
import useDataTable from '@/components/base/data-table/hooks/useDataTable'
import useDataTableState from '@/components/base/data-table/hooks/useDataTableState'
import Pagination from '@/components/base/pagination/Pagination'
import type { TableGroup, WorkflowOption } from '../types'
import requestStore from '../stores/useRequestStore'
import { useDynamicColumns } from './columns/useDynamicColumns'
import GridView from './GridView'
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
  const columns = useDynamicColumns(workflow, onRowClick, selectedItem) || []

  console.log(data, 'this is from inbox list')
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

  // ✅ Filter rows based on search state
  const filteredFlatRows = useMemo(() => {
    if (!searchState?.value || searchState.value.trim() === '') {
      return flatRows
    }

    const searchValue = searchState.value.toLowerCase().trim()
    const searchColumnId = searchState.id

    return flatRows.filter((row: any) => {
      // If searching in a specific column
      if (searchColumnId) {
        const cellValue = row[searchColumnId]
        if (cellValue == null) return false
        return String(cellValue).toLowerCase().includes(searchValue)
      }

      // Search across all columns
      return Object.entries(row).some(([key, value]) => {
        if (value == null || key === 'id') return false

        // Handle nested objects (like formData)
        if (typeof value === 'object') {
          return JSON.stringify(value).toLowerCase().includes(searchValue)
        }

        return String(value).toLowerCase().includes(searchValue)
      })
    })
  }, [flatRows, searchState])

  // ✅ Rebuild grouped data structure with filtered rows
  const filteredData = useMemo(() => {
    if (!searchState?.value || searchState.value.trim() === '' || !data) {
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
  }, [data, searchState, filteredFlatRows])

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
    rows: (finalData || []) as any,

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
    <>
      <div className='bg-primary flex min-h-0 flex-1 flex-col overflow-hidden px-6 py-2 md:px-6'>
        <div className='relative flex min-h-0 w-full flex-1 flex-col'>
          <div className='flex h-full w-full gap-3'>
            {/* Left */}
            {!selectedItem && viewMode === 'table' && (
              <div className='flex h-full min-w-0 flex-1 flex-col'>
                <DataTable
                  component={selectedItem}
                  hideGrouping={activeTab !== 'Inbox'}
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
                  onReload={onRefresh}
                />
              </div>
            )}

            {!selectedItem && viewMode === 'grid' && (
              <div className='h-full min-w-0 flex-1 overflow-hidden'>
                <GridView
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
    </>
  )
}

export default InboxList
