import { t } from '@lingui/core/macro'
import { useDebouncedCallback } from '@mantine/hooks'
import { useClickOutside } from '@mantine/hooks'
import { type Table as TanstackTable } from '@tanstack/react-table'
import { useCallback, useEffect, useState } from 'react'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import InputRadioIndicator from '@/components/base/inputs/InputRadioIndicator'
import Menu from '@/components/base/menu/Menu'
import MenuItem from '@/components/base/menu/MenuItem'
import MenuLabel from '@/components/base/menu/MenuLabel'
import Tooltip from '@/components/base/Tooltip'
import cn from '@/utils/cn'
import type { SearchState } from '../types'

interface Props<TData> {
  table: TanstackTable<TData>
}

const TableSearch = <TData,>({ table }: Props<TData>) => {
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

  const handleValueChange = useDebouncedCallback(
    (value: string) => table.setGlobalFilter({ id: searchState.id, value }),
    300,
  )

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
    'flex h-8 items-center rounded-md border outline-primary-8 transition-all duration-300 select-none focus-visible:outline-2',
    isExpanded
      ? cn(
          'focus-within:border-primary justify-start border-[var(--border-default)] bg-surface pr-1 pl-3',
          selectedColumnLabel ? 'w-80' : 'w-72',
        )
      : 'w-8 cursor-pointer justify-center border-[var(--border-default)] bg-surface text-gray-11 hover:bg-gray-4 hover:text-gray-12 active:scale-95',
  )

  const searchContent = (
    <div
      aria-label='Table search'
      className={containerClasses}
      ref={ref}
      role='search'
      onClick={handleContainerClick}
    >
      <div className='flex shrink-0 items-center gap-1.5'>
        {!isExpanded || !selectedColumnLabel ? (
          <Icon
            name='lucide:search'
            className={cn(
              'size-4 shrink-0 transition-colors',
              isExpanded ? 'text-gray-11' : 'text-gray-11 hover:text-gray-12',
            )}
          />
        ) : null}

        {isExpanded && selectedColumnLabel ? (
          <span className='text-12 font-semibold whitespace-nowrap text-gray-12'>
            {selectedColumnLabel}:
          </span>
        ) : null}
      </div>

      <div
        className={cn(
          'h-full transition-[width] duration-300',
          isExpanded ? 'w-full flex-1' : 'w-0 flex-none overflow-hidden',
        )}
      >
        <input
          id='table-search-input'
          type='text'
          value={inputValue}
          className={cn(
            'h-full w-full border-0 bg-transparent px-2 text-13 font-medium text-gray-12 outline-0 placeholder:text-gray-9',
            isExpanded ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
          placeholder={
            selectedColumnLabel ? t`Search ${selectedColumnLabel}` : t`Search`
          }
          onChange={(e) => {
            setInputValue(e.target.value)
            handleValueChange(e.target.value)
          }}
        />
      </div>

      {isExpanded && (
        <Menu
          offset={{ crossAxis: 4, mainAxis: 8 }}
          opened={opened}
          position='bottom-end'
          width={160}
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
          <MenuLabel>{t`Choose column`}</MenuLabel>
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
          {columns.map((column) => (
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
