import {
  getCoreRowModel,
  getFilteredRowModel,
  type ColumnFiltersState,
  type FilterFn,
  type Row,
} from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import type { SearchState } from '@/components/base/data-table/types'

export const settingsTableDefaultColumn = {
  enableColumnFilter: true,
  filterFn: 'includesString' as const,
  minSize: 40,
}

export const settingsTableCoreOptions = {
  defaultColumn: settingsTableDefaultColumn,
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
    return String(value ?? '').toLowerCase().includes(search)
  }

  return getRowSearchValues(row).some((value) =>
    value.toLowerCase().includes(search),
  )
}

export const settingsTableSearchModel = {
  getFilteredRowModel: getFilteredRowModel(),
  globalFilterFn: settingsGlobalFilterFn,
}

export function useSettingsTableSearch() {
  const [globalFilter, setGlobalFilter] = useState<SearchState>({
    id: '',
    value: '',
  })
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  return useMemo(
    () => ({
      ...settingsTableSearchModel,
      onColumnFiltersChange: setColumnFilters,
      onGlobalFilterChange: setGlobalFilter,
      state: { columnFilters, globalFilter },
    }),
    [columnFilters, globalFilter],
  )
}
