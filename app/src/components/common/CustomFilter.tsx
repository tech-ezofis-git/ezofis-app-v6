import { useLingui } from '@lingui/react/macro'
import { ChevronDown, ChevronRight, Search, X } from 'lucide-react'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ButtonColor, ButtonVariant } from '@/components/base/button/types'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import Tooltip from '@/components/base/Tooltip'
import cn from '@/utils/cn'
import {
  DEFAULT_DATE_RANGE_OPTIONS,
  isDateColumnType,
  isNumberColumnType,
  parseFilterValues,
  serializeFilterValues,
} from '@/utils/filterUtils'
import {
  CategoryFilterMenu,
  DateFilterMenu,
  NumberFilterMenu,
} from './filters/FilterMenus'

const MORE_FILTER_DEBOUNCE_MS = 350
const MORE_FILTER_PANEL_WIDTH = 440
const MORE_FILTER_PANEL_HEIGHT = 340
/** Same layer as More filters panel; above toolbar/table content */
const FILTER_MENU_Z_INDEX = 50000
const VIEWPORT_GAP = 8

/** Shared chip shell — same size across all pages (dashboard, workflow, forms, settings) */
const FILTER_CHIP_SHELL =
  'inline-flex h-8 max-w-[280px] items-center gap-1 rounded-full border py-0 pl-3.5 text-12 font-normal transition-all'
const FILTER_CHIP_ACTIVE = 'border-primary-9 bg-primary-3/50 text-primary-9'
const FILTER_CHIP_INACTIVE =
  'border-border-default bg-surface text-text-secondary'
const FILTER_CHIP_CLEAR_BTN =
  'inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full text-current opacity-60 transition-colors hover:bg-gray-3 hover:opacity-100'
const FILTER_CHIP_TRAILING =
  'inline-flex size-5 shrink-0 items-center justify-center'
const FILTER_CHIP_COUNT =
  'inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-gray-3 px-1 text-10 font-medium text-text-primary tabular-nums'
const FILTER_SEARCH_INPUT =
  'w-full bg-transparent py-2.5 pr-3 pl-9 text-12 text-text-primary outline-none placeholder:text-text-muted'

interface DropdownPosition {
  left: number
  top: number
  width: number
}

