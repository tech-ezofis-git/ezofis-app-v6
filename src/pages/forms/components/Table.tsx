import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import type { Column } from '@/components/base/data-table/types'
import type { Form } from '@/types/form'
import { getFormsListQueryOptions } from '@/api/form/queries'
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
      renderCell: (row: any) => (
        <span
          className='cursor-pointer font-medium underline transition-colors hover:text-gray-13'
          onClick={() =>
            navigate({
              params: { formId: row.uid || row.id },
              to: '/form-builder/$formId',
            })
          }
        >
          {String(
            row._json?.settings?.general?.name || row.name || 'Untitled Form',
          )}
        </span>
      ),
    },
    {
      enableGrouping: true,
      id: 'status',
      label: 'Status',
      size: 140,
      renderCell: (row: any) => (
        <FormStatusBadge
          status={
            (row._json?.settings?.publish?.publishOption ||
              row.publishOption) as Form['status']
          }
        />
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
      renderCell: (row: any) => (
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
      renderCell: (row: any) => (
        <span className='line-clamp-1 text-gray-10'>
          {row._json?.settings?.general?.description || row.description || '-'}
        </span>
      ),
    },
    {
      enableGrouping: true,
      id: 'type',
      label: 'Type',
      size: 140,
      renderCell: (row: any) => (
        <FormTypeBadge
          type={
            (row._json?.settings?.general?.type || row.type) as Form['type']
          }
        />
      ),
    },
    {
      id: 'createdBy',
      label: 'Created By',
      size: 240,
    },
    {
      id: 'createdAt',
      label: 'Created At',
      size: 200,
      renderCell: (row: any) =>
        formatDatetime(row.createdAt as string, 'datetime'),
    },
    {
      id: 'updatedBy',
      label: 'Last Modified By',
      size: 240,
    },
    {
      id: 'updatedAt',
      label: 'Last Modified At',
      size: 200,
      renderCell: (row: any) =>
        formatDatetime(row.updatedAt as string, 'datetime'),
    },
    {
      className: 'p-1',
      hideHeader: true,
      id: 'actions',
      isDisplayColumn: true,
      label: 'Actions',
      size: 40,
      renderCell: (row: any) => (
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
              onClick={() =>
                navigate({
                  params: { formId: row.uid || row.id },
                  to: '/form-builder/$formId',
                })
              }
            />
            <MenuItem
              icon='lucide:trash-2'
              iconClass='text-red-11'
              label='Delete'
              onClick={() => alert(row.uid || row.id)}
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
  const [pageSize, setPageSize] = useState(10)

  const { data, isFetching, isPending, isRefetching, refetch } = useQuery(
    getFormsListQueryOptions(page, pageSize),
  )

  const forms = useMemo(() => {
    console.group('🔍 Forms Table: Deep Data Detection')
    console.log('1. Raw data from useQuery:', data)

    if (!data) {
      console.log('❌ No data available')
      console.groupEnd()
      return []
    }

    const mapItem = (item: any) => ({
      ...item,
      _json:
        typeof item.formJson === 'string'
          ? JSON.parse(item.formJson)
          : item.formJson,
      id: String(
        item.uid || item.id || Math.random().toString(36).substring(2, 11),
      ),
    })

    // Recursive helper to find the first array in the object tree
    const findDeepData = (obj: any): any[] | null => {
      if (Array.isArray(obj)) return obj
      if (obj && typeof obj === 'object') {
        // Priority: search in 'data', then 'value', then any other object property
        if (obj.data) {
          const results = findDeepData(obj.data)
          if (results) return results
        }
        if (obj.value) {
          const results = findDeepData(obj.value)
          if (results) return results
        }
        // Check all other keys if needed, but usually it's under 'data'
        for (const key in obj) {
          if (
            key !== 'data' &&
            key !== 'value' &&
            typeof obj[key] === 'object'
          ) {
            const results = findDeepData(obj[key])
            if (results) return results
          }
        }
      }
      return null
    }

    const rawList = findDeepData(data) || []
    console.log('2. Detected raw list array:', rawList)

    if (rawList.length > 0) {
      // Check if it's grouped: [{ key: '...', value: [...] }, ...]
      const isGrouped =
        'key' in rawList[0] && ('value' in rawList[0] || 'data' in rawList[0])
      console.log('3. Is grouped structure?:', isGrouped)

      if (isGrouped) {
        const grouped = rawList.map((group: any) => {
          const items = Array.isArray(group.value)
            ? group.value
            : Array.isArray(group.data)
              ? group.data
              : []
          return {
            groupCount: items.length,
            groupId: String(group.key),
            groupKey: 'type',
            groupValue: String(group.key),
            items: items.map(mapItem),
          }
        })
        console.log('4. Final grouped output:', grouped)
        console.groupEnd()
        return grouped
      }

      // Fallback to a single "All Forms" group if flat
      const flat = [
        {
          groupCount: rawList.length,
          groupId: 'all',
          groupKey: 'all',
          groupValue: 'All Forms',
          items: rawList.map(mapItem),
        },
      ]
      console.log('4. Final flat output (wrapped in group):', flat)
      console.groupEnd()
      return flat
    }

    console.log('❌ No list detected or list is empty')
    console.groupEnd()
    return []
  }, [data])

  const totalItems = useMemo(() => {
    if (!data) return 0

    // Recursive helper to find metadata
    const findDeepMeta = (obj: any): any => {
      if (!obj || typeof obj !== 'object') return null
      if (obj.meta && obj.meta.totalItems !== undefined) return obj.meta
      if (obj.totalItems !== undefined) return { totalItems: obj.totalItems }
      if (obj.totalCount !== undefined) return { totalItems: obj.totalCount }

      for (const key in obj) {
        if (typeof obj[key] === 'object') {
          const meta = findDeepMeta(obj[key])
          if (meta) return meta
        }
      }
      return null
    }

    const meta = findDeepMeta(data)
    const count =
      meta?.totalItems ?? forms.reduce((acc, g) => acc + g.groupCount, 0)

    console.log('📊 totalItems detected:', count, { metaDetected: meta })
    return count
  }, [data, forms])

  const { table } = useDataTable({
    columns,
    enableRowSelection: false,
    rows: forms as any,
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
        itemLabel='Forms'
        page={page}
        pageSize={pageSize}
        showPageNumbers={false}
        totalItems={totalItems}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  )
}

Table.displayName = 'Table'
export default Table
