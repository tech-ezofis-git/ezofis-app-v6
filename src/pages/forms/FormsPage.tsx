import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import type { Column } from '@/components/base/data-table/types'
import type { Form } from '@/types/form'
import { getFormsListQueryOptions } from '@/api/form/queries'
import IconButton from '@/components/base/button/IconButton'
import useDataTable from '@/components/base/data-table/hooks/useDataTable'
import useDataTableState from '@/components/base/data-table/hooks/useDataTableState'
import Menu from '@/components/base/menu/Menu'
import MenuItem from '@/components/base/menu/MenuItem'
import showToast from '@/components/base/toast/showToast'
import FormStatusBadge from '@/components/common/FormStatusBadge'
import FormTypeBadge from '@/components/common/FormTypeBadge'
import { formatDatetime } from '@/utils/dayjs'
import Header from './components/header/Header'
import Table from './components/Table'

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
  if (!obj || typeof obj !== 'object') return null
  if (obj.data) {
    const results = findDeepData(obj.data)
    if (results) return results
  }
  if (obj.value) {
    const results = findDeepData(obj.value)
    if (results) return results
  }
  for (const key in obj) {
    if (key !== 'data' && key !== 'value' && typeof obj[key] === 'object') {
      const results = findDeepData(obj[key])
      if (results) return results
    }
  }
  return null
}

const FormsPage = () => {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [tabValue, setTabValue] = useState<string>('All')

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

  const groupBy = 'type'

  const filterBy = useMemo(() => {
    const filters = []
    if (tabValue === 'Published') {
      filters.push({
        condition: 'IS_EQUALS_TO',
        criteria: 'publishOption',
        dataType: '',
        value: 'PUBLISHED',
      })
    } else if (tabValue === 'Drafts') {
      filters.push({
        condition: 'IS_EQUALS_TO',
        criteria: 'publishOption',
        dataType: '',
        value: 'DRAFT',
      })
    }
    return filters.length > 0
      ? [
          {
            filters,
            groupCondition: '',
          },
        ]
      : []
  }, [tabValue])

  const { data, isFetching, isPending, isRefetching, refetch } = useQuery(
    getFormsListQueryOptions(page, pageSize, groupBy, filterBy),
  )

  const columns: Column[] = useMemo(
    () => [
      {
        id: 'name',
        label: 'Name',
        size: 200,
        renderCell: (row: any) => (
          <Link
            className='cursor-pointer font-medium underline transition-colors hover:text-gray-13'
            params={{ formId: row.uid || row.id }}
            to='/form-builder/$formId'
          >
            {String(
              row._json?.settings?.general?.name || row.name || 'Untitled Form',
            )}
          </Link>
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
        renderCell: (row: any) => String(row.createdByName || '-'),
      },
      {
        id: 'createdAt',
        label: 'Created At',
        size: 200,
        renderCell: (row: any) =>
          formatDatetime(row.createdAt as string, 'datetime'),
      },
      {
        id: 'modifiedBy',
        label: 'Modified By',
        size: 240,
        renderCell: (row: any) =>
          String(row.modifiedByName || row.createdByName || '-'),
      },
      {
        id: 'modifiedAt',
        label: 'Modified At',
        size: 200,
        renderCell: (row: any) =>
          formatDatetime(
            row.modifiedAt || (row.createdAt as string),
            'datetime',
          ),
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
                onClick={() =>
                  showToast({ message: `Delete form ID: ${row.uid || row.id}` })
                }
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

    const rawList = findDeepData(data) || []
    if (rawList.length > 0) {
      const isGrouped =
        'key' in rawList[0] && ('value' in rawList[0] || 'data' in rawList[0])

      if (isGrouped) {
        return rawList
          .map((group: any) => {
            let items: any[] = []
            if (Array.isArray(group.value)) {
              items = group.value
            } else if (Array.isArray(group.data)) {
              items = group.data
            }
            const mappedItems = items.map(mapItem)

            // Apply local filtering for tabValue status
            const filteredItems = mappedItems.filter((item: any) => {
              const option = (
                item._json?.settings?.publish?.publishOption ||
                item.publishOption ||
                ''
              ).toUpperCase()
              if (tabValue === 'Published') {
                return option === 'PUBLISHED'
              }
              if (tabValue === 'Drafts') {
                return option === 'DRAFT'
              }
              return true
            })

            return {
              groupCount: filteredItems.length,
              groupId: String(group.key),
              groupKey: 'type',
              groupValue: String(group.key),
              items: filteredItems,
            }
          })
          .filter((group) => group.groupCount > 0)
      }

      // If not grouped, fallback to flat mapper
      const mappedItems = rawList.map(mapItem)
      const filteredItems = mappedItems.filter((item: any) => {
        const option = (
          item._json?.settings?.publish?.publishOption ||
          item.publishOption ||
          ''
        ).toUpperCase()
        if (tabValue === 'Published') {
          return option === 'PUBLISHED'
        }
        if (tabValue === 'Drafts') {
          return option === 'DRAFT'
        }
        return true
      })

      return [
        {
          groupCount: filteredItems.length,
          groupId: 'all',
          groupKey: 'all',
          groupValue: 'All Forms',
          items: filteredItems,
        },
      ]
    }

    return []
  }, [data, tabValue])

  const totalItems = useMemo(() => {
    if (!data) return 0
    const findDeepMeta = (obj: any): any => {
      if (!obj || typeof obj !== 'object') return null
      if (obj.meta?.totalItems !== undefined) return obj.meta
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

  // Expand ALL groups by default
  useEffect(() => {
    setExpandState(true)
  }, [setExpandState])

  const openFormBuilder = () => {
    navigate({ to: '/form-builder' })
  }

  return (
    <div className='flex h-full flex-col'>
      <Header tabValue={tabValue} onTabChange={setTabValue} />

      <div className='bg-gray-50/50 flex-1 overflow-hidden px-6 py-2'>
        <Table
          isLoading={isPending}
          isRefetching={isFetching || isRefetching}
          page={page}
          pageSize={pageSize}
          table={table}
          totalItems={totalItems}
          onCreate={openFormBuilder}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onReload={refetch}
        />
      </div>
    </div>
  )
}

FormsPage.displayName = 'FormsPage'
export default FormsPage
