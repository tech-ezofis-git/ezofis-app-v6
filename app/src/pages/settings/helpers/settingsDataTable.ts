import {
  type ColumnFiltersState,
  type FilterFn,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type PaginationState,
  type Row,
} from '@tanstack/react-table'
import { useEffect, useMemo, useState } from 'react'
import type { SearchState } from '@/components/base/data-table/types'

export const settingsTableDefaultColumn = {
  enableColumnFilter: true,
  filterFn: 'includesString' as const,
  minSize: 40,
  size: 150,
}

export const settingsTableCoreOptions = {
  columnResizeMode: 'onChange' as const,
  defaultColumn: settingsTableDefaultColumn,
  enableColumnResizing: true,
  getCoreRowModel: getCoreRowModel(),
}

export const settingsHeaderMeta = {
  center: { headerAlign: 'center' as const },
  end: { headerAlign: 'right' as const },
  start: { headerAlign: 'left' as const },
}

const getRowSearchValues = (row: Row<unknown>) => {
  const original = row.original as Record<string, unknown>

  return Object.values(original).flatMap((value) => {
    if (value == null) return []
    if (Array.isArray(value)) {
      return value.map((item) => String(item))
    }
    if (typeof value === 'object') return []
    return [String(value)]
  })
}

export const settingsGlobalFilterFn: FilterFn<any> = (
  row,
  _columnId,
  filterValue,
) => {
  const searchState = (filterValue ?? { id: '', value: '' }) as SearchState
  const search = searchState.value?.trim().toLowerCase()
  if (!search) return true

  if (searchState.id) {
    const value = row.getValue(searchState.id)
    return String(value ?? '')
      .toLowerCase()
      .includes(search)
  }

  return getRowSearchValues(row).some((value) =>
    value.toLowerCase().includes(search),
  )
}

export const settingsTableSearchModel = {
  globalFilterFn: settingsGlobalFilterFn,
  getFilteredRowModel: getFilteredRowModel(),
}

export function useSettingsTablePagination(initialPageSize = 10) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: initialPageSize,
  })

  return useMemo(
    () => ({
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      pagination: {
        pageIndex: pagination.pageIndex,
        pageSize:
          pagination.pageSize === 0
            ? Number.MAX_SAFE_INTEGER
            : pagination.pageSize,
      },
      paginationModel: {
        getPaginationRowModel: getPaginationRowModel(),
      },
      onPageChange: (page: number) =>
        setPagination((prev) => ({
          ...prev,
          pageIndex: Math.max(0, page - 1),
        })),
      onPageSizeChange: (pageSize: number) =>
        setPagination({ pageIndex: 0, pageSize }),
      onPaginationChange: (updater: any) => {
        setPagination((prev) => {
          const next = typeof updater === 'function' ? updater(prev) : updater
          if (next.pageSize === Number.MAX_SAFE_INTEGER) {
            return { ...next, pageSize: 0 }
          }
          return next
        })
      },
    }),
    [pagination],
  )
}

export function useSettingsTableSearch(storageKey?: string) {
  const [globalFilter, setGlobalFilter] = useState<SearchState>(() => {
    if (storageKey) {
      try {
        const stored = sessionStorage.getItem(`${storageKey}_search`)
        if (stored) return JSON.parse(stored)
      } catch {}
    }
    return { id: '', value: '' }
  })
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  useEffect(() => {
    if (storageKey) {
      try {
        sessionStorage.setItem(
          `${storageKey}_search`,
          JSON.stringify(globalFilter),
        )
      } catch {}
    }
  }, [globalFilter, storageKey])

  return useMemo(
    () => ({
      ...settingsTableSearchModel,
      state: { columnFilters, globalFilter },
      onColumnFiltersChange: setColumnFilters,
      onGlobalFilterChange: setGlobalFilter,
    }),
    [columnFilters, globalFilter],
  )
}
