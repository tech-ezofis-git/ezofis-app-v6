import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import type { Column } from '@/components/base/data-table/types'
import {
  mapWorkflowBrowseItem,
  type WorkflowBrowsePayload,
} from '@/api/v6/workflows'
import { getWorkflowListQueryOptions } from '@/api/workflow/queries'
import IconButton from '@/components/base/button/IconButton'
import DataTable from '@/components/base/data-table/DataTable'
import useDataTable from '@/components/base/data-table/hooks/useDataTable'
import useDataTableState from '@/components/base/data-table/hooks/useDataTableState'
import Menu from '@/components/base/menu/Menu'
import MenuItem from '@/components/base/menu/MenuItem'
import Pagination from '@/components/base/pagination/Pagination'
import showToast from '@/components/base/toast/showToast'
import FormStatusBadge from '@/components/common/FormStatusBadge'
import { formatDatetime } from '@/utils/dayjs'

interface TableProps {
  tabValue: string
  onCreate?: () => void
}

const Table = ({ tabValue, onCreate }: TableProps) => {
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
      enableGrouping: true,
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
    },
    {
      id: 'createdAt',
      label: 'Created At',
      size: 180,
      renderCell: (row) => formatDatetime(row.createdAt as string, 'datetime'),
    },
    {
      id: 'modifiedBy',
      label: 'Modified By',
      size: 140,
      renderCell: (row) =>
        String(row.modifiedByName || row.createdByName || '-'),
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
    createdAt: false,
    createdBy: false,
    description: false,
  }

  const { expandState, groupState, sortState, ...rest } = useDataTableState({
    initialVisibilityState,
  })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(100)

  const payload = useMemo((): WorkflowBrowsePayload => {
    const sortColumn = sortState?.[0]?.id
    const sortCriteria =
      sortColumn && sortColumn !== 'flowstatus' ? sortColumn : 'name'

    const filters = []
    if (tabValue === 'Published') {
      filters.push({
        condition: 'IS_EQUALS_TO',
        criteria: 'flowStatus',
        value: 'PUBLISHED',
      })
    } else if (tabValue === 'Drafts') {
      filters.push({
        condition: 'IS_EQUALS_TO',
        criteria: 'flowStatus',
        value: 'DRAFT',
      })
    }

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
      groupBy: tabValue === 'All' ? 'flowstatus' : '',
      hasReport: true,
      hasSecurity: true,
      itemsPerPage: pageSize,
      mode: 'BROWSE',
      sortBy: {
        criteria: sortCriteria,
        order: sortState?.[0]?.desc ? 'DESC' : 'ASC',
      },
    }
  }, [page, pageSize, sortState, tabValue])

  const { data, isFetching, isPending, isRefetching, refetch } = useQuery(
    getWorkflowListQueryOptions(payload),
  )

  const workflows = useMemo(() => {
    if (!data?.data?.length) return []

    const groups = data.data
      .map((cluster) => {
        const items = (cluster.value ?? []).map((item) =>
          mapWorkflowBrowseItem(item, cluster.key),
        )

        // Filter items locally based on tabValue status
        const filteredItems = items.filter((item) => {
          const status = String(
            item.flowstatus || item.flowStatus,
          ).toLowerCase()
          if (tabValue === 'Published') {
            return status === 'published'
          }
          if (tabValue === 'Drafts') {
            return status === 'draft'
          }
          return true
        })

        return {
          groupCount: filteredItems.length,
          groupId: cluster.key,
          groupKey: 'flowstatus',
          groupValue: cluster.key,
          items: filteredItems,
        }
      })
      .filter((group) => group.items.length > 0)

    if (tabValue !== 'All') {
      const allItems = groups.flatMap((group) => group.items)
      if (allItems.length === 0) return []
      return [
        {
          groupCount: allItems.length,
          groupId: 'all',
          groupKey: '',
          groupValue: '',
          items: allItems,
        },
      ]
    }

    const totalItems = data.meta?.totalItems ?? 0
    const hasItems = groups.some((group) => group.items.length > 0)

    if (totalItems === 0 || !hasItems) return []

    return groups
  }, [data, tabValue])

  const { table } = useDataTable({
    columns,
    enableRowSelection: false,
    rows: workflows,
    state: { expandState, groupState, sortState, ...rest },
  })

  return (
    <div className='flex h-full flex-col px-2 py-1'>
      <div className='min-h-0 flex-1'>
        <DataTable
          emptyPage='workflows'
          isLoading={isPending}
          isReLoading={isFetching || isRefetching}
          pageSize={pageSize}
          stickyHeader={true}
          table={table}
          hideGroupItemCountOnHover
          onEmptyPrimaryAction={onCreate}
          onReload={refetch}
        />
      </div>
      <Pagination
        className='mt-4'
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
