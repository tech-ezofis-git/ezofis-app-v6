import { useLingui } from '@lingui/react/macro'
import { ChevronDown, Plus, Search, X } from 'lucide-react'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from '@/components/base/icon/Icon'
import Tooltip from '@/components/base/Tooltip'
import cn from '@/utils/cn'
import {
  detectFieldType,
  type FilterFieldType,
  type FilterOption,
  generateCategoryOptions,
  generateDateRanges,
  generateNumericBuckets,
} from '@/utils/filterUtils'
import {
  CategoryFilterMenu,
  DateFilterMenu,
  NumberFilterMenu,
} from './filters/FilterMenus'
import { FilterToolbar, type ToolbarAction } from './filters/FilterToolbar'

const FILTER_MENU_Z_INDEX = 50000
const VIEWPORT_GAP = 8

/** Shared chip shell — same size for default and added filter columns */
const FILTER_CHIP_SHELL =
  'inline-flex h-[30px] max-w-[280px] items-center gap-1 rounded-full border py-0 pl-3.5 text-12 font-normal transition-all'
const FILTER_CHIP_ACTIVE = 'border-primary-9 bg-primary-3/50 text-primary-9'
const FILTER_CHIP_INACTIVE =
  'border-border-default bg-surface text-text-secondary'
const FILTER_CHIP_CLEAR_BTN =
  'inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full text-current opacity-60 transition-colors hover:bg-gray-3 hover:opacity-100'
const FILTER_CHIP_COUNT =
  'inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-gray-3 px-1 text-10 font-medium text-text-primary tabular-nums'
/** Keeps chip trailing space equal when no chevron / remove icon */
const FILTER_CHIP_TRAILING =
  'inline-flex size-5 shrink-0 items-center justify-center'

export interface DynamicFilterField {
  id: string
  label: string
  options?: FilterOption[]
  type?: FilterFieldType
  width?: number
  valueGetter?: (item: any) => any
}

export interface DynamicFilterProps {
  activeFilters: Record<string, string | string[]>
  dataset: any[]
  fields: DynamicFilterField[]
  activeQuickFilters?: string[]
  customSearchComponent?: React.ReactNode
  /** True while list data is fetching after a filter apply */
  isLoading?: boolean
  /** Extra filters available via the "Add filter" menu (not shown by default). */
  optionalFields?: DynamicFilterField[]
  quickFilters?: QuickFilterOption[]
  searchPlaceholder?: string
  searchQuery?: string
  toolbarActions?: ToolbarAction[]
  viewMode?: 'grid' | 'kanban' | 'table'
  onClearAll?: () => void
  onFieldOpen?: (field: DynamicFilterField) => void
  onFilterChange: (id: string, values: string | string[]) => void
  onQuickFilterToggle?: (id: string) => void
  onSearchChange?: (val: string) => void
  onViewModeChange?: (mode: 'grid' | 'kanban' | 'table') => void
}

export interface QuickFilterOption {
  id: string
  label: string
  count?: number
  icon?: string
  options?: { label: string; value: string }[]
  type?: 'date' | 'category' | 'number'
}

