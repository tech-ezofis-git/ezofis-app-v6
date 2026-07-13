import React, { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, Search } from 'lucide-react'
import cn from '@/utils/cn'

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
}: CustomFilterProps) {
  const [activeFilterDropdown, setActiveFilterDropdown] = useState<string | null>(null)
  const [activeFilterGroup, setActiveFilterGroup] = useState<string | null>(
    moreFilters && moreFilters.length > 0 ? moreFilters[0].id : null
  )
  const [filterSearchQuery, setFilterSearchQuery] = useState('')
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
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
    <div ref={filtersRef} className="flex flex-wrap items-center gap-2.5 rounded-lg border border-border-default bg-surface p-3 shadow-xs w-full">
      {/* <span className="text-12 font-semibold text-text-primary mr-1">Filters:</span> */}

      <div className="flex flex-wrap gap-1.5">
        {filters.map((filter) => {
          const activeValue = activeFilters[filter.id]
          const activeOption = filter.options.find((o) => o.value === activeValue)
          const displayLabel = activeOption ? activeOption.label : filter.label
          const isActive = !!activeValue || activeFilterDropdown === filter.id

          return (
            <div key={filter.id} className="relative">
              <button
                className={cn(
                  "cursor-pointer rounded-full border px-3.5 py-1 text-12 font-medium transition-all hover:bg-gray-3 dark:hover:bg-gray-10 flex items-center gap-1.5",
                  isActive
                    ? "border-primary-9 bg-primary-3/50 text-primary-9"
                    : "border-border-default bg-surface text-text-secondary"
                )}
                onClick={() => {
                  setActiveFilterDropdown(activeFilterDropdown === filter.id ? null : filter.id)
                  setFilterSearchQuery('')
                }}
              >
                <span>{displayLabel}</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>

              {activeFilterDropdown === filter.id && (
                <div
                  className="absolute z-30 top-full left-0 mt-1.5 rounded-lg border border-border-default bg-surface p-3 shadow-xs animate-in fade-in slide-in-from-top-2"
                  style={{ width: filter.width || 240 }}
                >
                  {filter.searchable && (
                    <>
                      <div className="relative mb-2">
                        <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                        <input
                          className="w-full rounded-lg border border-border-default bg-gray-2 py-1 pr-3 pl-8 text-11 text-text-primary outline-none"
                          placeholder={filter.searchPlaceholder || "Search..."}
                          type="text"
                          value={filterSearchQuery}
                          onChange={(e) => setFilterSearchQuery(e.target.value)}
                        />
                      </div>
                      <div className="h-px bg-border-default -mx-3 my-2" />
                    </>
                  )}
                  <div className="flex flex-col gap-0.5 max-h-[220px] overflow-y-auto scrollbar">
                    <button
                      className={cn(
                        "w-full rounded px-2.5 py-1.5 text-12 font-medium text-left cursor-pointer transition-colors text-text-primary hover:bg-gray-2",
                        !activeValue && "bg-primary-3/30 text-primary-9 font-semibold"
                      )}
                      onClick={() => {
                        onFilterChange(filter.id, '')
                        setActiveFilterDropdown(null)
                      }}
                    >
                      All {filter.label}
                    </button>
                    {filter.options
                      .filter((item) =>
                        filter.searchable && filterSearchQuery
                          ? item.label.toLowerCase().includes(filterSearchQuery.toLowerCase())
                          : true
                      )
                      .map((item) => (
                        <button
                          key={item.value}
                          className={cn(
                            "w-full rounded px-2.5 py-1.5 text-12 font-medium text-left cursor-pointer transition-colors text-text-primary hover:bg-gray-2",
                            activeValue === item.value && "bg-primary-3/30 text-primary-9 font-semibold"
                          )}
                          onClick={() => {
                            onFilterChange(filter.id, item.value)
                            setActiveFilterDropdown(null)
                          }}
                        >
                          {item.label}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* More Filters */}
        {moreFilters && moreFilters.length > 0 && (
          <div className="relative">
            <button
              className={cn(
                "cursor-pointer rounded-full border px-3.5 py-1 text-12 font-medium transition-all hover:bg-gray-3 dark:hover:bg-gray-10 flex items-center gap-1.5",
                activeFilterDropdown === 'more'
                  ? "border-primary-9 bg-primary-3/50 text-primary-9"
                  : "border-border-default bg-surface text-text-secondary"
              )}
              onClick={() => {
                setActiveFilterDropdown(activeFilterDropdown === 'more' ? null : 'more')
                setFilterSearchQuery('')
              }}
            >
              <span>{moreFiltersLabel}</span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>

            {activeFilterDropdown === 'more' && (
              <div className="absolute z-30 top-full left-0 mt-1.5 flex rounded-lg border border-border-default bg-surface shadow-xs overflow-hidden animate-in fade-in slide-in-from-top-2">
                <div className="flex flex-col w-[190px] bg-primary-3/30 border-r border-border-default p-1 dark:bg-gray-12">
                  {moreFilters.map((group) => {
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
                          {IconComp && <IconComp className="h-4 w-4" />}
                          <span>{group.label}</span>
                        </span>
                        <ChevronRight className="h-3 w-3 opacity-60" />
                      </button>
                    )
                  })}
                </div>

                <div className="flex flex-col w-[260px] p-3 gap-2.5 bg-surface">
                  {moreFilters.map((group) => {
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
                                .filter((item) =>
                                  item.label.toLowerCase().includes(filterSearchQuery.toLowerCase())
                                )
                                .map((item) => (
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
                              {group.actions.map((action) => (
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
      </div>

      {showReset && (
        <button
          className="cursor-pointer rounded-full border border-border-default bg-gray-2 px-3.5 py-1 text-12 font-medium text-text-secondary transition-all hover:bg-gray-3"
          onClick={() => {
            onReset()
            setActiveFilterDropdown(null)
          }}
        >
          Reset
        </button>
      )}

      <div className="flex-1" />

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
              if (!searchQuery) setIsSearchExpanded(false)
            }}
          />
        </div>
      )}
    </div>
  )
}
