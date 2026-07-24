import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import useAskAiActionStore from '@/components/common/ask-ai/stores/useAskAiActionStore'
import type { Column } from '@/components/base/data-table/types'
import type { RowSize } from '@/components/base/data-table/types'
import {
  mapWorkflowBrowseItem,
  type WorkflowBrowseFilter,
  type WorkflowBrowsePayload,
} from '@/api/v6/workflows'
import { getWorkflowListQueryOptions } from '@/api/workflow/queries'
import IconButton from '@/components/base/button/IconButton'
import TableColumns from '@/components/base/data-table/actions/TableColumns'
import TableRows from '@/components/base/data-table/actions/TableRows'
import TableSearch from '@/components/base/data-table/actions/TableSearch'
import TableSort from '@/components/base/data-table/actions/TableSort'
import DataTable from '@/components/base/data-table/DataTable'
import useDataTable from '@/components/base/data-table/hooks/useDataTable'
import useDataTableState from '@/components/base/data-table/hooks/useDataTableState'
import Menu from '@/components/base/menu/Menu'
import MenuItem from '@/components/base/menu/MenuItem'
import Pagination from '@/components/base/pagination/Pagination'
import showToast from '@/components/base/toast/showToast'
import Tooltip from '@/components/base/Tooltip'
import CustomFilter from '@/components/common/CustomFilter'
import FormStatusBadge from '@/components/common/FormStatusBadge'
import authUserStore from '@/stores/authUserStore'
import { formatDatetime } from '@/utils/dayjs'
import {
  matchesCategoryFilterValue,
  matchesDateRangeValue,
  parseFilterValues,
} from '@/utils/filterUtils'

interface TableProps {
  onCreate?: () => void
}

