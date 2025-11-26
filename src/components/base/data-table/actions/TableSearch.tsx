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

  const handleIdChange = useCallback(
    (id: string) => table.setGlobalFilter({ id, value: searchState.value }),
    [searchState, table],
  )

  const handleValueChange = useDebouncedCallback(
    (value: string) => table.setGlobalFilter({ id: searchState.id, value }),
    300,
  )

  return (
    <div
      aria-label='Table search'
      className='focus-within:border-primary flex h-8 items-center rounded border border-gray-6 pr-1 pl-3'
      ref={ref}
      role='search'
    >
      <Icon className='text-gray' name='tabler:search' />

      <div className='h-full flex-1'>
        <input
          id='table-search-input'
          placeholder='Search'
          type='text'
          className={cn(
            'text-gray h-full px-2 text-13 font-medium outline-0 transition-[width] placeholder:text-gray-11',
            focused ? 'w-56' : 'w-16',
          )}
          onChange={(e) => handleValueChange(e.target.value)}
          onFocus={() => setFocused(true)}
        />
      </div>

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
            className={cn(
              'transition-opacity',
              focused ? 'flex opacity-100' : 'hidden opacity-0',
            )}
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
    </div>
  )
}

TableSearch.displayName = 'TableSearch'
export default TableSearch
