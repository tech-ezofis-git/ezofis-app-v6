import {
  type ExpandedState,
  type ColumnFiltersState as filtersState,
  type GroupingState as GroupState,
  type OnChangeFn,
  type ColumnOrderState as OrderState,
  type ColumnPinningState as PinState,
  type RowSelectionState as SelectState,
  type SortingState as SortState,
  type VisibilityState,
} from '@tanstack/react-table'
import { useState } from 'react'
import type { SearchState } from '../types'
import getPinStateWithDefaults from '../helpers/getPinStateWithDefaults'

export interface DataTableState {
  expandState: ExpandedState
  filtersState: filtersState
  groupState: GroupState
  orderState: OrderState
  pinState: PinState
  searchState: SearchState
  selectState: SelectState
  sortState: SortState
  visibilityState: VisibilityState
  setExpandState: OnChangeFn<ExpandedState>
  setFiltersState: OnChangeFn<filtersState>
  setGroupState: OnChangeFn<GroupState>
  setOrderState: OnChangeFn<OrderState>
  setPinState: OnChangeFn<PinState>
  setSearchState: OnChangeFn<SearchState>
  setSelectState: OnChangeFn<SelectState>
  setSortState: OnChangeFn<SortState>
  setVisibilityState: OnChangeFn<VisibilityState>
}

export interface DataTableStateProps {
  initialPinState?: PinState
  initialVisibilityState?: VisibilityState
}

export default function useDataTableState({
  initialPinState,
  initialVisibilityState,
}: DataTableStateProps): DataTableState {
  const newInitialVisibilityState = { ...initialVisibilityState, group: false }
  const newInitialPinState = getPinStateWithDefaults(initialPinState)

  const [expandState, setExpandState] = useState<ExpandedState>({})
  const [filtersState, setFiltersState] = useState<filtersState>([])
  const [groupState, setGroupState] = useState<GroupState>([])
  const [orderState, setOrderState] = useState<OrderState>([])
  const [pinState, setPinState] = useState<PinState>(newInitialPinState)
  const [searchState, setSearchState] = useState<SearchState>({
    id: '',
    value: '',
  })
  const [selectState, setSelectState] = useState<SelectState>({})
  const [sortState, setSortState] = useState<SortState>([])
  const [visibilityState, setVisibilityState] = useState<VisibilityState>(
    newInitialVisibilityState,
  )

  return {
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
  }
}
