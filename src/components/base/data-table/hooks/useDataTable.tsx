import {
  type ColumnOrderState,
  getCoreRowModel,
  getExpandedRowModel,
  type Updater,
  useReactTable,
} from '@tanstack/react-table'
import { useMemo } from 'react'
import type { ItemGroup } from '@/types/item'
import type { Column } from '../types'
import type { DataTableState } from './useDataTableState'
import transformColumns from '../helpers/transformColumns'
import transformRows from '../helpers/transformRows'

export interface DataTableProps {
  columns: Column[]
  rows: ItemGroup[]
  state: DataTableState
  enableColumnResizing?: boolean
  enableRowSelection?: boolean
  multiSortColumnLimit?: number
}

export default function useDataTable({
  columns,
  enableColumnResizing = true,
  enableRowSelection = true,
  multiSortColumnLimit,
  rows,
  state: {
    expandState,
    filtersState,
    groupState,
    orderState,
    pinState,
    searchState,
    selectState,
    sortState,
    visibilityState,
    setExpandState,
    setFiltersState,
    setGroupState,
    setOrderState,
    setPinState,
    setSearchState,
    setSelectState,
    setSortState,
    setVisibilityState,
  },
}: DataTableProps) {
  const transformedColumns = useMemo(
    () => transformColumns(columns, enableRowSelection),
    [columns, enableRowSelection],
  )
  const transformedRows = useMemo(() => transformRows(rows), [rows])
  const newOrderState = useMemo(
    (): ColumnOrderState => [
      ...new Set([...orderState, ...columns.map(({ id }) => id)]),
    ],
    [columns, orderState],
  )

  const handleGroupStateChange = (
    updater: Updater<DataTableState['groupState']>,
  ) => {
    setGroupState(updater)
    setVisibilityState((prev) => {
      const newGroupState =
        typeof updater === 'function' ? updater(groupState) : updater
      return { ...prev, group: newGroupState.length > 0 }
    })
  }

  const table = useReactTable({
    columnResizeMode: 'onChange',
    columns: transformedColumns,
    data: transformedRows,
    defaultColumn: {
      minSize: 40,
    },
    enableColumnResizing,
    groupedColumnMode: false,
    initialState: {
      columnPinning: pinState,
    },
    manualFiltering: true,
    manualGrouping: true,
    manualPagination: true,
    manualSorting: true,
    maxMultiSortColCount: multiSortColumnLimit || 3,
    sortDescFirst: false,
    state: {
      columnFilters: filtersState,
      columnOrder: newOrderState,
      columnPinning: pinState,
      columnVisibility: visibilityState,
      expanded: expandState,
      globalFilter: searchState,
      grouping: groupState,
      rowSelection: selectState,
      sorting: sortState,
    },
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowId: (row) => row.id,
    getSubRows: (row) => row.subRows,
    onColumnFiltersChange: setFiltersState,
    onColumnOrderChange: setOrderState,
    onColumnPinningChange: setPinState,
    onColumnVisibilityChange: setVisibilityState,
    onExpandedChange: setExpandState,
    onGlobalFilterChange: setSearchState,
    onGroupingChange: handleGroupStateChange,
    onRowSelectionChange: setSelectState,
    onSortingChange: setSortState,
  })

  return { table }
}
