import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { useLingui } from '@lingui/react/macro'
import type { Column } from '@/components/base/data-table/types'
import type { Form } from '@/types/form'
import formApi from '@/api/form/form'
import { getFormsListQueryOptions } from '@/api/form/queries'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import TableExport from '@/components/base/data-table/actions/TableExport'
import TableSearch from '@/components/base/data-table/actions/TableSearch'
import useDataTable from '@/components/base/data-table/hooks/useDataTable'
import useDataTableState from '@/components/base/data-table/hooks/useDataTableState'
import Icon from '@/components/base/icon/Icon'
import Menu from '@/components/base/menu/Menu'
import MenuItem from '@/components/base/menu/MenuItem'
import showToast from '@/components/base/toast/showToast'
import CustomFilter from '@/components/common/CustomFilter'
import FormStatusBadge from '@/components/common/FormStatusBadge'
import FormTypeBadge from '@/components/common/FormTypeBadge'
import authUserStore from '@/stores/authUserStore'
import { formatDatetime } from '@/utils/dayjs'
import {
  matchesCategoryFilterValue,
  matchesDateRangeValue,
  parseFilterValues,
} from '@/utils/filterUtils'
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
  const { t } = useLingui()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [deletingForm, setDeletingForm] = useState<any | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({})
  const session = authUserStore((state) => state.session)
  const loggedInUser = session?.firstName
    ? `${session.firstName} ${session.lastName || ''}`.trim()
    : session?.email || '-'

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
    setExpandState,
    setSearchState,
    ...restState
  } = useDataTableState({
    initialVisibilityState,
  })

  const groupBy = ''

  const filterBy = useMemo(() => {
    const filters: { condition: string; criteria: string; value: string }[] = []

    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value) {
        if (key === 'createdAt' || key === 'modifiedAt') {
          return // Handled locally
        }
        let condition = 'CONTAINS'
        if (['createdBy', 'modifiedBy'].includes(key)) {
          condition = 'IS_EQUALS_TO'
        }
        parseFilterValues(value).forEach((v) => {
          filters.push({
            condition,
            criteria: key === 'status' ? 'publishOption' : key,
            value: v,
          })
        })
      }
    })

    return filters.length > 0
      ? [
          {
            filters,
            groupCondition: '',
          },
        ]
      : []
  }, [activeFilters])

  const { data, isFetching, isPending, isRefetching, refetch } = useQuery(
    getFormsListQueryOptions(page, pageSize, groupBy, filterBy),
  )

  const columns: Column[] = useMemo(
    () => [
      {
        id: 'name',
        label: t`Name`,
        size: 200,
        renderCell: (row: any) => (
          <span
            className='cursor-pointer font-medium transition-colors hover:text-gray-13 hover:underline'
            onClick={() =>
              navigate({
                params: { formId: row.uid || row.id },
                to: '/forms/$formId/entries',
              })
            }
          >
            {String(
              row._json?.settings?.general?.name ||
                row.name ||
                t`Untitled Form`,
            )}
          </span>
        ),
      },
      {
        id: 'status',
        label: t`Status`,
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
        label: t`Description`,
        size: 240,
        renderCell: (row: any) => (
          <span className='text-gray-10'>
            {row._json?.settings?.general?.description ||
              row.description ||
              '-'}
          </span>
        ),
      },
      {
        enableGrouping: true,
        id: 'type',
        label: t`Type`,
        size: 140,
        renderCell: (row: any) => {
          const typeVal = row._json?.settings?.general?.type || row.type
          if (!typeVal || String(typeVal).trim().toUpperCase() === 'ITEM') {
            return null
          }
          return <FormTypeBadge type={typeVal as Form['type']} />
        },
      },
      {
        id: 'createdBy',
        label: t`Created By`,
        size: 240,
        renderCell: (row: any) => String(row.createdByName || '-'),
      },
      {
        id: 'createdAt',
        label: t`Created At`,
        size: 200,
        renderCell: (row: any) =>
          formatDatetime(row.createdAt as string, 'datetime'),
      },
      {
        id: 'modifiedBy',
        label: t`Modified By`,
        size: 240,
        renderCell: (row: any) =>
          String(row.modifiedByName || row.createdByName || '-'),
      },
      {
        id: 'modifiedAt',
        label: t`Modified At`,
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
        label: t`Actions`,
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
                label={t`Edit`}
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
                label={t`Delete`}
                onClick={() => setDeletingForm(row)}
              />
            </Menu>
          </div>
        ),
      },
    ],
    [navigate, queryClient, setDeletingForm, t],
  )

  const forms = useMemo(() => {
    if (!data) return []

    const rawList = findDeepData(data) || []
    if (rawList.length > 0) {
      const isGrouped =
        'key' in rawList[0] && ('value' in rawList[0] || 'data' in rawList[0])

      const filterLogic = (item: any) => {
        const option = (
          item._json?.settings?.publish?.publishOption ||
          item.publishOption ||
          ''
        ).toUpperCase()

        let matches = true
        Object.entries(activeFilters).forEach(([key, value]) => {
          if (!value) return
          if (key === 'createdAt' || key === 'modifiedAt') {
            if (!matchesDateRangeValue(item[key], value)) matches = false
          } else if (key === 'status') {
            if (!matchesCategoryFilterValue(option, value)) matches = false
          } else if (key === 'createdBy' || key === 'modifiedBy') {
            if (!matchesCategoryFilterValue(item[key], value)) matches = false
          } else if (
            !matchesCategoryFilterValue(item[key], value, 'contains')
          ) {
            matches = false
          }
        })

        if (searchState?.value) {
          const query = searchState.value.toLowerCase()
          const searchCols = searchState.id
            ? [searchState.id]
            : Object.keys(item)
          const matchesSearch = searchCols.some((colKey) => {
            const val = item[colKey]
            return val != null && String(val).toLowerCase().includes(query)
          })
          if (!matchesSearch) matches = false
        }

        return matches
      }

      if (isGrouped) {
        const mappedItems = rawList.flatMap((group: any) => {
          let items: any[] = []
          if (Array.isArray(group.value)) {
            items = group.value
          } else if (Array.isArray(group.data)) {
            items = group.data
          }
          return items.map(mapItem)
        })

        const filteredItems = mappedItems.filter(filterLogic)

        return [
          {
            groupCount: filteredItems.length,
            groupId: 'all',
            groupKey: '',
            groupValue: '',
            items: filteredItems,
          },
        ]
      }

      // If not grouped, fallback to flat mapper
      const mappedItems = rawList.map(mapItem)
      const filteredItems = mappedItems.filter(filterLogic)

      return [
        {
          groupCount: filteredItems.length,
          groupId: 'all',
          groupKey: '',
          groupValue: '',
          items: filteredItems,
        },
      ]
    }

    return []
  }, [data, activeFilters, searchState])

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

  const createdByOptions = useMemo(() => {
    const unique = new Map<string, string>()
    const allItems = forms.flatMap((g) => g.items)
    allItems.forEach((w: any) => {
      if (w.createdBy) unique.set(w.createdBy, w.createdByName || loggedInUser)
    })
    return Array.from(unique.entries()).map(([value, label]) => ({
      label,
      value,
    }))
  }, [forms, loggedInUser])

  const nameOptions = useMemo(() => {
    const unique = new Set<string>()
    forms.flatMap((g) => g.items).forEach((w: any) => {
      const name = String(w.name || '').trim()
      if (name) unique.add(name)
    })
    return Array.from(unique)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ label: name, value: name }))
  }, [forms])

  const modifiedByOptions = useMemo(() => {
    const unique = new Map<string, string>()
    const allItems = forms.flatMap((g) => g.items)
    allItems.forEach((w: any) => {
      if (w.modifiedBy)
        unique.set(
          w.modifiedBy,
          w.modifiedByName || w.createdByName || loggedInUser,
        )
    })
    return Array.from(unique.entries()).map(([value, label]) => ({
      label,
      value,
    }))
  }, [forms, loggedInUser])

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
      setSearchState,
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
    <div className='flex h-full min-h-0 flex-col'>
      {deletingForm && (
        <div className='animate-in fade-in slide-in-from-top-4 mx-6 mt-4 flex items-center justify-between gap-4 rounded-xl border border-red-3 bg-red-2 p-4 text-red-11 shadow-sm duration-300'>
          <div className='flex items-center gap-3'>
            <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-3 text-red-11'>
              <Icon
                className='h-5 w-5 animate-pulse text-red-11'
                name='lucide:triangle-alert'
              />
            </div>
            <div>
              <h4 className='text-sm font-semibold text-red-12'>{t`Delete Form`}</h4>
              <p className='mt-0.5 text-xs text-red-11'>
                {t`Are you sure you want to delete`}{' '}
                <span className='font-bold text-red-12'>
                  "
                  {deletingForm._json?.settings?.general?.name ||
                    deletingForm.name ||
                    t`Untitled Form`}
                  "
                </span>
                ? {t`This action is permanent and cannot be undone.`}
              </p>
            </div>
          </div>
          <div className='flex shrink-0 items-center gap-2'>
            <Button
              color='gray'
              disabled={isDeleting}
              size='sm'
              variant='subtle'
              onClick={() => setDeletingForm(null)}
            >
              {t`Cancel`}
            </Button>
            <Button
              color='red'
              disabled={isDeleting}
              icon='lucide:trash-2'
              loading={isDeleting}
              size='sm'
              variant='solid'
              onClick={async () => {
                setIsDeleting(true)
                const targetForm = deletingForm
                showToast({
                  message: t`Deleting form...`,
                })
                const { error } = await formApi.deleteForm(
                  targetForm.uid || targetForm.id,
                )
                setIsDeleting(false)
                setDeletingForm(null)
                if (error) {
                  showToast({
                    message: error || t`Failed to delete form`,
                    variant: 'error',
                  })
                } else {
                  showToast({
                    message: t`Form deleted successfully`,
                    variant: 'success',
                  })
                  queryClient.invalidateQueries({ queryKey: ['forms'] })
                }
              }}
            >
              {t`Yes, Delete`}
            </Button>
          </div>
        </div>
      )}

      <div className='bg-gray-50/50 flex min-h-0 flex-1 flex-col overflow-hidden p-4'>
        <CustomFilter
          activeFilters={activeFilters}
          customSearchComponent={<TableSearch table={table as any} />}
          searchPlaceholder={t`Search forms...`}
          searchQuery=''
          trailingActions={<TableExport table={table as any} />}
          actionButtons={[
            {
              color: 'gray',
              disabled: isFetching,
              icon: 'tabler:refresh',
              id: 'refresh',
              isIconButton: true,
              tooltip: t`Refresh`,
              variant: 'outline',
              onClick: () => refetch(),
            },
          ]}
          addButton={{
            icon: 'lucide:plus',
            tooltip: t`New Form`,
            onClick: openFormBuilder,
          }}
          filters={[
            {
              id: 'name',
              label: t`Name`,
              options: nameOptions,
              searchable: true,
              searchPlaceholder: t`Search name...`,
            },
            {
              id: 'status',
              label: t`Status`,
              options: [
                { label: t`Published`, value: 'PUBLISHED' },
                { label: t`Draft`, value: 'DRAFT' },
              ],
            },
          ]}
          moreFilters={[
            {
              id: 'createdBy',
              label: t`Created By`,
              options: createdByOptions,
            },
            {
              id: 'modifiedBy',
              label: t`Modified By`,
              options: modifiedByOptions,
            },
            {
              dataType: 'date',
              id: 'createdAt',
              label: t`Created Date`,
            },
            {
              dataType: 'date',
              id: 'modifiedAt',
              label: t`Modified Date`,
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
    </div>
  )
}

FormsPage.displayName = 'FormsPage'
export default FormsPage
