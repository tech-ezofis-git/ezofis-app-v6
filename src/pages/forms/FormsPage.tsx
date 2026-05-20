import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import type { Column } from '@/components/base/data-table/types'
import type { Form } from '@/types/form'
import { getFormsListQueryOptions } from '@/api/form/queries'
import IconButton from '@/components/base/button/IconButton'
import useDataTable from '@/components/base/data-table/hooks/useDataTable'
import useDataTableState from '@/components/base/data-table/hooks/useDataTableState'
import Menu from '@/components/base/menu/Menu'
import MenuItem from '@/components/base/menu/MenuItem'
import FormStatusBadge from '@/components/common/FormStatusBadge'
import FormTypeBadge from '@/components/common/FormTypeBadge'
import { formatDatetime } from '@/utils/dayjs'
import GridView from './components/GridView'
import Header from './components/header/Header'
import Table from './components/Table'

const FormsPage = () => {
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const initialVisibilityState = {
    createdAt: false,
    createdBy: false,
    description: false,
  }

  const {
    expandState,
    groupState,
    searchState,
    sortState,
    setExpandState,
    ...restState
  } = useDataTableState({
    initialVisibilityState,
  })

  const groupBy = useMemo(() => groupState[0] || 'type', [groupState])

  const { data, isFetching, isPending, isRefetching, refetch } = useQuery(
    getFormsListQueryOptions(page, pageSize, groupBy, []),
  )

  const columns: Column[] = useMemo(
    () => [
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
            {row._json?.settings?.general?.description ||
              row.description ||
              '-'}
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
    ],
    [navigate],
  )

  const forms = useMemo(() => {
    if (!data) return []

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

    const findDeepData = (obj: any): any[] | null => {
      if (Array.isArray(obj)) return obj
      if (obj && typeof obj === 'object') {
        if (obj.data) {
          const results = findDeepData(obj.data)
          if (results) return results
        }
        if (obj.value) {
          const results = findDeepData(obj.value)
          if (results) return results
        }
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
    if (rawList.length > 0) {
      const isGrouped =
        'key' in rawList[0] && ('value' in rawList[0] || 'data' in rawList[0])

      if (isGrouped) {
        return rawList.map((group: any) => {
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
      }

      return [
        {
          groupCount: rawList.length,
          groupId: 'all',
          groupKey: 'all',
          groupValue: 'All Forms',
          items: rawList.map(mapItem),
        },
      ]
    }

    return []
  }, [data])

  const totalItems = useMemo(() => {
    if (!data) return 0
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
    return meta?.totalItems ?? (forms?.[0]?.groupCount || 0)
  }, [data, forms])

  const { table } = useDataTable({
    columns,
    enableRowSelection: false,
    rows: (forms || []) as any,
    state: {
      expandState,
      groupState,
      searchState,
      sortState,
      setExpandState,
      ...restState,
    },
  })

  // Expand ALL groups when grouping is active, similar to Requests Page
  useEffect(() => {
    if (groupState.length > 0) {
      setExpandState(true)
    } else {
      setExpandState({})
    }
  }, [groupState, setExpandState])

  return (
    <div className='flex h-full flex-col'>
      <Header viewMode={viewMode} setViewMode={setViewMode} />

      <div className='bg-gray-50/50 flex-1 overflow-hidden px-6 py-2'>
        {viewMode === 'table' ? (
          <Table
            isLoading={isPending}
            isRefetching={isFetching || isRefetching}
            page={page}
            pageSize={pageSize}
            table={table}
            totalItems={totalItems}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            onReload={refetch}
          />
        ) : (
          <GridView
            isLoading={isPending}
            isRefetching={isFetching || isRefetching}
            page={page}
            pageSize={pageSize}
            table={table}
            totalItems={totalItems}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            onReload={refetch}
          />
        )}
      </div>
    </div>
  )
}

FormsPage.displayName = 'FormsPage'
export default FormsPage
