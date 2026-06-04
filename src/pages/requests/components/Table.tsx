import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import type { Column } from '@/components/base/data-table/types'
import type { Request } from '@/types/request'
import { getRequestGroupListQueryOptions } from '@/api/local/requests/queries'
import IconButton from '@/components/base/button/IconButton'
import DataTable from '@/components/base/data-table/DataTable'
import useDataTable from '@/components/base/data-table/hooks/useDataTable'
import useDataTableState from '@/components/base/data-table/hooks/useDataTableState'
import Menu from '@/components/base/menu/Menu'
import MenuItem from '@/components/base/menu/MenuItem'
import Pagination from '@/components/base/pagination/Pagination'
import showToast from '@/components/base/toast/showToast'
import RequestStatusBadge from '@/components/common/RequestStatusBadge'
import { formatDatetime } from '@/utils/dayjs'
// import requestStore from '../stores/useRequestStore'

const Table = () => {
  // const openRequest = requestStore((state) => state.openRequest)

  const columns: Column[] = [
    {
      id: 'name',
      label: 'Name',
      size: 160,
      renderCell: (row) => (
        <span
          // onClick={openRequest}
          className='cursor-pointer font-medium underline transition-colors hover:text-gray-13'
        >
          {String(row.name)}
        </span>
      ),
    },
    {
      enableGrouping: true,
      id: 'status',
      label: 'Status',
      size: 140,
      renderCell: (row) => (
        <RequestStatusBadge status={row.status as Request['status']} />
      ),
    },
    { id: 'vendor', label: 'Vendor', size: 200 },
    {
      id: 'amount',
      label: 'Amount',
      size: 140,
      renderCell: (row) => `$${Number(row.amount).toFixed(2)}`,
    },
    {
      enableGrouping: true,
      id: 'documentType',
      label: 'Document Type',
      size: 200,
    },
    { id: 'documentNumber', label: 'Document Number', size: 240 },
    {
      id: 'documentDate',
      label: 'Document Date',
      size: 200,
      renderCell: (row) => formatDatetime(row.documentDate as string),
    },
    {
      id: 'createdBy',
      label: 'Raised By',
      size: 240,
    },
    {
      id: 'createdAt',
      label: 'Raised At',
      size: 200,
      renderCell: (row) => formatDatetime(row.createdAt as string, 'datetime'),
    },
    {
      id: 'updatedBy',
      label: 'Last Action By',
      size: 240,
    },
    {
      id: 'updatedAt',
      label: 'Last Action At',
      size: 200,
      renderCell: (row) => formatDatetime(row.updatedAt as string, 'datetime'),
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
              onClick={() => showToast({ message: String(row.itemId) })}
            />
            <MenuItem
              icon='lucide:trash-2'
              iconClass='text-red-11'
              label='Delete'
              onClick={() => showToast({ message: String(row.itemId) })}
            />
          </Menu>
        </div>
      ),
    },
  ]

  const initialVisibilityState = {
    createdAt: false,
    createdBy: false,
    updatedAt: false,
    updatedBy: false,
  }

  const { expandState, groupState, sortState, ...rest } = useDataTableState({
    initialVisibilityState,
  })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(100)

  const { data, isFetching, isPending, isRefetching, refetch } = useQuery(
    getRequestGroupListQueryOptions({
      expand: expandState,
      group: groupState,
      page,
      pageSize,
      sort: sortState,
    }),
  )

  const requests = useMemo(() => {
    if (!data) return []
    return data.data
  }, [data])

  const { table } = useDataTable({
    columns,
    enableRowSelection: false,
    rows: requests,
    state: { expandState, groupState, sortState, ...rest },
  })

  return (
    <div className='flex h-full flex-col p-6 xl:p-8'>
      <div className='min-h-0 flex-1'>
        <DataTable
          isLoading={isPending}
          isReLoading={isFetching || isRefetching}
          pageSize={pageSize}
          table={table}
          onReload={refetch}
        />
      </div>
      <Pagination
        className='mt-4'
        itemLabel='Requests'
        page={page}
        pageSize={pageSize}
        showPageNumbers={false}
        totalItems={20}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  )
}

Table.displayName = 'Table'
export default Table
