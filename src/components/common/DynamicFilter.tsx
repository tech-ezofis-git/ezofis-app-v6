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
  /** Extra filters available via the "Add filter" menu (not shown by default). */
  optionalFields?: DynamicFilterField[]
  quickFilters?: QuickFilterOption[]
  searchPlaceholder?: string
  searchQuery?: string
  toolbarActions?: ToolbarAction[]
  viewMode?: 'grid' | 'table'
  onClearAll?: () => void
  onFilterChange: (id: string, values: string | string[]) => void
  onQuickFilterToggle?: (id: string) => void
  onSearchChange?: (val: string) => void
  onViewModeChange?: (mode: 'grid' | 'table') => void
}

export interface QuickFilterOption {
  id: string
  label: string
  count?: number
  icon?: string
  options?: { label: string; value: string }[]
  type?: 'date' | 'category'
}

export default function DynamicFilter({
  activeFilters,
  activeQuickFilters,
  customSearchComponent,
  dataset,
  fields,
  optionalFields = [],
  quickFilters,
  searchPlaceholder = 'Search...',
  searchQuery,
  toolbarActions,
  viewMode,
  onClearAll,
  onFilterChange,
  onQuickFilterToggle,
  onSearchChange,
  onViewModeChange,
}: DynamicFilterProps) {
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
            const isActive =
              activeQuickFilters?.includes(qf.id) ||
              (qf.options &&
                qf.options.some((opt) =>
                  activeQuickFilters?.includes(opt.value),
                ))
            const isOpen = activeDropdown === `quick_${qf.id}`

            return (
              <div className='relative' key={qf.id}>
                <button
                  className={cn(
                    'flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-12 font-medium transition-all',
                    isActive || isOpen
                      ? 'border-[var(--primary-9)] bg-[var(--primary-3)] text-[var(--primary-9)]'
                      : 'border-[var(--border-default)] bg-surface text-[var(--text-secondary)] hover:bg-gray-3 dark:hover:bg-gray-10',
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
                    <Icon className='size-4 shrink-0' name={qf.icon} />
                  )}
                  <span>{qf.label}</span>
                  {qf.count !== undefined && (
                    <span
                      className={cn(
                        'text-10 flex items-center justify-center rounded-full px-1.5 py-0.5 font-bold',
                        isActive
                          ? 'bg-[var(--primary-4)] text-[var(--primary-9)]'
                          : 'bg-gray-3 text-gray-11',
                      )}
                    >
                      {qf.count}
                    </span>
                  )}
                  {qf.options && (
                    <ChevronDown className='h-3.5 w-3.5 shrink-0 opacity-60' />
                  )}
                </button>

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
                      <div className='flex w-56 flex-col gap-1 bg-surface p-2'>
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
                        ) : (
                          <div className='ez-scrollbar flex max-h-[220px] flex-col gap-0.5 overflow-y-auto'>
                            {qf.options?.map((opt) => {
                              const isSelected = activeQuickFilters?.includes(
                                opt.value,
                              )
                              return (
                                <label
                                  key={opt.value}
                                  className={cn(
                                    'flex cursor-pointer items-center justify-between rounded px-2.5 py-1.5 text-12 font-medium transition-colors hover:bg-gray-2',
                                    isSelected &&
                                      'bg-primary-3/30 text-primary-9',
                                  )}
                                >
                                  <div className='flex items-center gap-2'>
                                    <input
                                      checked={isSelected}
                                      className='accent-primary-9'
                                      type='checkbox'
                                      onChange={() =>
                                        onQuickFilterToggle?.(opt.value)
                                      }
                                    />
                                    <span>{opt.label}</span>
                                  </div>
                                </label>
                              )
                            })}
                          </div>
                        )}
                      </div>
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
          const isActive = activeValues.length > 0
          const isOpen = activeDropdown === field.id
          const isOptional = optionalFields.some((f) => f.id === field.id)
          let displayLabel = field.label
          let badgeCount = 0
          if (activeValues.length === 1) {
            const opt = options.find((o) => o.value === activeValues[0])
            displayLabel = `${field.label}: ${opt ? opt.label : activeValues[0]}`
          } else if (activeValues.length > 1) {
            const firstOpt = options.find((o) => o.value === activeValues[0])
            displayLabel = `${field.label}: ${firstOpt ? firstOpt.label : activeValues[0]}`
            badgeCount = activeValues.length - 1
          }

          return (
            <div
              className={cn('relative', isOpen && 'z-[10000]')}
              key={field.id}
            >
              <div
                className={cn(
                  'flex max-w-[280px] items-center gap-1 rounded-full border py-1 pr-1.5 pl-3.5 text-12 font-medium transition-all',
                  isActive || isOpen
                    ? 'border-primary-9 bg-primary-3/50 text-primary-9'
                    : 'border-border-default bg-surface text-text-secondary',
                )}
              >
                <button
                  className='flex min-w-0 cursor-pointer items-center gap-1.5 hover:opacity-80'
                  ref={(el) => {
                    buttonRefs.current[field.id] = el
                  }}
                  onClick={() => setActiveDropdown(isOpen ? null : field.id)}
                >
                  <span className='truncate'>{displayLabel}</span>
                  {badgeCount > 0 && (
                    <span className='text-10 flex h-4 items-center justify-center rounded-full bg-primary-9 px-1.5 font-bold text-white shadow-sm'>
                      +{badgeCount}
                    </span>
                  )}
                  <ChevronDown className='h-3 w-3 shrink-0 opacity-60' />
                </button>
                {isOptional && (
                  <button
                    aria-label={`Remove ${field.label} filter`}
                    className='ml-0.5 rounded-full p-0.5 hover:bg-gray-3'
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
                    <X className='h-3 w-3 opacity-60' />
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
                  'flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-dashed transition-all',
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
                          className='flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-12 font-medium text-text-secondary transition-colors hover:bg-gray-2 hover:text-text-primary'
                          key={field.id}
                          type='button'
                          onClick={() => {
                            setAddedFieldIds((ids) =>
                              ids.includes(field.id) ? ids : [...ids, field.id],
                            )
                            setAddFilterSearch('')
                            setActiveDropdown(field.id)
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
          // Check if any quick filters or dropdown filters are active
          ((activeQuickFilters && activeQuickFilters.length > 0) ||
            Object.values(activeFilters).some((v) =>
              Array.isArray(v) ? v.length > 0 : Boolean(v),
            )) && (
            <button
              className='flex items-center gap-1.5 rounded-full border border-border-default bg-surface px-3 py-1.5 text-12 font-medium text-text-secondary transition-colors hover:bg-gray-2 hover:text-text-primary'
              onClick={onClearAll}
            >
              <X className='h-3.5 w-3.5' />
              Clear Filters
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
            <Tooltip content='Grid View'>
              <button
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
            <Tooltip content='Table View'>
              <button
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
          </div>
        )}
      </div>
    </div>
  )
}