export default function DynamicFilter({
  activeFilters,
  activeQuickFilters,
  customSearchComponent,
  dataset,
  fields,
  isLoading = false,
  optionalFields = [],
  quickFilters,
  searchPlaceholder = 'Search...',
  searchQuery,
  toolbarActions,
  viewMode,
  onClearAll,
  onFieldOpen,
  onFilterChange,
  onQuickFilterToggle,
  onSearchChange,
  onViewModeChange,
}: DynamicFilterProps) {
  const { t } = useLingui()
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [dropdownPos, setDropdownPos] = useState<{
    left: number
    top: number
    width?: number
  } | null>(null)
  const [addedFieldIds, setAddedFieldIds] = useState<string[]>([])
  const [addFilterSearch, setAddFilterSearch] = useState('')

  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownPanelRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  const getActiveArray = (val: string | string[] | undefined): string[] => {
    if (!val) return []
    if (Array.isArray(val)) return val
    return typeof val === 'string' && val.includes(',') ? val.split(',') : [val]
  }

  const visibleFields = useMemo(() => {
    const optionalVisible = optionalFields.filter(
      (field) =>
        addedFieldIds.includes(field.id) ||
        getActiveArray(activeFilters[field.id]).length > 0,
    )
    const seen = new Set(fields.map((f) => f.id))
    return [
      ...fields,
      ...optionalVisible.filter((f) => {
        if (seen.has(f.id)) return false
        seen.add(f.id)
        return true
      }),
    ]
  }, [fields, optionalFields, addedFieldIds, activeFilters])

  const addableFields = useMemo(
    () =>
      optionalFields.filter(
        (field) => !visibleFields.some((visible) => visible.id === field.id),
      ),
    [optionalFields, visibleFields],
  )

  const filteredAddableFields = useMemo(() => {
    const query = addFilterSearch.trim().toLowerCase()
    if (!query) return addableFields
    return addableFields.filter((field) =>
      field.label.toLowerCase().includes(query),
    )
  }, [addableFields, addFilterSearch])

  useEffect(() => {
    if (activeDropdown !== 'add_filter') {
      setAddFilterSearch('')
    }
  }, [activeDropdown])

  const allFieldsForData = useMemo(
    () => [...fields, ...optionalFields],
    [fields, optionalFields],
  )

  const fieldData = useMemo(() => {
    const data: Record<
      string,
      { options: FilterOption[]; type: FilterFieldType }
    > = {}
    for (const field of allFieldsForData) {
      if (field.options && field.options.length > 0) {
        data[field.id] = {
          options: field.options,
          type: field.type || 'category',
        }
        continue
      }

      const type =
        field.type && field.type !== 'unknown'
          ? field.type
          : detectFieldType(dataset, field.id, field.valueGetter)
      let options: FilterOption[] = []
      if (type === 'category' || type === 'boolean' || type === 'unknown') {
        options = generateCategoryOptions(dataset, field.id, field.valueGetter)
      } else if (type === 'number') {
        options = generateNumericBuckets(dataset, field.id, field.valueGetter)
      } else if (type === 'date') {
        options = generateDateRanges(dataset, field.id, field.valueGetter)
      }
      data[field.id] = { options, type }
    }
    return data
  }, [dataset, allFieldsForData])

  const updateDropdownPosition = useCallback(() => {
    if (!activeDropdown) {
      setDropdownPos(null)
      return
    }
    const anchor = buttonRefs.current[activeDropdown]
    if (!anchor) return
    const rect = anchor.getBoundingClientRect()
    let left = rect.left
    let top = rect.bottom + 6
    const estimatedWidth = 260
    if (left + estimatedWidth > window.innerWidth - VIEWPORT_GAP) {
      left = Math.max(
        VIEWPORT_GAP,
        window.innerWidth - estimatedWidth - VIEWPORT_GAP,
      )
    }
    const estimatedHeight = 292
    if (top + estimatedHeight > window.innerHeight - VIEWPORT_GAP) {
      top = Math.max(VIEWPORT_GAP, rect.top - estimatedHeight - 6)
    }
    setDropdownPos({ left, top })
  }, [activeDropdown])

  useEffect(() => {
    if (!activeDropdown) {
      setDropdownPos(null)
      return
    }
    updateDropdownPosition()
    window.addEventListener('resize', updateDropdownPosition)
    window.addEventListener('scroll', updateDropdownPosition, true)
    return () => {
      window.removeEventListener('resize', updateDropdownPosition)
      window.removeEventListener('scroll', updateDropdownPosition, true)
    }
  }, [activeDropdown, updateDropdownPosition])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      const element = target instanceof Element ? target : target.parentElement

      const inDropdown = Boolean(dropdownPanelRef.current?.contains(target))
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

      if (!inDropdown && !inDatePicker) {
        setActiveDropdown(null)
      }
    }
    document.addEventListener('click', handleClickOutside, true)
    return () => document.removeEventListener('click', handleClickOutside, true)
  }, [])

  return (
    <div
      className='relative z-40 flex w-full items-center gap-2 rounded-lg border border-[var(--border-default)] bg-surface p-3 shadow-xs'
      ref={containerRef}
    >
      <div className='flex min-w-0 flex-1 flex-wrap items-center gap-2'>
        {quickFilters &&
          quickFilters.map((qf) => {
            const prefixedValues =
              activeQuickFilters
                ?.filter((f) => f.startsWith(`${qf.id}:`))
                .map((f) => f.replace(`${qf.id}:`, '')) || []
            const amountValues =
              qf.type === 'number'
                ? activeQuickFilters
                    ?.filter((f) => f.startsWith('amount:'))
                    .map((f) => f.replace('amount:', '')) || []
                : []
            const isActive =
              activeQuickFilters?.includes(qf.id) ||
              (qf.options &&
                qf.options.some(
                  (opt) =>
                    activeQuickFilters?.includes(opt.value) ||
                    prefixedValues.includes(opt.value) ||
                    amountValues.includes(opt.value),
                )) ||
              prefixedValues.some((v) => v.startsWith('custom:')) ||
              amountValues.some((v) => v.startsWith('custom:')) ||
              (qf.type === 'number' && amountValues.length > 0)
            const isOpen = activeDropdown === `quick_${qf.id}`

            let chipLabel = qf.label
            let chipCount = 0
            if (qf.type === 'date' && prefixedValues.length > 0) {
              const selected = prefixedValues[0]
              chipCount = prefixedValues.length
              if (selected.startsWith('custom:')) {
                const [start = '', end = ''] = selected
                  .replace('custom:', '')
                  .split('_')
                const formatChipDate = (value: string) => {
                  const parsed = new Date(value)
                  if (Number.isNaN(parsed.getTime())) return value
                  return parsed.toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                }
                chipLabel = `${qf.label} : ${formatChipDate(start)} – ${formatChipDate(end)}`
              } else {
                const opt = qf.options?.find((o) => o.value === selected)
                const optLabel = opt?.label || selected
                // "All" stays as just the filter name (active), not "Filter : All"
                chipLabel =
                  optLabel.toLowerCase() === 'all'
                    ? qf.label
                    : `${qf.label} : ${optLabel}`
              }
            } else if (qf.type === 'number' && amountValues.length > 0) {
              chipCount = amountValues.length
              const customSelected = amountValues.find((v) =>
                v.startsWith('custom:'),
              )
              if (customSelected) {
                const [min = '', max = ''] = customSelected
                  .replace('custom:', '')
                  .split('-')
                chipLabel = `${qf.label} : $${min} – $${max}`
              } else {
                const selectedOpts = amountValues
                  .map((v) => qf.options?.find((o) => o.value === v))
                  .filter(Boolean) as { label: string; value: string }[]
                if (selectedOpts.length >= 1) {
                  const optLabel = selectedOpts[0].label
                  chipLabel =
                    optLabel.toLowerCase() === 'all'
                      ? qf.label
                      : `${qf.label} : ${optLabel}`
                } else if (amountValues.length >= 1) {
                  chipLabel = `${qf.label} : ${amountValues[0]}`
                }
              }
            } else if (qf.options?.length) {
              const selectedOpts = qf.options.filter(
                (opt) =>
                  activeQuickFilters?.includes(opt.value) ||
                  prefixedValues.includes(opt.value),
              )
              chipCount = selectedOpts.length
              if (selectedOpts.length >= 1) {
                const optLabel = selectedOpts[0].label
                chipLabel =
                  optLabel.toLowerCase() === 'all'
                    ? qf.label
                    : `${qf.label} : ${optLabel}`
              }
            }

            return (
              <div className='relative' key={qf.id}>
                <button
                  className={cn(
                    FILTER_CHIP_SHELL,
                    'cursor-pointer gap-1.5',
                    qf.options ? 'pr-1.5' : 'pr-3.5',
                    isActive || isOpen
                      ? FILTER_CHIP_ACTIVE
                      : FILTER_CHIP_INACTIVE,
                    !(isActive || isOpen) &&
                      'hover:bg-gray-3 dark:hover:bg-gray-10',
                  )}
                  ref={(el) => {
                    buttonRefs.current[`quick_${qf.id}`] = el
                  }}
                  onClick={() => {
                    if (qf.options) {
                      setActiveDropdown(isOpen ? null : `quick_${qf.id}`)
                    } else {
                      onQuickFilterToggle?.(qf.id)
                    }
                  }}
                >
                  {qf.icon && (
                    <Icon className='size-3.5 shrink-0' name={qf.icon} />
                  )}
                  <span className='truncate'>{chipLabel}</span>
                  {chipCount > 1 && (
                    <span className={FILTER_CHIP_COUNT}>+{chipCount - 1}</span>
                  )}
                  {qf.options ? (
                    <span className={FILTER_CHIP_TRAILING}>
                      <ChevronDown className='h-3 w-3 opacity-60' />
                    </span>
                  ) : null}
                </button>

                {isOpen &&
                  dropdownPos &&
                  createPortal(
                    <div
                      className='animate-in fade-in slide-in-from-top-2 fixed overflow-hidden rounded-lg border border-border-default bg-surface shadow-md'
                      ref={dropdownPanelRef}
                      style={{
                        left: dropdownPos.left,
                        top: dropdownPos.top,
                        zIndex: FILTER_MENU_Z_INDEX,
                      }}
                    >
                      {qf.type === 'date' ? (
                        <DateFilterMenu
                          options={qf.options || []}
                          selectedValues={
                            activeQuickFilters
                              ?.filter((f) => f.startsWith(`${qf.id}:`))
                              .map((f) => f.replace(`${qf.id}:`, '')) || []
                          }
                          onChange={(newValues) => {
                            const oldValues =
                              activeQuickFilters
                                ?.filter((f) => f.startsWith(`${qf.id}:`))
                                .map((f) => f.replace(`${qf.id}:`, '')) || []
                            const added = newValues.filter(
                              (v) => !oldValues.includes(v),
                            )
                            const removed = oldValues.filter(
                              (v) => !newValues.includes(v),
                            )

                            added.forEach((v) =>
                              onQuickFilterToggle?.(`${qf.id}:${v}`),
                            )
                            removed.forEach((v) =>
                              onQuickFilterToggle?.(`${qf.id}:${v}`),
                            )
                          }}
                          onClear={() => {
                            const oldValues =
                              activeQuickFilters
                                ?.filter((f) => f.startsWith(`${qf.id}:`))
                                .map((f) => f.replace(`${qf.id}:`, '')) || []
                            oldValues.forEach((v) =>
                              onQuickFilterToggle?.(`${qf.id}:${v}`),
                            )
                          }}
                        />
                      ) : qf.type === 'number' ? (
                        <NumberFilterMenu
                          isLoading={isLoading}
                          options={qf.options || []}
                          selectedValues={
                            activeQuickFilters
                              ?.filter((f) => f.startsWith('amount:'))
                              .map((f) => f.replace('amount:', '')) || []
                          }
                          onChange={(newValues) => {
                            const oldValues =
                              activeQuickFilters
                                ?.filter((f) => f.startsWith('amount:'))
                                .map((f) => f.replace('amount:', '')) || []
                            const added = newValues.filter(
                              (v) => !oldValues.includes(v),
                            )
                            const removed = oldValues.filter(
                              (v) => !newValues.includes(v),
                            )

                            added.forEach((v) =>
                              onQuickFilterToggle?.(`amount:${v}`),
                            )
                            removed.forEach((v) =>
                              onQuickFilterToggle?.(`amount:${v}`),
                            )
                          }}
                          onClear={() => {
                            const oldValues =
                              activeQuickFilters?.filter((f) =>
                                f.startsWith('amount:'),
                              ) || []
                            oldValues.forEach((v) => onQuickFilterToggle?.(v))
                            if (activeQuickFilters?.includes('highValue')) {
                              onQuickFilterToggle?.('highValue')
                            }
                          }}
                        />
                      ) : (
                        <CategoryFilterMenu
                          isLoading={isLoading}
                          label={qf.label}
                          options={qf.options || []}
                          selectedValues={
                            qf.options
                              ?.map((opt) => opt.value)
                              .filter((v) => activeQuickFilters?.includes(v)) ||
                            []
                          }
                          onChange={(newValues) => {
                            const optionValues =
                              qf.options?.map((opt) => opt.value) || []
                            const oldValues = optionValues.filter((v) =>
                              activeQuickFilters?.includes(v),
                            )
                            const added = newValues.filter(
                              (v) => !oldValues.includes(v),
                            )
                            const removed = oldValues.filter(
                              (v) => !newValues.includes(v),
                            )

                            added.forEach((v) => onQuickFilterToggle?.(v))
                            removed.forEach((v) => onQuickFilterToggle?.(v))
                          }}
                          onClear={() => {
                            const optionValues =
                              qf.options?.map((opt) => opt.value) || []
                            optionValues
                              .filter((v) => activeQuickFilters?.includes(v))
                              .forEach((v) => onQuickFilterToggle?.(v))
                            if (activeQuickFilters?.includes(qf.id)) {
                              onQuickFilterToggle?.(qf.id)
                            }
                          }}
                        />
                      )}
                    </div>,
                    document.body,
                  )}
              </div>
            )
          })}

        {visibleFields.map((field) => {
          const { options, type } = fieldData[field.id] || {
            options: [],
            type: 'unknown',
          }
          const activeValues = getActiveArray(activeFilters[field.id])
          const itemOptionValues = options
            .filter(
              (o) =>
                o.value !== '__all__' &&
                o.value.toLowerCase() !== 'all' &&
                !/^all(\s|$)/i.test(o.label),
            )
            .map((o) => o.value)
          const isAllActive =
            activeValues.includes('__all__') ||
            activeValues.some((v) => v.toLowerCase() === 'all') ||
            (itemOptionValues.length > 0 &&
              itemOptionValues.every((v) => activeValues.includes(v)))
          const isActive = activeValues.length > 0
          const isOpen = activeDropdown === field.id
          const isOptional = optionalFields.some((f) => f.id === field.id)
          let displayLabel = field.label
          if (isAllActive) {
            displayLabel = field.label
          } else if (activeValues.length === 1) {
            const opt = options.find((o) => o.value === activeValues[0])
            const optLabel = opt ? opt.label : activeValues[0]
            displayLabel =
              optLabel.toLowerCase() === 'all'
                ? field.label
                : `${field.label}: ${optLabel}`
          } else if (activeValues.length > 1) {
            const firstOpt = options.find((o) => o.value === activeValues[0])
            const optLabel = firstOpt ? firstOpt.label : activeValues[0]
            displayLabel =
              optLabel.toLowerCase() === 'all'
                ? field.label
                : `${field.label}: ${optLabel}`
          }

          return (
            <div
              className={cn('relative', isOpen && 'z-[10000]')}
              key={field.id}
            >
              <div
                className={cn(
                  FILTER_CHIP_SHELL,
                  'pr-1.5',
                  isActive || isOpen
                    ? FILTER_CHIP_ACTIVE
                    : FILTER_CHIP_INACTIVE,
                )}
              >
                <button
                  className='flex min-w-0 cursor-pointer items-center gap-1.5 hover:opacity-80'
                  ref={(el) => {
                    buttonRefs.current[field.id] = el
                  }}
                  onClick={() => {
                    const nextDropdown = isOpen ? null : field.id
                    setActiveDropdown(nextDropdown)
                    if (nextDropdown) {
                      onFieldOpen?.(field)
                    }
                  }}
                >
                  <span className='truncate'>{displayLabel}</span>
                  {!isAllActive && activeValues.length > 1 && (
                    <span className={FILTER_CHIP_COUNT}>
                      +{activeValues.length - 1}
                    </span>
                  )}
                  {!isOptional && (
                    <span className={FILTER_CHIP_TRAILING}>
                      <ChevronDown className='h-3 w-3 opacity-60' />
                    </span>
                  )}
                </button>
                {isOptional && (
                  <button
                    aria-label={`Remove ${field.label} filter`}
                    className={FILTER_CHIP_CLEAR_BTN}
                    type='button'
                    onClick={(e) => {
                      e.stopPropagation()
                      onFilterChange(field.id, [])
                      setAddedFieldIds((ids) =>
                        ids.filter((id) => id !== field.id),
                      )
                      setActiveDropdown(null)
                    }}
                  >
                    <X className='h-3 w-3' />
                  </button>
                )}
              </div>

              {isOpen &&
                dropdownPos &&
                createPortal(
                  <div
                    className='animate-in fade-in slide-in-from-top-2 fixed rounded-lg border border-border-default bg-surface shadow-md'
                    ref={dropdownPanelRef}
                    style={{
                      left: dropdownPos.left,
                      top: dropdownPos.top,
                      zIndex: FILTER_MENU_Z_INDEX,
                    }}
                  >
                    {type === 'category' ||
                    type === 'boolean' ||
                    type === 'unknown' ? (
                      <CategoryFilterMenu
                        isLoading={isLoading}
                        label={field.label}
                        options={options}
                        selectedValues={activeValues}
                        onChange={(vals) => onFilterChange(field.id, vals)}
                        onClear={() => {
                          onFilterChange(field.id, [])
                          setActiveDropdown(null)
                        }}
                      />
                    ) : type === 'number' ? (
                      <NumberFilterMenu
                        isLoading={isLoading}
                        options={options}
                        selectedValues={activeValues}
                        onChange={(vals) => onFilterChange(field.id, vals)}
                        onClear={() => {
                          onFilterChange(field.id, [])
                          setActiveDropdown(null)
                        }}
                      />
                    ) : type === 'date' ? (
                      <DateFilterMenu
                        options={options}
                        selectedValues={activeValues}
                        onChange={(vals) => {
                          onFilterChange(field.id, vals)
                        }}
                        onClear={() => {
                          onFilterChange(field.id, [])
                          setActiveDropdown(null)
                        }}
                      />
                    ) : null}
                  </div>,
                  document.body,
                )}
            </div>
          )
        })}

        {addableFields.length > 0 && (
          <div className='relative'>
            <Tooltip content='Add filter'>
              <button
                aria-label='Add filter'
                type='button'
                className={cn(
                  'inline-flex h-[30px] w-[30px] shrink-0 cursor-pointer items-center justify-center rounded-full border transition-all',
                  activeDropdown === 'add_filter'
                    ? 'border-primary-9 bg-primary-3/50 text-primary-9'
                    : 'border-border-default bg-surface text-text-secondary hover:bg-gray-2',
                )}
                ref={(el) => {
                  buttonRefs.current.add_filter = el
                }}
                onClick={() =>
                  setActiveDropdown(
                    activeDropdown === 'add_filter' ? null : 'add_filter',
                  )
                }
              >
                <Plus className='h-3.5 w-3.5 shrink-0' />
              </button>
            </Tooltip>

            {activeDropdown === 'add_filter' &&
              dropdownPos &&
              createPortal(
                <div
                  className='animate-in fade-in slide-in-from-top-2 fixed flex w-64 flex-col overflow-hidden rounded-lg border border-border-default bg-surface shadow-md'
                  ref={dropdownPanelRef}
                  style={{
                    left: dropdownPos.left,
                    top: dropdownPos.top,
                    zIndex: FILTER_MENU_Z_INDEX,
                  }}
                >
                  <div className='relative border-b border-border-default'>
                    <Search className='absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-text-muted' />
                    <input
                      className='w-full bg-transparent py-2.5 pr-3 pl-9 text-12 text-text-primary outline-none placeholder:text-text-muted'
                      placeholder='Search columns...'
                      type='text'
                      value={addFilterSearch}
                      autoFocus
                      onChange={(e) => setAddFilterSearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className='ez-scrollbar max-h-56 overflow-y-auto p-1.5'>
                    {filteredAddableFields.length === 0 ? (
                      <div className='px-2.5 py-2 text-12 text-text-muted'>
                        No columns found.
                      </div>
                    ) : (
                      filteredAddableFields.map((field) => (
                        <button
                          className='flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-12 transition-colors hover:bg-gray-2'
                          key={field.id}
                          type='button'
                          onClick={() => {
                            setAddedFieldIds((ids) =>
                              ids.includes(field.id) ? ids : [...ids, field.id],
                            )
                            setAddFilterSearch('')
                            setActiveDropdown(field.id)
                            onFieldOpen?.(field)
                          }}
                        >
                          {field.label}
                        </button>
                      ))
                    )}
                  </div>
                </div>,
                document.body,
              )}
          </div>
        )}

        {onClearAll &&
          ((activeQuickFilters && activeQuickFilters.length > 0) ||
            addedFieldIds.length > 0 ||
            Object.values(activeFilters).some((v) =>
              Array.isArray(v) ? v.length > 0 : Boolean(v),
            )) && (
            <button
              className='cursor-pointer px-1 text-12 font-medium text-text-secondary transition-colors hover:text-text-primary hover:underline'
              type='button'
              onClick={() => {
                // Remove newly added filter columns; keep default fields only
                if (addedFieldIds.length > 0) {
                  addedFieldIds.forEach((id) => onFilterChange(id, []))
                  setAddedFieldIds([])
                }
                setActiveDropdown(null)
                onClearAll()
              }}
            >
              Reset
            </button>
          )}
      </div>

      <div className='flex items-center gap-2'>
        {customSearchComponent ? (
          customSearchComponent
        ) : onSearchChange ? (
          <div className='relative w-48'>
            <Search className='absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-text-muted' />
            <input
              className='w-full rounded-md border border-border-default bg-surface py-1 pr-3 pl-8 text-12 transition-colors outline-none focus:border-primary-9'
              placeholder={searchPlaceholder}
              type='text'
              value={searchQuery || ''}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        ) : null}

        {toolbarActions && toolbarActions.length > 0 && (
          <FilterToolbar actions={toolbarActions} />
        )}

        {viewMode && onViewModeChange && (
          <div className='flex items-center gap-0.5 rounded-md border border-border-default p-0.5'>
            <Tooltip content={t`Grid View`}>
              <button
                type='button'
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded transition-colors',
                  viewMode === 'grid'
                    ? 'bg-primary-3 text-primary-9'
                    : 'text-text-muted hover:bg-gray-2 hover:text-text-primary',
                )}
                onClick={() => onViewModeChange('grid')}
              >
                <Icon className='h-4 w-4' name='lucide:layout-grid' />
              </button>
            </Tooltip>
            <Tooltip content={t`Table View`}>
              <button
                type='button'
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded transition-colors',
                  viewMode === 'table'
                    ? 'bg-primary-3 text-primary-9'
                    : 'text-text-muted hover:bg-gray-2 hover:text-text-primary',
                )}
                onClick={() => onViewModeChange('table')}
              >
                <Icon className='h-4 w-4' name='lucide:list' />
              </button>
            </Tooltip>
            <Tooltip content={t`Kanban View`}>
              <button
                type='button'
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded transition-colors',
                  viewMode === 'kanban'
                    ? 'bg-primary-3 text-primary-9'
                    : 'text-text-muted hover:bg-gray-2 hover:text-text-primary',
                )}
                onClick={() => onViewModeChange('kanban')}
              >
                <Icon className='h-4 w-4' name='lucide:columns-3' />
              </button>
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  )
}
