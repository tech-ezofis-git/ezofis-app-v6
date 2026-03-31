import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import type { Column } from '@/components/base/data-table/types'
import { getWorkflowListQueryOptions } from '@/api/workflow/queries'
import IconButton from '@/components/base/button/IconButton'
import DataTable from '@/components/base/data-table/DataTable'
import useDataTable from '@/components/base/data-table/hooks/useDataTable'
import useDataTableState from '@/components/base/data-table/hooks/useDataTableState'
import Menu from '@/components/base/menu/Menu'
import MenuItem from '@/components/base/menu/MenuItem'
import Pagination from '@/components/base/pagination/Pagination'
import FormStatusBadge from '@/components/common/FormStatusBadge'
import FormTypeBadge from '@/components/common/FormTypeBadge'
import { formatDatetime } from '@/utils/dayjs'

const Table = () => {
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
        <FormStatusBadge status={String(row.flowstatus) as any} />
      ),
    },
    {
      className: 'p-1',
      enableGrouping: true,
      hideHeader: true,
      id: 'isFavourite',
      isDisplayColumn: true,
      label: 'Favourite',
      size: 40,
      renderCell: (row) => (
        <div className='flex items-center justify-center'>
          <IconButton
            className='group'
            color='gray'
            icon={row.isFavourite ? 'tabler:star-filled' : 'tabler:star'}
            variant='ghost'
            iconClass={
              row.isFavourite
                ? 'text-yellow-10'
                : 'text-gray-8 group-hover:text-gray-9'
            }
          />
        </div>
      ),
    },
    {
      id: 'description',
      label: 'Description',
      size: 240,
    },
    {
      enableGrouping: true,
      id: 'initiatedBy',
      label: 'Initiate By',
      size: 140,
      renderCell: (row) => (
        <FormTypeBadge type={String(row.initiatedBy) as any} />
      ),
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
    },
    {
      id: 'modifiedAt',
      label: 'Modified At',
      size: 180,
      renderCell: (row) => formatDatetime(row.modifiedAt as string, 'datetime'),
    },
    {
      className: 'p-1',
      hideHeader: true,
      id: 'actions',
      isDisplayColumn: true,
      label: 'Actions',
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
                alert(workflow.id)
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

  const payload = useMemo(
    () => ({
      currentPage: page,
      filterBy: [],
      groupBy: 'flowstatus',
      hasSecurity: true,
      itemsPerPage: pageSize,
      mode: 'BROWSE',
      sortBy: {
        criteria: sortState?.[0]?.id || 'name',
        order: sortState?.[0]?.desc ? 'DESC' : 'ASC',
      },
    }),
    [page, pageSize, sortState],
  )

  const { data, isFetching, isPending, isRefetching, refetch } = useQuery(
    getWorkflowListQueryOptions(payload),
  )

  const workflows = useMemo(() => {
    if (!data?.data || !Array.isArray(data.data)) return []
    // The DataTable expects an ItemGroup structure:
    return data.data.map((cluster: any) => ({
      groupCount: cluster.value?.length || 0,
      groupId: cluster.key,
      groupKey: 'flowstatus',
      groupValue: cluster.key,
      items: Array.isArray(cluster.value) ? cluster.value : [],
    }))
  }, [data])

  const { table } = useDataTable({
    columns,
    enableRowSelection: false,
    rows: workflows,
    state: { expandState, groupState, sortState, ...rest },
  })

  return (
    <div className='p-6'>
      <DataTable
        isLoading={isPending}
        isReLoading={isFetching || isRefetching}
        pageSize={pageSize}
        table={table}
        onReload={refetch}
      />
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
