import { t } from '@lingui/core/macro'
import { useDebouncedCallback } from '@mantine/hooks'
import { useClickOutside } from '@mantine/hooks'
import { type Table as TanstackTable } from '@tanstack/react-table'
import { useCallback, useEffect, useRef, useState } from 'react'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import InputRadioIndicator from '@/components/base/inputs/InputRadioIndicator'
import Menu from '@/components/base/menu/Menu'
import MenuItem from '@/components/base/menu/MenuItem'
import Tooltip from '@/components/base/Tooltip'
import cn from '@/utils/cn'
import type { SearchState } from '../types'

interface Props<TData> {
  /** A search request is running: the Search button shows a spinner. */
  loading?: boolean
  table: TanstackTable<TData>
  /**
   * Fires when a search is applied: after the typing debounce, on the Search
   * button / Enter, and with an empty value on Remove. Pages that query an
   * API use it to refetch even when the value did not change.
   */
  onSearch?: (state: SearchState) => void
}

const TableSearch = <TData,>({
  loading = false,
  onSearch,
  table,
}: Props<TData>) => {
  const [opened, setOpened] = useState(false)
  const searchState = table.getState().globalFilter as SearchState
  const [inputValue, setInputValue] = useState(searchState?.value || '')
  const [isExpanded, setIsExpanded] = useState(!!searchState?.value)

  const ref = useClickOutside(() => {
    setOpened(false)
    if (!inputValue) {
      setIsExpanded(false)
    }
  })

  const columns = table
    .getAllLeafColumns()
    .filter((c) => c.accessorFn && c.getIsVisible() && c.getCanFilter())

  useEffect(() => {
    const columnIds = columns.map((c) => c.id)

    if (
      searchState.id &&
      (!columnIds.length || !columnIds.includes(searchState.id))
    ) {
      table.setGlobalFilter({ id: '', value: '' })
    }
  }, [columns, searchState, table])

  useEffect(() => {
    setInputValue(searchState?.value || '')
    if (searchState?.value) {
      setIsExpanded(true)
    }
  }, [searchState?.value])

  const handleIdChange = useCallback(
    (id: string) => table.setGlobalFilter({ id, value: searchState.value }),
    [searchState, table],
  )

  const commitSearch = useCallback(
    (id: string, value: string) => {
      table.setGlobalFilter({ id, value })
      onSearch?.({ id, value })
    },
    [onSearch, table],
  )

  const handleValueChange = useDebouncedCallback(
    (value: string) => commitSearch(searchState.id, value),
    300,
  )

  // Search button / Enter: apply now instead of waiting for the debounce.
  const handleSearchNow = () => {
    handleValueChange.cancel()
    commitSearch(searchState.id, inputValue)
  }

  // Remove: drop the text and the column choice, back to an unfiltered list.
  const handleRemove = () => {
    handleValueChange.cancel()
    setInputValue('')
    commitSearch('', '')
  }

  // Search inside the column picker. Cleared and focused with the menu.
  const [columnQuery, setColumnQuery] = useState('')
  const columnQueryRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!opened) {
      setColumnQuery('')
      return
    }
    const timer = window.setTimeout(() => columnQueryRef.current?.focus(), 0)
    return () => window.clearTimeout(timer)
  }, [opened])

  const normalizedColumnQuery = columnQuery.trim().toLowerCase()
  const matchingColumns = normalizedColumnQuery
    ? columns.filter((column) =>
        String(column.columnDef.meta?.label ?? column.id)
          .toLowerCase()
          .includes(normalizedColumnQuery),
      )
    : columns
  const showAllOption =
    !normalizedColumnQuery || t`All`.toLowerCase().includes(normalizedColumnQuery)

  const selectedColumn = columns.find((column) => column.id === searchState?.id)
  const selectedColumnLabel =
    searchState?.id && selectedColumn
      ? (selectedColumn.columnDef.meta?.label ?? selectedColumn.id)
      : null

  const handleContainerClick = () => {
    if (!isExpanded) {
      setIsExpanded(true)
      setTimeout(
        () => document.getElementById('table-search-input')?.focus(),
        50,
      )
    } else {
      document.getElementById('table-search-input')?.focus()
    }
  }

  const containerClasses = cn(
    'flex h-8 overflow-hidden rounded-md border outline-primary-8 transition-all duration-300 select-none focus-visible:outline-2',
    isExpanded
      ? cn(
          'items-center focus-within:border-primary justify-start border-[var(--border-default)] bg-surface pr-1',
          selectedColumnLabel ? 'w-[22rem]' : 'w-72',
        )
      : 'w-8 cursor-pointer items-center justify-center border-[var(--border-default)] bg-surface text-gray-11 hover:bg-gray-4 hover:text-gray-12 active:scale-95',
  )

  const searchContent = (
    <div
      aria-busy={loading || undefined}
      aria-label='Table search'
      className={containerClasses}
      ref={ref}
      role='search'
      onClick={handleContainerClick}
    >
      <div
        className={cn(
          'flex h-full shrink-0 items-center justify-center self-stretch',
          isExpanded ? 'w-7 bg-primary-4 text-primary-11' : 'text-gray-11',
        )}
      >
        <Icon
          className={cn(
            'size-4 shrink-0',
            isExpanded ? 'text-primary-11' : 'text-gray-11',
          )}
          name='lucide:search'
        />
      </div>

      {isExpanded && selectedColumnLabel ? (
        <span className='flex h-full shrink-0 items-center pl-2 pr-1 text-12 font-semibold whitespace-nowrap text-gray-12 select-none'>
          {selectedColumnLabel}:
        </span>
      ) : null}

      <div
        className={cn(
          'flex h-full min-w-0 items-center transition-[width] duration-300',
          isExpanded ? 'w-full flex-1' : 'w-0 flex-none overflow-hidden',
        )}
      >
        <input
          id='table-search-input'
          type='text'
          value={inputValue}
          className={cn(
            'h-full w-full min-w-0 border-0 bg-transparent pr-2 text-13 font-medium text-gray-12 outline-0 placeholder:text-gray-9',
            selectedColumnLabel ? 'pl-0.5' : 'pl-2',
            isExpanded ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
          placeholder={
            selectedColumnLabel ? t`Search ${selectedColumnLabel}` : t`Search`
          }
          onChange={(e) => {
            setInputValue(e.target.value)
            handleValueChange(e.target.value)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && selectedColumnLabel) {
              e.preventDefault()
              handleSearchNow()
            }
          }}
        />
      </div>

      {isExpanded && selectedColumnLabel ? (
        <div
          className='flex shrink-0 items-center gap-0.5'
          onClick={(e) => e.stopPropagation()}
        >
          <IconButton
            ariaLabel={t`Remove search`}
            color='gray'
            icon='lucide:x'
            size='xs'
            tooltip={t`Remove`}
            variant='ghost'
            onClick={handleRemove}
          />
          <IconButton
            ariaLabel={t`Search`}
            color='primary'
            disabled={loading}
            icon='lucide:search'
            loading={loading}
            size='xs'
            tooltip={t`Search`}
            variant='ghost'
            onClick={handleSearchNow}
          />
        </div>
      ) : null}

      {isExpanded && (
        <Menu
          offset={{ crossAxis: 4, mainAxis: 8 }}
          opened={opened}
          position='bottom-end'
          width={208}
          withinPortal={false}
          target={
            <IconButton
              aria-label='Select a column'
              className='transition-opacity duration-300'
              color='gray'
              icon='lucide:settings-2'
              size='sm'
              variant='ghost'
            />
          }
          onChange={() => setOpened(!opened)}
        >
          <div className='px-1 pb-1'>
            <input
              aria-label={t`Search column`}
              className='h-8 w-full rounded-md border border-[var(--border-default)] bg-surface px-2 text-13 text-gray-12 outline-0 placeholder:text-gray-9 focus:border-primary-8'
              placeholder={t`Search column`}
              ref={columnQueryRef}
              type='text'
              value={columnQuery}
              onChange={(e) => setColumnQuery(e.target.value)}
              // Keep typing from triggering the menu's own key handling.
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
          <div className='ez-scrollbar max-h-64 overflow-y-auto'>
            {showAllOption ? (
              <MenuItem
                label={t`All`}
                leftSection={
                  <InputRadioIndicator
                    aria-label='Search in all'
                    checked={searchState.id === ''}
                  />
                }
                onClick={() => handleIdChange('')}
              />
            ) : null}
            {matchingColumns.map((column) => (
              <MenuItem
                key={column.id}
                label={column.columnDef.meta?.label ?? column.id}
                leftSection={
                  <InputRadioIndicator
                    aria-label={`Search in ${column.columnDef.meta?.label ?? column.id}`}
                    checked={searchState?.id === column.id}
                  />
                }
                onClick={() => handleIdChange(column.id)}
              />
            ))}
            {!showAllOption && matchingColumns.length === 0 ? (
              <p className='px-2 py-2 text-12 text-gray-10'>
                {t`No columns found`}
              </p>
            ) : null}
          </div>
        </Menu>
      )}
    </div>
  )

  if (!isExpanded) {
    return (
      <Tooltip content={t`Search`} position='top'>
        {searchContent}
      </Tooltip>
    )
  }

  return searchContent
}

TableSearch.displayName = 'TableSearch'
export default TableSearch
