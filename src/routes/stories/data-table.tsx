import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import type { Column } from '@/components/base/data-table/types'
import type { User } from '@/types/user'
import { getUserGroupListQueryOptions } from '@/api/local/queries'
import IconButton from '@/components/base/button/IconButton'
import DataTable from '@/components/base/data-table/DataTable'
import useDataTable from '@/components/base/data-table/hooks/useDataTable'
import useDataTableState from '@/components/base/data-table/hooks/useDataTableState'
import Menu from '@/components/base/menu/Menu'
import MenuItem from '@/components/base/menu/MenuItem'
import Pagination from '@/components/base/pagination/Pagination'
import UserRoleBadge from '@/components/common/UserRoleBadge'
import { formatDatetime } from '@/utils/dayjs'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/data-table')({
  component: TableStory,
})

const columns: Column[] = [
  {
    className: 'text-gray-12 font-medium',
    id: 'name',
    label: 'Name',
    size: 200,
  },
  { id: 'email', label: 'Email', size: 240 },
  {
    enableGrouping: true,
    id: 'role',
    label: 'Role',
    size: 140,
    renderCell: (row) => <UserRoleBadge role={row.role as User['role']} />,
  },
  { enableGrouping: true, id: 'gender', label: 'Gender', size: 140 },
  {
    id: 'dob',
    label: 'DOB',
    size: 160,
    renderCell: (row) => formatDatetime(row.createdAt as string),
  },
  { id: 'phone', label: 'Phone', size: 160 },
  { enableGrouping: true, id: 'department', label: 'Department', size: 200 },
  { enableGrouping: true, id: 'company', label: 'Company', size: 160 },
  {
    id: 'createdAt',
    label: 'Created at',
    size: 200,
    renderCell: (row) => formatDatetime(row.createdAt as string, 'datetime'),
  },
  {
    id: 'updatedAt',
    label: 'Updated at',
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
              size='md'
              variant='ghost'
            />
          }
        >
          <MenuItem
            icon='lucide:edit'
            label='Edit'
            onClick={() => alert(row.itemId)}
          />
          <MenuItem
            icon='lucide:trash-2'
            iconClass='text-red-11'
            label='Delete'
            onClick={() => alert(row.itemId)}
          />
        </Menu>
      </div>
    ),
  },
]

const initialVisibilityState = {
  createdAt: false,
  department: false,
  dob: false,
  updatedAt: false,
}

function TableStory() {
  const { expandState, groupState, sortState, ...rest } = useDataTableState({
    initialVisibilityState,
  })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const { data, isFetching, isPending, isRefetching, refetch } = useQuery(
    getUserGroupListQueryOptions({
      expand: expandState,
      group: groupState,
      page,
      pageSize,
      sort: sortState,
    }),
  )

  const users = useMemo(() => {
    if (!data) return []
    return data.data
  }, [data])

  const { table } = useDataTable({
    columns,
    rows: users,
    state: { expandState, groupState, sortState, ...rest },
  })

  return (
    <div>
      <StoryTitle>34. Data Table</StoryTitle>
      <DataTable
        isLoading={isPending}
        isReLoading={isFetching || isRefetching}
        pageSize={pageSize}
        table={table}
        onReload={refetch}
      />
      <Pagination
        className='mt-6'
        itemLabel='Users'
        page={page}
        pageSize={pageSize}
        showPageNumbers={false}
        totalItems={248}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  )
}
