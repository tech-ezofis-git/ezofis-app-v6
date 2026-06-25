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
  const [focused, setFocused] = useState(false)
  const [opened, setOpened] = useState(false)
  const ref = useClickOutside(() => {
    setFocused(false)
    setOpened(false)
  })

  const searchState = table.getState().globalFilter as SearchState
  const [inputValue, setInputValue] = useState(searchState?.value || '')

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
  }, [searchState?.value])

  const handleIdChange = useCallback(
    (id: string) => table.setGlobalFilter({ id, value: searchState.value }),
    [searchState, table],
  )

  const handleValueChange = useDebouncedCallback(
    (value: string) => table.setGlobalFilter({ id: searchState.id, value }),
    300,
  )

  const isExpanded = focused || !!searchState?.value

  const handleContainerClick = () => {
    if (!isExpanded) {
      document.getElementById('table-search-input')?.focus()
    }
  }

  const containerClasses = cn(
    'flex h-8 items-center rounded border transition-all duration-300 select-none outline-primary-8 focus-visible:outline-2',
    isExpanded
      ? 'w-72 border-gray-6 pr-1 pl-3 justify-start focus-within:border-primary bg-surface'
      : 'w-8 border-gray-6 hover:bg-gray-4 text-gray-11 hover:text-gray-12 justify-center cursor-pointer bg-surface active:scale-95',
  )

  const searchContent = (
    <div
      aria-label='Table search'
      className={containerClasses}
      ref={ref}
      role='search'
      onClick={handleContainerClick}
    >
      <Icon
        className={cn(
          'size-4 shrink-0 transition-colors',
          isExpanded ? 'text-gray-11' : 'text-gray-11 hover:text-gray-12',
        )}
        name='lucide:search'
      />

      <div
        className={cn(
          'h-full transition-[width] duration-300',
          isExpanded ? 'flex-1 w-full' : 'flex-none w-0 overflow-hidden',
        )}
      >
        <input
          id='table-search-input'
          placeholder='Search'
          type='text'
          className={cn(
            'text-gray-12 h-full w-full px-2 text-13 font-medium outline-0 placeholder:text-gray-11 bg-transparent border-0',
            isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none',
          )}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
            handleValueChange(e.target.value)
          }}
          onFocus={() => setFocused(true)}
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
              color='gray'
              icon='lucide:settings-2'
              size='sm'
              variant='ghost'
              className='transition-opacity duration-300'
            />
          }
          onChange={() => setOpened(!opened)}
        >
          <MenuLabel>Choose column</MenuLabel>
          <MenuItem
            label='All'
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
      <Tooltip content='Search' position='top'>
        {searchContent}
      </Tooltip>
    )
  }

  return searchContent
}

TableSearch.displayName = 'TableSearch'
export default TableSearch
