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
import { useEffect, useState } from 'react'
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
  storageKey?: string
}

export default function useDataTableState({
  initialPinState,
  initialVisibilityState,
  storageKey,
}: DataTableStateProps): DataTableState {
  const newInitialVisibilityState = { ...initialVisibilityState, group: false }
  const newInitialPinState = getPinStateWithDefaults(initialPinState)

  function getStoredState<T>(key: string, fallback: T): T {
    try {
      const stored = sessionStorage.getItem(key)
      if (!stored || stored === 'undefined' || stored === 'null') {
        return fallback
      }
      const parsed = JSON.parse(stored)
      return parsed !== null && parsed !== undefined ? parsed : fallback
    } catch {
      return fallback
    }
  }

  const [expandState, setExpandState] = useState<ExpandedState>(
    storageKey ? getStoredState(`${storageKey}_expand`, {}) : {},
  )
  const [filtersState, setFiltersState] = useState<filtersState>(
    storageKey ? getStoredState(`${storageKey}_filters`, []) : [],
  )
  const [groupState, setGroupState] = useState<GroupState>(
    storageKey ? getStoredState(`${storageKey}_group`, []) : [],
  )
  const [orderState, setOrderState] = useState<OrderState>(
    storageKey ? getStoredState(`${storageKey}_order`, []) : [],
  )
  const [pinState, setPinState] = useState<PinState>(
    storageKey
      ? getStoredState(`${storageKey}_pin`, newInitialPinState)
      : newInitialPinState,
  )
  const [searchState, setSearchState] = useState<SearchState>(
    storageKey
      ? getStoredState(`${storageKey}_search`, { id: '', value: '' })
      : { id: '', value: '' },
  )
  const [selectState, setSelectState] = useState<SelectState>(
    storageKey ? getStoredState(`${storageKey}_select`, {}) : {},
  )
  const [sortState, setSortState] = useState<SortState>(
    storageKey ? getStoredState(`${storageKey}_sort`, []) : [],
  )
  const [visibilityState, setVisibilityState] = useState<VisibilityState>(
    storageKey
      ? getStoredState(`${storageKey}_visibility`, newInitialVisibilityState)
      : newInitialVisibilityState,
  )

  useEffect(() => {
    if (!storageKey) return
    try {
      sessionStorage.setItem(
        `${storageKey}_expand`,
        JSON.stringify(expandState),
      )
      sessionStorage.setItem(
        `${storageKey}_filters`,
        JSON.stringify(filtersState),
      )
      sessionStorage.setItem(`${storageKey}_group`, JSON.stringify(groupState))
      sessionStorage.setItem(`${storageKey}_order`, JSON.stringify(orderState))
      sessionStorage.setItem(`${storageKey}_pin`, JSON.stringify(pinState))
      sessionStorage.setItem(
        `${storageKey}_search`,
        JSON.stringify(searchState),
      )
      sessionStorage.setItem(
        `${storageKey}_select`,
        JSON.stringify(selectState),
      )
      sessionStorage.setItem(`${storageKey}_sort`, JSON.stringify(sortState))
      sessionStorage.setItem(
        `${storageKey}_visibility`,
        JSON.stringify(visibilityState),
      )
    } catch {
      // ignore
    }
  }, [
    storageKey,
    expandState,
    filtersState,
    groupState,
    orderState,
    pinState,
    searchState,
    selectState,
    sortState,
    visibilityState,
  ])

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
