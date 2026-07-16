import React, { useEffect, useRef, useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, Search } from 'lucide-react'
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'

export interface QuickFilterOption {
  id: string
  label: string
  icon?: string
  count?: number
}

export interface FilterOption {
  label: string
  value: string
}

export interface FilterGroup {
  id: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
  options?: FilterOption[]
  actions?: FilterOption[] // Used for buttons like High Value / Low Value
}

export interface FilterDefinition {
  id: string
  label: string
  options: FilterOption[]
  searchable?: boolean
  searchPlaceholder?: string
  width?: number
}

export interface FilterAction {
  key: string
  component: React.ReactNode
}

export interface CustomFilterProps {
  filters: FilterDefinition[]
  moreFilters?: FilterGroup[]
  moreFiltersLabel?: string
  activeFilters: Record<string, string>
  onFilterChange: (id: string, value: string) => void
  onReset: () => void
  showReset?: boolean
  searchQuery: string
  onSearchChange: (val: string) => void
  searchPlaceholder?: string
  customSearchComponent?: React.ReactNode
  quickFilters?: QuickFilterOption[]
  activeQuickFilters?: string[]
  onQuickFilterToggle?: (id: string) => void
  trailingActions?: React.ReactNode
  actions?: FilterAction[]
}

export default function CustomFilter({
  filters,
  moreFilters,
  moreFiltersLabel = 'More filters',
  activeFilters,
  onFilterChange,
  onReset,
  showReset,
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search...',
  customSearchComponent,
  quickFilters,
  activeQuickFilters,
  onQuickFilterToggle,
  trailingActions,
  actions,
}: CustomFilterProps) {
  const combinedFilters = useMemo(() => {
    const list: any[] = []
    if (filters) list.push(...filters)
    if (moreFilters) list.push(...moreFilters)
    return list
  }, [filters, moreFilters])

  const [activeFilterDropdown, setActiveFilterDropdown] = useState<string | null>(null)
  const [activeFilterGroup, setActiveFilterGroup] = useState<string | null>(
    combinedFilters.length > 0 ? combinedFilters[0].id : null
  )

  useEffect(() => {
    if (!activeFilterGroup && combinedFilters.length > 0) {
      setActiveFilterGroup(combinedFilters[0].id)
    }
  }, [combinedFilters, activeFilterGroup])
  const [filterSearchQuery, setFilterSearchQuery] = useState('')
  const [isSearchExpanded, setIsSearchExpanded] = useState(true)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const filtersRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filtersRef.current && !filtersRef.current.contains(event.target as Node)) {
        setActiveFilterDropdown(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <div ref={filtersRef} className="relative z-40 flex items-center justify-between gap-4 rounded-lg border border-[var(--border-default)] bg-surface p-3 shadow-xs w-full">
      <div className="flex items-center gap-2 w-[60%] shrink-0">
        <div className="flex flex-nowrap overflow-x-auto no-scrollbar gap-2 items-center min-w-0">
          {quickFilters && quickFilters.map((qf) => {
            const isActive = activeQuickFilters?.includes(qf.id)
            return (
              <button
                key={qf.id}
                className={cn(
                  "cursor-pointer rounded-full border px-3 py-1 text-12 font-medium transition-all flex items-center gap-1.5",
                  isActive
                    ? "border-[var(--primary-9)] bg-[var(--primary-3)] text-[var(--primary-9)]"
                    : "border-[var(--border-default)] bg-surface text-[var(--text-secondary)] hover:bg-gray-3 dark:hover:bg-gray-10"
                )}
                onClick={() => onQuickFilterToggle?.(qf.id)}
              >
                {qf.icon && <Icon className="size-3.5" name={qf.icon} />}
                <span className="whitespace-nowrap">{qf.label}</span>
                {qf.count !== undefined && (
                  <span className={cn(
                    "flex items-center justify-center rounded-full px-1.5 py-0.5 text-10 font-bold",
                    isActive ? "bg-[var(--primary-4)] text-[var(--primary-9)]" : "bg-gray-3 text-gray-11"
                  )}>
                    {qf.count}
                  </span>
                )}
              </button>
            )
          })}

          {/* Active Filters as tags */}
          {combinedFilters.map(group => {
            const activeValue = activeFilters[group.id]
            if (!activeValue) return null

            const option = group.options?.find((o: any) => o.value === activeValue)
            const action = group.actions?.find((a: any) => a.value === activeValue)
            const label = option?.label || action?.label || activeValue

            return (
              <div key={group.id} className="flex items-center gap-1.5 rounded-full border border-[var(--primary-5)] bg-[var(--primary-2)] px-2.5 py-1 text-12 font-medium text-[var(--primary-11)] shrink-0">
                <span className="opacity-70">{group.label}:</span>
                <span className="whitespace-nowrap">{label}</span>
                <button
                  onClick={() => onFilterChange(group.id, '')}
                  className="ml-0.5 cursor-pointer hover:text-[var(--primary-9)]"
                >
                  <Icon name="tabler:x" className="size-3.5" />
                </button>
              </div>
            )
          })}
        </div>

        {/* All Available Filters Menu */}
        {combinedFilters.length > 0 && (
          <div className="relative shrink-0">
            <button
              className={cn(
                "cursor-pointer rounded-full border border-dashed px-2 py-1.5 transition-all hover:bg-gray-3 dark:hover:bg-gray-10 flex items-center justify-center shrink-0",
                activeFilterDropdown === 'more'
                  ? "border-primary-9 bg-primary-3/50 text-primary-9"
                  : "border-border-default bg-surface text-text-secondary"
              )}
              onClick={() => {
                setActiveFilterDropdown(activeFilterDropdown === 'more' ? null : 'more')
                setFilterSearchQuery('')
              }}
              title="Add Filter"
            >
              <Icon className="size-4" name="tabler:plus" />
            </button>

            {activeFilterDropdown === 'more' && (
              <div className="absolute z-50 top-full left-0 mt-1.5 flex rounded-lg border border-border-default bg-surface shadow-xs overflow-hidden animate-in fade-in slide-in-from-top-2">
                <div className="flex flex-col w-[190px] bg-primary-3/30 border-r border-border-default p-1 dark:bg-gray-12">
                  {combinedFilters.map((group) => {
                    const IconComp = group.icon
                    const isActive = activeFilterGroup === group.id
                    return (
                      <button
                        key={group.id}
                        className={cn(
                          "flex items-center justify-between w-full rounded-lg px-3 py-2.5 text-12 font-medium text-left transition-all cursor-pointer",
                          isActive
                            ? "bg-primary-3 text-primary-9 dark:bg-primary-9 dark:text-white"
                            : "text-text-secondary hover:bg-gray-2 dark:hover:bg-gray-10"
                        )}
                        onClick={() => {
                          setActiveFilterGroup(group.id)
                          setFilterSearchQuery('')
                        }}
                      >
                        <span className="flex items-center gap-2">
                          {typeof IconComp === 'string' ? (
                            <Icon name={IconComp} className="size-4" />
                          ) : IconComp ? (
                            <IconComp className="h-4 w-4" />
                          ) : null}
                          <span>{group.label}</span>
                        </span>
                        <ChevronRight className="h-3 w-3 opacity-60" />
                      </button>
                    )
                  })}
                </div>

                <div className="flex flex-col w-[260px] p-3 gap-2.5 bg-surface">
                  {combinedFilters.map((group) => {
                    if (activeFilterGroup !== group.id) return null
                    return (
                      <React.Fragment key={group.id}>
                        {group.options && (
                          <>
                            <div className="relative">
                              <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                              <input
                                className="w-full rounded-lg border border-border-default bg-gray-2 py-1 pr-3 pl-8 text-11 text-text-primary outline-none"
                                placeholder={`Search ${group.label.toLowerCase()}...`}
                                type="text"
                                value={filterSearchQuery}
                                onChange={(e) => setFilterSearchQuery(e.target.value)}
                              />
                            </div>
                            <div className="flex flex-col gap-0.5 mt-1 max-h-[160px] overflow-y-auto scrollbar">
                              {group.options
                                .filter((item: any) =>
                                  item.label.toLowerCase().includes(filterSearchQuery.toLowerCase())
                                )
                                .map((item: any) => (
                                  <button
                                    key={item.value}
                                    className={cn(
                                      "w-full rounded px-2.5 py-1.5 text-12 font-medium text-left cursor-pointer transition-colors text-text-primary hover:bg-gray-2",
                                      activeFilters[group.id] === item.value
                                        ? "bg-primary-3/30 text-primary-9 font-semibold"
                                        : "text-text-secondary hover:bg-gray-2"
                                    )}
                                    onClick={() => {
                                      onFilterChange(group.id, item.value)
                                      setActiveFilterDropdown(null)
                                    }}
                                  >
                                    {item.label}
                                  </button>
                                ))}
                            </div>
                          </>
                        )}
                        {group.actions && (
                          <>
                            <div className="text-11 font-semibold text-text-muted mb-1">
                              Filter by {group.label}
                            </div>
                            <div className="flex flex-col gap-2">
                              {group.actions.map((action: any) => (
                                <button
                                  key={action.value}
                                  className="w-full rounded px-2.5 py-1.5 text-12 font-medium text-left hover:bg-gray-2 cursor-pointer text-text-secondary"
                                  onClick={() => {
                                    onFilterChange(group.id, action.value)
                                    setActiveFilterDropdown(null)
                                  }}
                                >
                                  {action.label}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </React.Fragment>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {showReset && (
          <button
            className="cursor-pointer shrink-0 rounded-full border border-border-default bg-gray-2 px-3.5 py-1 text-12 font-medium text-text-secondary transition-all hover:bg-gray-3"
            onClick={() => {
              onReset()
              setActiveFilterDropdown(null)
            }}
          >
            Reset
          </button>
        )}
      </div>

      <div className="flex flex-1 items-center justify-end gap-2">
        {customSearchComponent ? (
          customSearchComponent
        ) : (
          <div
            className={cn(
              "relative flex items-center justify-end transition-all duration-300",
              isSearchExpanded || searchQuery ? "w-60" : "w-8"
            )}
          >
            <button
              type="button"
              className={cn(
                "absolute left-0 top-0 bottom-0 flex items-center justify-center transition-all duration-300 rounded-full",
                isSearchExpanded || searchQuery
                  ? "w-8 pointer-events-none"
                  : "w-8 h-8 cursor-pointer hover:bg-[var(--gray-2)] dark:hover:bg-[var(--gray-10)] border border-[var(--border-default)] bg-surface"
              )}
              onClick={() => {
                setIsSearchExpanded(true)
                setTimeout(() => searchInputRef.current?.focus(), 50)
              }}
            >
              <Search className="h-3.5 w-3.5 text-[var(--text-muted)]" />
            </button>
            <input
              ref={searchInputRef}
              className={cn(
                "rounded-full border border-[var(--border-default)] bg-surface py-1.5 text-12 text-[var(--text-primary)] outline-none transition-all duration-300 focus:border-[var(--primary-9)] focus:ring-1 focus:ring-[var(--primary-9)]",
                isSearchExpanded || searchQuery
                  ? "w-full pr-4 pl-8 opacity-100"
                  : "w-0 pr-0 pl-0 opacity-0 border-transparent pointer-events-none"
              )}
              placeholder={searchPlaceholder}
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={() => setIsSearchExpanded(true)}
              onBlur={() => {
                if (!searchQuery) {
                  setIsSearchExpanded(false)
                }
              }}
            />
          </div>
        )}

        {actions && actions.length > 0 ? (
          <div className='flex shrink-0 items-center gap-1.5'>
            {actions.map((action) => (
              <React.Fragment key={action.key}>{action.component}</React.Fragment>
            ))}
          </div>
        ) : trailingActions ? (
          <div className='flex shrink-0 items-center gap-1.5'>{trailingActions}</div>
        ) : null}
      </div>
    </div>
  )
}