const Table = ({ onCreate }: TableProps) => {
  const navigate = useNavigate()
  const columns: Column[] = [
    {
      id: 'name',
      label: 'Name',
      size: 200,
      renderCell: (row) => (
        <span className='cursor-pointer font-medium underline transition-colors hover:text-gray-13'>
          {String(row.name)}
        </span>
      ),
    },
    {
      id: 'flowstatus',
      label: 'Status',
      size: 140,
      renderCell: (row) => (
        <FormStatusBadge
          status={
            String(row.flowstatus || row.flowStatus) as 'Draft' | 'Published'
          }
        />
      ),
    },
    {
      id: 'description',
      label: 'Description',
      size: 240,
      renderCell: (row) => String(row.description || '-'),
    },
    {
      id: 'createdBy',
      label: 'Created By',
      size: 140,
      renderCell: (row: any) => String(row.createdByName || loggedInUser),
    },
    {
      id: 'createdAt',
      label: 'Created At',
      size: 180,
      renderCell: (row: any) =>
        formatDatetime(row.createdAt as string, 'datetime'),
    },
    {
      id: 'modifiedBy',
      label: 'Modified By',
      size: 140,
      renderCell: (row: any) =>
        String(row.modifiedByName || row.createdByName || loggedInUser),
    },
    {
      id: 'modifiedAt',
      label: 'Modified At',
      size: 180,
      renderCell: (row: any) =>
        formatDatetime(row.modifiedAt || (row.createdAt as string), 'datetime'),
    },
    {
      className: 'p-1',
      enableSorting: false,
      hideHeader: true,
      id: 'actions',
      isDisplayColumn: true,
      label: 'Actions',
      showMenu: false,
      size: 40,
      renderCell: (row) => (
        <div className='flex items-center justify-center'>
          <Menu
            position='bottom-end'
            width={160}
            target={
              <IconButton
                color='gray'
                icon='lucide:more-vertical'
                variant='ghost'
              />
            }
          >
            <MenuItem
              icon='lucide:edit'
              label='Edit'
              onClick={() => {
                const workflow = row as unknown as any
                navigate({
                  params: { workflowId: workflow.id.toString() },
                  to: '/workflow-builder/$workflowId',
                })
              }}
            />
            <MenuItem
              icon='lucide:trash-2'
              iconClass='text-red-11'
              label='Delete'
              onClick={() => {
                const workflow = row as unknown as any
                showToast({ message: `Delete workflow ID: ${workflow.id}` })
              }}
            />
          </Menu>
        </div>
      ),
    },
  ]

  const initialVisibilityState = {
    createdAt: true,
    createdBy: true,
    description: true,
  }

  const {
    expandState,
    groupState,
    searchState,
    sortState,
    setSearchState,
    ...rest
  } = useDataTableState({
    initialVisibilityState,
  })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(100)
  const [rowSize, setRowSize] = useState<RowSize>('default')
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({})

  const pendingAskAiAction = useAskAiActionStore((state) => state.pending)
  const setPageContext = useAskAiActionStore((state) => state.setPageContext)
  const clearPending = useAskAiActionStore((state) => state.clearPending)

  useEffect(() => {
    setPageContext({
      actionFrom: 'Workflow',
      specificId: '',
    })
    return () => {
      const latest = useAskAiActionStore.getState().pageContext
      if (latest?.actionFrom === 'Workflow') {
        useAskAiActionStore.getState().clearContext()
      }
    }
  }, [setPageContext])

  useEffect(() => {
    if (!pendingAskAiAction || pendingAskAiAction.target !== 'Workflow') return
    setActiveFilters(pendingAskAiAction.filters || {})
    setPage(1)
    clearPending()
  }, [clearPending, pendingAskAiAction])

  const session = authUserStore((state) => state.session)
  const loggedInUser = session?.firstName
    ? `${session.firstName} ${session.lastName || ''}`.trim()
    : session?.email || '-'

  const payload = useMemo((): WorkflowBrowsePayload => {
    const sortColumn = sortState?.[0]?.id
    const sortCriteria =
      sortColumn && sortColumn !== 'flowstatus' ? sortColumn : 'name'

    const filters: WorkflowBrowseFilter[] = []

    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value) {
        if (key === 'createdAt' || key === 'modifiedAt') {
          // Handled locally in filteredWorkflows
          return
        }
        let condition = 'CONTAINS'
        if (['createdBy', 'modifiedBy', 'flowStatus'].includes(key)) {
          condition = 'IS_EQUALS_TO'
        }
        parseFilterValues(value).forEach((v) => {
          filters.push({
            condition,
            criteria: key,
            value: v,
          })
        })
      }
    })

    return {
      currentPage: page,
      filterBy:
        filters.length > 0
          ? [
              {
                filters,
                groupCondition: '',
              },
            ]
          : [],
      groupBy: '',
      hasReport: true,
      hasSecurity: true,
      itemsPerPage: pageSize,
      mode: 'BROWSE',
      sortBy: {
        criteria: sortCriteria,
        order: sortState?.[0]?.desc ? 'DESC' : 'ASC',
      },
    }
  }, [page, pageSize, sortState, activeFilters])

  const { data, isFetching, isPending, isRefetching, refetch } = useQuery(
    getWorkflowListQueryOptions(payload),
  )

  const workflows = useMemo(() => {
    if (!data?.data?.length) return []

    const items = data.data.flatMap((cluster) =>
      (cluster.value ?? []).map((item) =>
        mapWorkflowBrowseItem(item, cluster.key),
      ),
    )

    if (items.length === 0) return []

    return [
      {
        groupCount: items.length,
        groupId: 'all',
        groupKey: '',
        groupValue: '',
        items,
      },
    ]
  }, [data])

  const createdByOptions = useMemo(() => {
    const unique = new Map<string, string>()
    workflows.forEach((group: any) => {
      group.items.forEach((w: any) => {
        if (w.createdBy)
          unique.set(w.createdBy, w.createdByName || loggedInUser)
      })
    })
    return Array.from(unique.entries()).map(([value, label]) => ({
      label,
      value,
    }))
  }, [workflows, loggedInUser])

  const nameOptions = useMemo(() => {
    const unique = new Set<string>()
    workflows.forEach((group: any) => {
      group.items.forEach((w: any) => {
        const name = String(w.name || '').trim()
        if (name) unique.add(name)
      })
    })
    return Array.from(unique)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ label: name, value: name }))
  }, [workflows])

  const modifiedByOptions = useMemo(() => {
    const unique = new Map<string, string>()
    workflows.forEach((group: any) => {
      group.items.forEach((w: any) => {
        if (w.modifiedBy)
          unique.set(
            w.modifiedBy,
            w.modifiedByName || w.createdByName || loggedInUser,
          )
      })
    })
    return Array.from(unique.entries()).map(([value, label]) => ({
      label,
      value,
    }))
  }, [workflows, loggedInUser])

  const filteredWorkflows = useMemo(() => {
    return workflows
      .map((group: any) => {
        const filteredItems = group.items.filter((w: any) => {
          let matches = true
          Object.entries(activeFilters).forEach(([key, value]) => {
            if (!value) return

            if (key === 'createdAt' || key === 'modifiedAt') {
              if (!matchesDateRangeValue(w[key], value)) matches = false
            } else if (key === 'flowStatus') {
              const rowStatus = w.flowStatus || w.flowstatus
              if (!matchesCategoryFilterValue(rowStatus, value)) matches = false
            } else if (key === 'name') {
              if (!matchesCategoryFilterValue(w.name, value, 'contains')) {
                matches = false
              }
            } else if (key === 'createdBy' || key === 'modifiedBy') {
              if (!matchesCategoryFilterValue(w[key], value)) matches = false
            } else if (
              !matchesCategoryFilterValue(w[key], value, 'contains')
            ) {
              matches = false
            }
          })

          if (searchState?.value) {
            const query = searchState.value.toLowerCase()
            const searchCols = searchState.id
              ? [searchState.id]
              : Object.keys(w)
            const matchesSearch = searchCols.some((colKey) => {
              const val = w[colKey]
              return val != null && String(val).toLowerCase().includes(query)
            })
            if (!matchesSearch) matches = false
          }

          return matches
        })
        return {
          ...group,
          groupCount: filteredItems.length,
          items: filteredItems,
        }
      })
      .filter((group: any) => group.items.length > 0)
  }, [workflows, activeFilters, searchState])

  const { table } = useDataTable({
    columns,
    enableRowSelection: false,
    rows: filteredWorkflows,
    state: {
      expandState,
      groupState,
      searchState,
      sortState,
      setSearchState,
      ...rest,
    },
  })

  return (
    <div className='flex h-full min-h-0 flex-col'>
      <CustomFilter
        activeFilters={activeFilters}
        customSearchComponent={<TableSearch table={table as any} />}
        searchPlaceholder='Search workflows...'
        searchQuery=''
        actionButtons={[
          {
            color: 'gray',
            disabled: isFetching,
            icon: 'tabler:refresh',
            id: 'refresh',
            isIconButton: true,
            tooltip: 'Refresh',
            variant: 'outline',
            onClick: () => refetch(),
          },
        ]}
        addButton={
          onCreate
            ? {
                icon: 'lucide:plus',
                tooltip: 'New Workflow',
                onClick: onCreate,
              }
            : undefined
        }
        filters={[
          {
            id: 'name',
            label: 'Name',
            options: nameOptions,
            searchable: true,
            searchPlaceholder: 'Search name...',
          },
          {
            id: 'flowStatus',
            label: 'Status',
            options: [
              { label: 'Published', value: 'PUBLISHED' },
              { label: 'Draft', value: 'DRAFT' },
            ],
          },
        ]}
        moreFilters={[
          {
            id: 'createdBy',
            label: 'Created By',
            options: createdByOptions,
          },
          {
            id: 'modifiedBy',
            label: 'Modified By',
            options: modifiedByOptions,
          },
          {
            dataType: 'date',
            id: 'createdAt',
            label: 'Created Date',
          },
          {
            dataType: 'date',
            id: 'modifiedAt',
            label: 'Modified Date',
          },
        ]}
        showReset={
          Object.keys(activeFilters).some((k) => activeFilters[k]) ||
          !!searchState?.value
        }
        onFilterChange={(id, value) => {
          setActiveFilters((prev) => ({ ...prev, [id]: value }))
          setPage(1)
        }}
        onReset={() => {
          setActiveFilters({})
          setSearchState({ id: '', value: '' })
          setPage(1)
        }}
        onSearchChange={() => {}}
      />
      <div className='mt-2 min-h-0 flex-1 overflow-hidden'>
        <DataTable
          emptyPage='workflows'
          hideActionBar={true}
          hideExport={true}
          hideFilters={true}
          hideGrouping={true}
          hideReload={true}
          hideSearch={true}
          isLoading={isPending}
          isReLoading={isFetching || isRefetching}
          pageSize={pageSize}
          rowSize={rowSize}
          stickyHeader={true}
          table={table}
          hideGroupItemCountOnHover
          onEmptyPrimaryAction={onCreate}
          onReload={refetch}
          onRowSizeChange={setRowSize}
        />
      </div>
      <Pagination
        className='mt-4 shrink-0'
        itemLabel='Workflows'
        page={page}
        pageSize={pageSize}
        showPageNumbers={false}
        totalItems={data?.meta?.totalItems || 0}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  )
}

Table.displayName = 'Table'
export default Table
