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
import showToast from '@/components/base/toast/showToast'
import UserRoleBadge from '@/components/common/UserRoleBadge'
import { formatDatetime } from '@/utils/dayjs'
import StoryCode from './-components/StoryCode'
import StorySubTitle from './-components/StorySubTitle'
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
    <div className='max-w-7xl p-6'>
      <StoryTitle>Data Table</StoryTitle>
      <p className='mb-10 text-15 text-gray-11'>
        The Data Table is a powerful, high-performance component built for
        complex data orchestration. It supports advanced features like dynamic
        sorting, grouping, expansion, and custom cell rendering, all while
        integrated with a unified state management hook.
      </p>

      <p className='mb-4 text-14 text-gray-11'>
        Before using Data Table, import the core component and its essential
        hooks:
      </p>
      <StoryCode>
        {`import DataTable from '@/components/base/data-table/DataTable'
import useDataTable from '@/components/base/data-table/hooks/useDataTable'
import useDataTableState from '@/components/base/data-table/hooks/useDataTableState'`}
      </StoryCode>

      <div className='space-y-16'>
        {/* Core Integration Section */}
        <section>
          <StorySubTitle>Hook Integration</StorySubTitle>
          <p className='mb-6 text-14 text-gray-11'>
            The <code>useDataTableState</code> hook manages UI states (sorting,
            grouping), which are then passed to your API call and finally to the{' '}
            <code>useDataTable</code> hook for rendering.
          </p>
          <StoryCode>
            {`const state = useDataTableState({ initialVisibilityState })
const { table } = useDataTable({ columns, rows, state })

<DataTable isLoading={isLoading} table={table} onReload={refetch} />`}
          </StoryCode>
        </section>

        {/* Live Demo Section */}
        <section>
          <StorySubTitle>Interactive Example</StorySubTitle>
          <p className='mb-4 text-14 text-gray-11'>
            A live demonstration showing server-side integration, custom badges,
            and action menus.
          </p>
          <div className='mt-8 overflow-hidden rounded-xl border border-gray-3 bg-white'>
            <div className='border-b border-gray-3 bg-gray-1 p-4'>
              <p className='text-13 font-medium text-gray-12'>
                User Management System
              </p>
            </div>
            <div className='overflow-x-auto'>
              <DataTable
                isLoading={isPending}
                isReLoading={isFetching || isRefetching}
                pageSize={pageSize}
                table={table}
                onReload={refetch}
              />
            </div>
            <div className='border-t border-gray-3 bg-gray-1 p-4'>
              <Pagination
                itemLabel='Users'
                page={page}
                pageSize={pageSize}
                showPageNumbers={false}
                totalItems={248}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          </div>
        </section>

        {/* Configuration Section */}
        <section>
          <StorySubTitle>Column Definition</StorySubTitle>
          <p className='mb-4 text-14 text-gray-11'>
            Columns are defined as an array of objects, allowing for flexible
            rendering and behavior mapping.
          </p>
          <StoryCode>
            {`const columns: Column[] = [
  { id: 'name', label: 'Name', size: 200 },
  { 
    id: 'role', 
    label: 'Role', 
    renderCell: (row) => <UserRoleBadge role={row.role} /> 
  }
]`}
          </StoryCode>
        </section>
      </div>
    </div>
  )
}