const formatDateChipLabel = (value: string) => {
  if (value.startsWith('custom:')) {
    const [start = '', end = ''] = value.replace('custom:', '').split('_')
    const fmt = (v: string) => {
      const parsed = new Date(v)
      if (Number.isNaN(parsed.getTime())) return v
      return parsed.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    }
    return `${fmt(start)} – ${fmt(end)}`
  }

  const preset = DEFAULT_DATE_RANGE_OPTIONS.find((o) => o.value === value)
  if (preset) return preset.label

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value

  return parsed.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export interface ActionButtonDef {
  id: string
  color?: ButtonColor
  disabled?: boolean
  icon?: string
  iconNode?: React.ReactNode
  isIconButton?: boolean
  label?: string
  tooltip?: string
  variant?: ButtonVariant
  onClick?: () => void
  node?: React.ReactNode
}

export interface CustomFilterProps {
  activeFilters: Record<string, string>
  filters: FilterDefinition[]
  actionButtons?: ActionButtonDef[]
  activeQuickFilters?: string[]
  addButton?: {
    icon?: string
    label?: string
    tooltip?: string
    onClick: () => void
  }
  /** Rendered immediately after the search control (before view mode / actions). */
  afterSearchActions?: React.ReactNode
  customSearchComponent?: React.ReactNode
  /** Whether search control starts expanded or minimized (defaults to false). */
  defaultSearchExpanded?: boolean
  hideSearch?: boolean
  isLoading?: boolean
  moreFilters?: FilterGroup[]
  moreFiltersLabel?: string
  /** Accepted for callers; category menus already support multi-select. */
  multiSelect?: boolean
  quickFilters?: QuickFilterOption[]
  searchPlaceholder?: string
  searchQuery?: string
  showReset?: boolean
  trailingActions?: React.ReactNode
  viewMode?: 'grid' | 'table'
  onFilterChange: (id: string, value: string) => void
  /** Fired when a primary filter menu opens (`id`) or closes (`null`). */
  onFilterMenuOpenChange?: (id: string | null) => void
  onQuickFilterToggle?: (id: string) => void
  onReset: () => void
  onSearchChange?: (val: string) => void
  onViewModeChange?: (mode: 'grid' | 'table') => void
}

export interface FilterDefinition {
  id: string
  label: string
  options: FilterOption[]
  dataType?: string
  searchable?: boolean
  searchPlaceholder?: string
  width?: number
}

export interface FilterGroup {
  id: string
  label: string
  actions?: FilterOption[] // Used for buttons like High Value / Low Value
  dataType?: string
  icon?: React.ComponentType<{ className?: string }>
  options?: FilterOption[]
  searchable?: boolean
  searchPlaceholder?: string
}

export interface FilterOption {
  label: string
  value: string
}

export interface QuickFilterOption {
  id: string
  label: string
  count?: number
  icon?: string
}

export default function CustomFilter({
  actionButtons,
  activeFilters,
  activeQuickFilters,
  addButton,
  afterSearchActions,
  customSearchComponent,
  defaultSearchExpanded = false,
  filters,
  hideSearch = false,
  isLoading = false,
  moreFilters,
  moreFiltersLabel = 'More filters',
  multiSelect: _multiSelect = false,
  quickFilters,
  searchPlaceholder = 'Search...',
  searchQuery = '',
  showReset,
  trailingActions,
  viewMode,
  onFilterChange,
  onFilterMenuOpenChange,
  onQuickFilterToggle,
  onReset,
  onSearchChange = () => {},
  onViewModeChange,
}: CustomFilterProps) {
  const { t } = useLingui()
  const [activeFilterDropdown, setActiveFilterDropdown] = useState<
    string | null
  >(null)
  const [activeFilterGroup, setActiveFilterGroup] = useState<string | null>(
    moreFilters && moreFilters.length > 0 ? moreFilters[0].id : null,
  )
  const [filterSearchQuery, setFilterSearchQuery] = useState('')
  const [moreFilterFieldSearch, setMoreFilterFieldSearch] = useState('')
  const [isSearchExpanded, setIsSearchExpanded] = useState(
    () => defaultSearchExpanded || Boolean(searchQuery),
  )

  const filteredMoreFilterGroups = useMemo(() => {
    if (!moreFilters) return []
    const query = moreFilterFieldSearch.trim().toLowerCase()
    if (!query) return moreFilters
    return moreFilters.filter(
      (group) =>
        group.label.toLowerCase().includes(query) ||
        group.id.toLowerCase().includes(query),
    )
  }, [moreFilters, moreFilterFieldSearch])

  useEffect(() => {
    if (moreFilterFieldSearch.trim() && filteredMoreFilterGroups.length > 0) {
      if (!filteredMoreFilterGroups.some((g) => g.id === activeFilterGroup)) {
        const nextId = filteredMoreFilterGroups[0].id
        setActiveFilterGroup(nextId)
        skipMoreFilterDebounceRef.current = true
        setFilterSearchQuery(activeFilters[nextId] || '')
      }
    }
  }, [
    moreFilterFieldSearch,
    filteredMoreFilterGroups,
    activeFilterGroup,
    activeFilters,
  ])

  useEffect(() => {
    if (searchQuery) {
      setIsSearchExpanded(true)
    }
  }, [searchQuery])
  const [morePanelPos, setMorePanelPos] = useState<{
    left: number
    top: number
  } | null>(null)
  const [filterDropdownPos, setFilterDropdownPos] =
    useState<DropdownPosition | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const filtersRef = useRef<HTMLDivElement>(null)
  const moreFiltersButtonRef = useRef<HTMLButtonElement>(null)
  const moreFiltersPanelRef = useRef<HTMLDivElement>(null)
  const filterDropdownPanelRef = useRef<HTMLDivElement>(null)
  const filterButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const morePanelAnchorRef = useRef<HTMLElement | null>(null)
  const skipMoreFilterDebounceRef = useRef(false)
  const previousFilterDropdownRef = useRef<string | null>(null)

  useEffect(() => {
    const previous = previousFilterDropdownRef.current
    const next =
      activeFilterDropdown === 'more'
        ? activeFilterGroup
        : activeFilterDropdown || null

    if (previous === next) return

    previousFilterDropdownRef.current = next
    onFilterMenuOpenChange?.(next)
  }, [activeFilterDropdown, activeFilterGroup, onFilterMenuOpenChange])

  const updateFilterDropdownPosition = useCallback(() => {
    if (!activeFilterDropdown || activeFilterDropdown === 'more') {
      setFilterDropdownPos(null)
      return
    }

    const anchor = filterButtonRefs.current[activeFilterDropdown]
    if (!anchor) return

    const filter = filters.find((item) => item.id === activeFilterDropdown)
    const width = Math.min(filter?.width || 240, 280)
    const rect = anchor.getBoundingClientRect()

    let left = rect.left
    let top = rect.bottom + 6

    if (left + width > window.innerWidth - VIEWPORT_GAP) {
      left = Math.max(VIEWPORT_GAP, window.innerWidth - width - VIEWPORT_GAP)
    }

    const estimatedHeight = 320
    if (top + estimatedHeight > window.innerHeight - VIEWPORT_GAP) {
      top = Math.max(VIEWPORT_GAP, rect.top - estimatedHeight - 6)
    }

    setFilterDropdownPos({ left, top, width })
  }, [activeFilterDropdown, filters])

  const updateMorePanelPosition = useCallback(() => {
    const anchor = morePanelAnchorRef.current || moreFiltersButtonRef.current
    if (!anchor) return

    const rect = anchor.getBoundingClientRect()
    let left = rect.left
    let top = rect.bottom + 6

    if (left + MORE_FILTER_PANEL_WIDTH > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - MORE_FILTER_PANEL_WIDTH - 8)
    }
    if (top + MORE_FILTER_PANEL_HEIGHT > window.innerHeight - 8) {
      top = Math.max(8, rect.top - MORE_FILTER_PANEL_HEIGHT - 6)
    }

    setMorePanelPos({ left, top })
  }, [])

  const openMoreFilters = useCallback(
    (anchor: HTMLElement | null, groupId?: string | null) => {
      const nextGroup =
        groupId ||
        activeFilterGroup ||
        moreFilters?.find((group) => !activeFilters[group.id])?.id ||
        moreFilters?.[0]?.id ||
        null

      morePanelAnchorRef.current = anchor
      setMoreFilterFieldSearch('')
      setActiveFilterGroup(nextGroup)
      setActiveFilterDropdown('more')
      skipMoreFilterDebounceRef.current = true
      setFilterSearchQuery(nextGroup ? activeFilters[nextGroup] || '' : '')
    },
    [activeFilterGroup, activeFilters, moreFilters],
  )

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      const element = target instanceof Element ? target : target.parentElement

      const activeButton =
        activeFilterDropdown && activeFilterDropdown !== 'more'
          ? filterButtonRefs.current[activeFilterDropdown]
          : null
      const inActiveFilterButton = Boolean(activeButton?.contains(target))
      const inMoreButton = Boolean(
        moreFiltersButtonRef.current?.contains(target),
      )
      const inPanel = Boolean(moreFiltersPanelRef.current?.contains(target))
      const inFilterDropdown = Boolean(
        filterDropdownPanelRef.current?.contains(target),
      )
      // Date picker / Mantine portals render outside the panel
      const inDatePicker = Boolean(
        element?.closest(
          [
            '[data-portal]',
            '[data-mantine-portal]',
            '[data-dates-dropdown]',
            '.mantine-Popover-dropdown',
            '.mantine-DatePicker-dropdown',
            '.mantine-DateInput-dropdown',
            '.mantine-DatePickerInput-dropdown',
          ].join(', '),
        ),
      )

      if (
        !inActiveFilterButton &&
        !inMoreButton &&
        !inPanel &&
        !inFilterDropdown &&
        !inDatePicker
      ) {
        setActiveFilterDropdown(null)
        setMoreFilterFieldSearch('')
      }
    }

    // Use click (not mousedown) so date selection onChange runs first
    document.addEventListener('click', handleClickOutside, true)
    return () => {
      document.removeEventListener('click', handleClickOutside, true)
    }
  }, [activeFilterDropdown])

  useEffect(() => {
    if (!activeFilterDropdown || activeFilterDropdown === 'more') {
      setFilterDropdownPos(null)
      return
    }

    updateFilterDropdownPosition()
    const onReposition = () => updateFilterDropdownPosition()
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)

    return () => {
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [activeFilterDropdown, updateFilterDropdownPosition])

  useEffect(() => {
    if (activeFilterDropdown !== 'more') {
      setMorePanelPos(null)
      morePanelAnchorRef.current = null
      return
    }

    updateMorePanelPosition()
    const onReposition = () => updateMorePanelPosition()
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [activeFilterDropdown, updateMorePanelPosition])

  useEffect(() => {
    if (activeFilterDropdown !== 'more' || !activeFilterGroup) return

    const activeGroup = moreFilters?.find(
      (group) => group.id === activeFilterGroup,
    )
    // Menu-driven filters manage values themselves (no free-text debounce)
    if (
      isDateColumnType(activeGroup?.dataType) ||
      isNumberColumnType(activeGroup?.dataType) ||
      (activeGroup?.options && activeGroup.options.length > 0) ||
      (activeGroup?.actions && activeGroup.actions.length > 0)
    ) {
      return
    }

    if (skipMoreFilterDebounceRef.current) {
      skipMoreFilterDebounceRef.current = false
      return
    }

    const trimmed = filterSearchQuery.trim()
    const current = String(activeFilters[activeFilterGroup] ?? '').trim()
    if (trimmed === current) return

    const timer = window.setTimeout(() => {
      onFilterChange(activeFilterGroup, trimmed)
    }, MORE_FILTER_DEBOUNCE_MS)

    return () => window.clearTimeout(timer)
  }, [
    activeFilterDropdown,
    activeFilterGroup,
    activeFilters,
    filterSearchQuery,
    moreFilters,
    onFilterChange,
  ])

  // Default filter dropdown: apply typed value when options are empty
  useEffect(() => {
    if (!activeFilterDropdown || activeFilterDropdown === 'more') return

    const activeFilter = filters.find(
      (filter) => filter.id === activeFilterDropdown,
    )
    if (!activeFilter?.searchable) return
    if ((activeFilter.options ?? []).length > 0) return

    if (skipMoreFilterDebounceRef.current) {
      skipMoreFilterDebounceRef.current = false
      return
    }

    const trimmed = filterSearchQuery.trim()
    const current = String(activeFilters[activeFilterDropdown] ?? '').trim()
    if (trimmed === current) return

    const timer = window.setTimeout(() => {
      onFilterChange(activeFilterDropdown, trimmed)
    }, MORE_FILTER_DEBOUNCE_MS)

    return () => window.clearTimeout(timer)
  }, [
    activeFilterDropdown,
    activeFilters,
    filterSearchQuery,
    filters,
    onFilterChange,
  ])

  const applyMultiFilter = useCallback(
    (id: string, values: string[]) => {
      onFilterChange(id, serializeFilterValues(values))
    },
    [onFilterChange],
  )

  const moreFiltersPanel =
    activeFilterDropdown === 'more' &&
    morePanelPos &&
    moreFilters &&
    moreFilters.length > 0
      ? createPortal(
          <div
            className='animate-in fade-in zoom-in-95 fixed flex max-h-[340px] overflow-hidden rounded-lg border border-border-default bg-surface shadow-md'
            ref={moreFiltersPanelRef}
            style={{
              left: morePanelPos.left,
              top: morePanelPos.top,
              zIndex: FILTER_MENU_Z_INDEX,
            }}
          >
            <div className='flex max-h-[340px] w-[184px] shrink-0 flex-col border-r border-border-default bg-primary-3/30 dark:bg-gray-12'>
              <div className='border-b border-border-default/60 p-1.5'>
                <div className='relative flex items-center'>
                  <Search className='pointer-events-none absolute left-2 h-3.5 w-3.5 text-text-muted' />
                  <input
                    type='text'
                    value={moreFilterFieldSearch}
                    onChange={(e) => setMoreFilterFieldSearch(e.target.value)}
                    placeholder={t`Search fields...`}
                    className='w-full rounded-md border border-border-default bg-surface py-1 pr-6 pl-7 text-12 text-text-primary placeholder:text-text-muted focus:border-primary-9 focus:outline-none'
                    autoFocus
                  />
                  {moreFilterFieldSearch ? (
                    <button
                      type='button'
                      onClick={() => setMoreFilterFieldSearch('')}
                      className='absolute right-1.5 flex h-4 w-4 items-center justify-center rounded-full text-text-muted hover:bg-gray-4 hover:text-text-primary'
                    >
                      <X className='h-3 w-3' />
                    </button>
                  ) : null}
                </div>
              </div>

              <div className='ez-scrollbar flex flex-1 flex-col overflow-y-auto p-1'>
                {filteredMoreFilterGroups.map((group) => {
                  const IconComp = group.icon
                  const isActive = activeFilterGroup === group.id
                  return (
                    <button
                      key={group.id}
                      type='button'
                      className={cn(
                        'flex w-full cursor-pointer items-center justify-between rounded-md px-2.5 py-1.5 text-left text-12 transition-all',
                        isActive
                          ? 'bg-primary-3 text-primary-9 dark:bg-primary-9 dark:text-white'
                          : 'hover:bg-gray-2 dark:hover:bg-gray-10',
                      )}
                      onClick={() => {
                        setActiveFilterGroup(group.id)
                        skipMoreFilterDebounceRef.current = true
                        setFilterSearchQuery(activeFilters[group.id] || '')
                      }}
                    >
                      <span className='flex min-w-0 items-center gap-1.5'>
                        {IconComp && (
                          <IconComp className='h-3.5 w-3.5 shrink-0' />
                        )}
                        <span className='truncate'>{group.label}</span>
                      </span>
                      <ChevronRight className='h-3 w-3 shrink-0 opacity-60' />
                    </button>
                  )
                })}
                {filteredMoreFilterGroups.length === 0 ? (
                  <div className='px-2 py-4 text-center text-12 text-text-muted'>
                    {t`No fields found`}
                  </div>
                ) : null}
              </div>
            </div>

            <div className='ez-scrollbar flex max-h-[340px] w-max max-w-64 flex-col overflow-hidden bg-surface'>
              {moreFilters.map((group) => {
                if (activeFilterGroup !== group.id) return null
                const selectedValues = parseFilterValues(
                  activeFilters[group.id],
                )

                if (isDateColumnType(group.dataType)) {
                  return (
                    <DateFilterMenu
                      key={group.id}
                      selectedValues={selectedValues}
                      options={
                        group.options?.length
                          ? group.options
                          : DEFAULT_DATE_RANGE_OPTIONS
                      }
                      onChange={(vals) => {
                        skipMoreFilterDebounceRef.current = true
                        onFilterChange(group.id, vals[0] || '')
                      }}
                      onClear={() => {
                        skipMoreFilterDebounceRef.current = true
                        onFilterChange(group.id, '')
                        setActiveFilterDropdown(null)
                      }}
                    />
                  )
                }

                if (isNumberColumnType(group.dataType)) {
                  return (
                    <NumberFilterMenu
                      isLoading={isLoading}
                      key={group.id}
                      options={group.options || []}
                      selectedValues={selectedValues}
                      onChange={(vals) => {
                        skipMoreFilterDebounceRef.current = true
                        applyMultiFilter(group.id, vals)
                        setActiveFilterDropdown(null)
                      }}
                      onClear={() => {
                        skipMoreFilterDebounceRef.current = true
                        onFilterChange(group.id, '')
                        setActiveFilterDropdown(null)
                      }}
                    />
                  )
                }

                if (group.options) {
                  return (
                    <CategoryFilterMenu
                      isLoading={isLoading}
                      key={group.id}
                      label={group.label}
                      options={group.options}
                      selectedValues={selectedValues}
                      onChange={(vals) => {
                        skipMoreFilterDebounceRef.current = true
                        applyMultiFilter(group.id, vals)
                        setActiveFilterDropdown(null)
                      }}
                      onClear={() => {
                        skipMoreFilterDebounceRef.current = true
                        onFilterChange(group.id, '')
                        setActiveFilterDropdown(null)
                      }}
                    />
                  )
                }

                if (group.actions && group.actions.length > 0) {
                  return (
                    <CategoryFilterMenu
                      isLoading={isLoading}
                      key={group.id}
                      label={group.label}
                      options={group.actions}
                      selectedValues={selectedValues}
                      onChange={(vals) => {
                        skipMoreFilterDebounceRef.current = true
                        applyMultiFilter(group.id, vals)
                        setActiveFilterDropdown(null)
                      }}
                      onClear={() => {
                        skipMoreFilterDebounceRef.current = true
                        onFilterChange(group.id, '')
                        setActiveFilterDropdown(null)
                      }}
                    />
                  )
                }

                // Free-text fallback when no options are provided
                return (
                  <div className='flex flex-col p-2' key={group.id}>
                    <div className='relative rounded-md border border-border-default'>
                      <Search className='absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-text-muted' />
                      <input
                        className={FILTER_SEARCH_INPUT}
                        placeholder={`Filter ${group.label.toLowerCase()}...`}
                        type='text'
                        value={filterSearchQuery}
                        autoFocus
                        onChange={(e) => setFilterSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <div
      className='relative z-40 flex w-full shrink-0 flex-wrap items-center justify-between gap-2.5 rounded-lg border border-[var(--border-default)] bg-surface p-2.5 shadow-xs'
      ref={filtersRef}
    >
      {/* Filters wrap onto new lines when they overflow */}
      <div className='flex min-w-[240px] flex-1 flex-wrap items-center gap-2'>
        {quickFilters &&
          quickFilters.map((qf) => {
            const isActive = activeQuickFilters?.includes(qf.id)
            return (
              <button
                key={qf.id}
                className={cn(
                  FILTER_CHIP_SHELL,
                  'cursor-pointer gap-1.5 pr-3.5',
                  isActive ? FILTER_CHIP_ACTIVE : FILTER_CHIP_INACTIVE,
                  !isActive && 'hover:bg-gray-3 dark:hover:bg-gray-10',
                )}
                onClick={() => onQuickFilterToggle?.(qf.id)}
              >
                {qf.icon && <Icon className='size-3.5' name={qf.icon} />}
                <span className='truncate'>{qf.label}</span>
              </button>
            )
          })}

        {filters.map((filter) => {
          const selectedValues = parseFilterValues(activeFilters[filter.id])
          const firstValue = selectedValues[0] || ''
          const firstOption = (filter.options ?? []).find(
            (o) => o.value === firstValue,
          )
          let displayLabel = filter.label
          if (selectedValues.length === 1) {
            const optionLabel = firstOption?.label || ''
            const valueLabel = isDateColumnType(filter.dataType)
              ? firstValue.startsWith('custom:')
                ? formatDateChipLabel(firstValue)
                : optionLabel || formatDateChipLabel(firstValue)
              : optionLabel || firstValue
            displayLabel =
              valueLabel.toLowerCase() === 'all'
                ? filter.label
                : `${filter.label} : ${valueLabel}`
          } else if (selectedValues.length > 1) {
            const valueLabel = firstOption?.label || firstValue
            displayLabel =
              valueLabel.toLowerCase() === 'all'
                ? filter.label
                : `${filter.label} : ${valueLabel}`
          }
          const isActive =
            selectedValues.length > 0 || activeFilterDropdown === filter.id
          const isDate =
            isDateColumnType(filter.dataType) ||
            filter.id === 'timeframe' ||
            /date|timeframe|period/i.test(filter.id) ||
            /date|timeframe|period/i.test(filter.label)
          const isNumber = isNumberColumnType(filter.dataType)

          return (
            <div
              key={filter.id}
              className={cn(
                'relative',
                activeFilterDropdown === filter.id && 'z-[10000]',
              )}
            >
              <div
                className={cn(
                  FILTER_CHIP_SHELL,
                  'pr-1.5',
                  isActive ? FILTER_CHIP_ACTIVE : FILTER_CHIP_INACTIVE,
                )}
              >
                <button
                  className='flex min-w-0 cursor-pointer items-center gap-1.5 hover:opacity-80'
                  type='button'
                  ref={(node) => {
                    filterButtonRefs.current[filter.id] = node
                  }}
                  onClick={() => {
                    const nextOpen =
                      activeFilterDropdown === filter.id ? null : filter.id
                    setActiveFilterDropdown(nextOpen)
                    skipMoreFilterDebounceRef.current = true
                    setFilterSearchQuery('')
                  }}
                >
                  <span className='truncate'>{displayLabel}</span>
                  {selectedValues.length > 1 && (
                    <span className={FILTER_CHIP_COUNT}>
                      +{selectedValues.length - 1}
                    </span>
                  )}
                  <span className={FILTER_CHIP_TRAILING}>
                    <ChevronDown className='h-3 w-3 opacity-60' />
                  </span>
                </button>
                {selectedValues.length > 0 ? (
                  <Tooltip content={`Clear ${filter.label}`}>
                    <button
                      aria-label={`Clear ${filter.label}`}
                      className={FILTER_CHIP_CLEAR_BTN}
                      type='button'
                      onClick={(event) => {
                        event.stopPropagation()
                        onFilterChange(filter.id, '')
                        if (activeFilterDropdown === filter.id) {
                          setActiveFilterDropdown(null)
                        }
                      }}
                    >
                      <X className='h-3 w-3' />
                    </button>
                  </Tooltip>
                ) : null}
              </div>

              {activeFilterDropdown === filter.id &&
                filterDropdownPos &&
                createPortal(
                  <div
                    className='animate-in fade-in slide-in-from-top-2 fixed overflow-hidden rounded-lg border border-border-default bg-surface shadow-md'
                    ref={filterDropdownPanelRef}
                    style={{
                      left: filterDropdownPos.left,
                      top: filterDropdownPos.top,
                      zIndex: FILTER_MENU_Z_INDEX,
                    }}
                  >
                    {isDate ? (
                      <DateFilterMenu
                        selectedValues={selectedValues}
                        options={
                          filter.options?.length > 0
                            ? filter.options
                            : DEFAULT_DATE_RANGE_OPTIONS
                        }
                        onChange={(vals) => {
                          skipMoreFilterDebounceRef.current = true
                          onFilterChange(filter.id, vals[0] || '')
                        }}
                        onClear={() => {
                          onFilterChange(filter.id, '')
                          setActiveFilterDropdown(null)
                        }}
                      />
                    ) : isNumber ? (
                      <NumberFilterMenu
                        isLoading={isLoading}
                        options={filter.options}
                        selectedValues={selectedValues}
                        onChange={(vals) => {
                          skipMoreFilterDebounceRef.current = true
                          applyMultiFilter(filter.id, vals)
                          // Close so folders page commits deferred filters and calls API on Apply
                          setActiveFilterDropdown(null)
                        }}
                        onClear={() => {
                          onFilterChange(filter.id, '')
                          setActiveFilterDropdown(null)
                        }}
                      />
                    ) : (
                      <CategoryFilterMenu
                        isLoading={isLoading}
                        label={filter.label}
                        options={filter.options}
                        selectedValues={selectedValues}
                        onChange={(vals) => {
                          skipMoreFilterDebounceRef.current = true
                          applyMultiFilter(filter.id, vals)
                          // Close so folders page commits deferred filters and calls API on Apply
                          setActiveFilterDropdown(null)
                        }}
                        onClear={() => {
                          onFilterChange(filter.id, '')
                          setActiveFilterDropdown(null)
                        }}
                      />
                    )}
                  </div>,
                  document.body,
                )}
            </div>
          )
        })}

        {moreFilters
          ?.filter((group) => Boolean(activeFilters[group.id]))
          .map((group) => {
            const selectedValues = parseFilterValues(activeFilters[group.id])
            const firstValue = selectedValues[0] || ''
            const firstOption =
              group.options?.find((o) => o.value === firstValue) ||
              group.actions?.find((o) => o.value === firstValue)
            const isOpen =
              activeFilterDropdown === 'more' && activeFilterGroup === group.id

            let valueLabel = firstValue
            if (isDateColumnType(group.dataType)) {
              valueLabel = formatDateChipLabel(firstValue)
            } else if (firstOption) {
              valueLabel = firstOption.label
            }
            const chipText =
              valueLabel.toLowerCase() === 'all'
                ? group.label
                : `${group.label} : ${valueLabel}`

            return (
              <div className='relative' key={`chip-${group.id}`}>
                <div
                  className={cn(
                    FILTER_CHIP_SHELL,
                    'pr-1.5',
                    FILTER_CHIP_ACTIVE,
                  )}
                >
                  <button
                    className='flex min-w-0 cursor-pointer items-center gap-1.5 hover:opacity-80'
                    type='button'
                    onClick={(event) => {
                      if (isOpen) {
                        setActiveFilterDropdown(null)
                        return
                      }
                      openMoreFilters(event.currentTarget, group.id)
                    }}
                  >
                    <span className='truncate'>{chipText}</span>
                    {selectedValues.length > 1 && (
                      <span className={FILTER_CHIP_COUNT}>
                        +{selectedValues.length - 1}
                      </span>
                    )}
                  </button>
                  <Tooltip content={`Clear ${group.label}`}>
                    <button
                      aria-label={`Clear ${group.label}`}
                      className={FILTER_CHIP_CLEAR_BTN}
                      type='button'
                      onClick={(event) => {
                        event.stopPropagation()
                        skipMoreFilterDebounceRef.current = true
                        setFilterSearchQuery('')
                        onFilterChange(group.id, '')
                        if (isOpen) setActiveFilterDropdown(null)
                      }}
                    >
                      <X className='h-3 w-3' />
                    </button>
                  </Tooltip>
                </div>
              </div>
            )
          })}

        {moreFilters && moreFilters.length > 0 && (
          <Tooltip content={moreFiltersLabel || 'More filters'}>
            <button
              ref={moreFiltersButtonRef}
              type='button'
              className={cn(
                'inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-all',
                activeFilterDropdown === 'more'
                  ? 'border-primary-9 bg-primary-3/50 text-primary-9'
                  : 'border-border-default bg-surface text-text-secondary hover:bg-gray-2',
              )}
              onClick={() => {
                if (activeFilterDropdown === 'more') {
                  setActiveFilterDropdown(null)
                  return
                }
                openMoreFilters(moreFiltersButtonRef.current)
              }}
            >
              <Icon className='h-3.5 w-3.5' name='tabler:plus' />
            </button>
          </Tooltip>
        )}

        {showReset && (
          <button
            className='inline-flex h-8 shrink-0 items-center justify-center cursor-pointer px-1 text-12 font-medium text-text-secondary transition-colors hover:text-text-primary hover:underline'
            type='button'
            onClick={() => {
              onReset()
              setFilterSearchQuery('')
              setActiveFilterDropdown(null)
            }}
          >
            Reset
          </button>
        )}
      </div>

      {/* Actions stay aligned and wrap cleanly when space is constrained */}
      <div className='flex min-w-0 flex-wrap items-center justify-end gap-1.5 ml-auto'>
        {customSearchComponent ? (
          customSearchComponent
        ) : hideSearch || !onSearchChange ? null : (
          <div
            className={cn(
              'flex h-8 items-center rounded-md border transition-all duration-300 select-none focus-within:border-primary-6',
              isSearchExpanded || searchQuery
                ? 'w-44 sm:w-60 md:w-72 max-w-full justify-start border-[var(--border-default)] bg-surface pr-1.5 pl-3'
                : 'w-8 cursor-pointer justify-center border-[var(--border-default)] bg-surface text-gray-11 hover:bg-gray-4 hover:text-gray-12 active:scale-95',
            )}
            onClick={() => {
              if (!isSearchExpanded) {
                setIsSearchExpanded(true)
              }
              setTimeout(() => searchInputRef.current?.focus(), 30)
            }}
          >
            <Tooltip
              content={t`Search`}
              disabled={isSearchExpanded || !!searchQuery}
            >
              <div className='flex shrink-0 items-center gap-1.5'>
                <Icon
                  name='lucide:search'
                  className={cn(
                    'size-4 shrink-0 transition-colors',
                    isSearchExpanded || searchQuery
                      ? 'text-gray-11'
                      : 'text-gray-11 hover:text-gray-12',
                  )}
                />
              </div>
            </Tooltip>

            <div
              className={cn(
                'flex h-full items-center transition-[width] duration-300',
                isSearchExpanded || searchQuery
                  ? 'w-full flex-1'
                  : 'w-0 flex-none overflow-hidden',
              )}
            >
              <input
                placeholder={searchPlaceholder}
                ref={searchInputRef}
                type='text'
                value={searchQuery}
                className={cn(
                  'h-full w-full border-0 bg-transparent px-2 text-13 font-medium text-[var(--gray-13)] outline-none placeholder:text-[var(--gray-8)]',
                  isSearchExpanded || searchQuery
                    ? 'opacity-100'
                    : 'pointer-events-none opacity-0',
                )}
                onBlur={() => {
                  // Only collapse if there's no query
                  if (!searchQuery) setIsSearchExpanded(false)
                }}
                onChange={(e) => onSearchChange(e.target.value)}
                onFocus={() => setIsSearchExpanded(true)}
              />
              {searchQuery ? (
                <button
                  aria-label={t`Clear search`}
                  className='flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full text-gray-11 transition-colors hover:bg-gray-3 hover:text-gray-13'
                  type='button'
                  onClick={(e) => {
                    e.stopPropagation()
                    onSearchChange('')
                    setTimeout(() => searchInputRef.current?.focus(), 30)
                  }}
                >
                  <X className='size-3.5' />
                </button>
              ) : null}
            </div>
          </div>
        )}

        {afterSearchActions ? (
          <div className='flex shrink-0 items-center gap-1.5'>
            {afterSearchActions}
          </div>
        ) : null}

        {viewMode && onViewModeChange && (
          <div className='flex h-8 shrink-0 box-border items-center gap-[2px] rounded-md border border-[var(--border-default)] bg-[var(--gray-1)] p-[2px]'>
            <Tooltip content={t`Grid View`} openDelay={500}>
              <button
                type='button'
                className={cn(
                  'flex h-[26px] cursor-pointer items-center justify-center rounded px-2 transition-all duration-200',
                  viewMode === 'grid'
                    ? 'bg-surface text-[var(--primary-9)] shadow-xs'
                    : 'text-[var(--gray-10)] hover:text-[var(--gray-12)]',
                )}
                onClick={() => onViewModeChange('grid')}
              >
                <Icon className='size-4' name='tabler:layout-grid' />
              </button>
            </Tooltip>
            <Tooltip content={t`Table View`} openDelay={500}>
              <button
                type='button'
                className={cn(
                  'flex h-[26px] cursor-pointer items-center justify-center rounded px-2 transition-all duration-200',
                  viewMode === 'table'
                    ? 'bg-surface text-[var(--primary-9)] shadow-xs'
                    : 'text-[var(--gray-10)] hover:text-[var(--gray-12)]',
                )}
                onClick={() => onViewModeChange('table')}
              >
                <Icon className='size-4' name='tabler:table' />
              </button>
            </Tooltip>
          </div>
        )}

        {actionButtons && actionButtons.length > 0 && (
          <div className='flex shrink-0 items-center gap-1.5'>
            {actionButtons.map((btn) => {
              if (btn.node) {
                return (
                  <span className='inline-flex h-8 items-center' key={btn.id}>
                    {btn.node}
                  </span>
                )
              }

              const btnEl = btn.isIconButton ? (
                <IconButton
                  aria-label={btn.tooltip || btn.label || btn.id}
                  className='h-8 w-8 shrink-0 box-border rounded-md border border-[var(--border-default)] bg-surface text-gray-11 hover:bg-gray-4 hover:text-gray-12 active:scale-95'
                  color={(btn.color as any) || 'gray'}
                  disabled={btn.disabled}
                  icon={btn.icon!}
                  key={btn.id}
                  size='md'
                  variant={btn.variant || 'outline'}
                  onClick={btn.onClick}
                />
              ) : (
                <Button
                  className='h-8 rounded-md text-[13px] font-semibold'
                  color={btn.color || 'primary'}
                  disabled={btn.disabled}
                  icon={btn.iconNode ? undefined : btn.icon}
                  key={btn.id}
                  label={btn.label}
                  leftSection={btn.iconNode}
                  size='md'
                  variant={btn.variant || 'solid'}
                  onClick={btn.onClick}
                />
              )

              return btn.tooltip ? (
                <Tooltip content={btn.tooltip} key={btn.id}>
                  {btnEl}
                </Tooltip>
              ) : (
                btnEl
              )
            })}
          </div>
        )}

        {trailingActions ? (
          <div className='flex shrink-0 items-center gap-1.5'>
            {trailingActions}
          </div>
        ) : null}

        {addButton && (
          <div className='flex shrink-0 items-center'>
            {addButton.tooltip ? (
              <Tooltip content={addButton.tooltip}>
                {addButton.label ? (
                  <Button
                    color='primary'
                    icon={addButton.icon || 'lucide:plus'}
                    label={addButton.label}
                    size='md'
                    variant='solid'
                    onClick={addButton.onClick}
                  />
                ) : (
                  <IconButton
                    ariaLabel={addButton.tooltip}
                    color='primary'
                    icon={addButton.icon || 'lucide:plus'}
                    size='md'
                    variant='solid'
                    onClick={addButton.onClick}
                  />
                )}
              </Tooltip>
            ) : addButton.label ? (
              <Button
                color='primary'
                label={addButton.label}
                size='md'
                suffixIcon={addButton.icon || 'lucide:plus'}
                variant='solid'
                onClick={addButton.onClick}
              />
            ) : (
              <IconButton
                ariaLabel='Add'
                color='primary'
                icon={addButton.icon || 'lucide:plus'}
                size='md'
                variant='solid'
                onClick={addButton.onClick}
              />
            )}
          </div>
        )}
      </div>

      {moreFiltersPanel}
    </div>
  )
}
