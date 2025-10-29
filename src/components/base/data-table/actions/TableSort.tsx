import { type Table as TanstackTable } from '@tanstack/react-table'
import { produce } from 'immer'
import { useCallback } from 'react'
import Badge from '@/components/base/Badge'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import Menu from '@/components/base/menu/Menu'
import MenuItem from '@/components/base/menu/MenuItem'
import Popover from '@/components/base/Popover'
import SortableContainer from '@/components/base/sortable/SortableContainer'
import SortableItem from '@/components/base/sortable/SortableItem'
import cn from '@/utils/cn'

interface Props<TData> {
  table: TanstackTable<TData>
}

const TableSort = <TData,>({ table }: Props<TData>) => {
  const sortDirections = ['Ascending', 'Descending']
  const sortState = table.getState().sorting

  const columns = table
    .getAllLeafColumns()
    .filter(
      (column) =>
        !!column.accessorFn && column.getCanSort() && column.getIsVisible(),
    )
  const unSorted = columns.filter((column) => !column.getIsSorted())

  const sortOptions = unSorted.map((column) => ({
    id: column.id,
    label: column.columnDef.meta?.label ?? column.id,
  }))

  const _rightSection = sortState.length ? (
    <Badge color='gray' label={String(sortState.length)} />
  ) : undefined

  const getColumnLabel = (id: string) => {
    const column = columns.find((column) => column.id === id)
    return column?.columnDef.meta?.label ?? id
  }

  const addSort = () => {
    if (!unSorted.length) return

    const column = unSorted[0]
    table.setSorting([...sortState, { desc: false, id: column.id }])
  }

  const removeSort = (id: string) => {
    table.setSorting(sortState.filter((column) => column.id !== id))
  }

  const updateSort = (index: number, id: string, desc: boolean) => {
    table.setSorting(
      produce(sortState, (draft) => {
        draft[index] = { desc, id }
      }),
    )
  }

  const handleOrderChange = useCallback(
    (items: string[]) => {
      const sortStateMap = new Map(
        sortState.map((item) => [item.id, item.desc]),
      )
      const newState = items.map((id) => ({
        desc: sortStateMap.get(id) ?? false,
        id,
      }))
      table.setSorting(newState)
    },
    [sortState, table],
  )

  const resetSorting = () => {
    table.resetSorting()
  }

  const maxSortCount = table.options.maxMultiSortColCount ?? Infinity
  const isAddDisabled = sortState.length >= maxSortCount || !unSorted.length

  return (
    <Popover
      position='bottom-start'
      width={sortState.length > 0 ? 368 : 248}
      target={
        <Button
          color='gray'
          icon='tabler:arrows-sort'
          label='Sort'
          rightSection={_rightSection}
          variant='outline'
        />
      }
    >
      <div className='p-4'>
        <p className='mb-2 text-mini font-medium text-gray-9'>
          {sortState.length > 0 ? 'Sort by' : 'No sorting applied'}
        </p>

        <div className={cn('space-y-2', sortState.length > 0 && 'mb-4')}>
          <SortableContainer
            items={sortState.map((column) => column.id)}
            onItemsChange={handleOrderChange}
          >
            {sortState.map((column, index) => (
              <SortableItem
                handlerClassName='size-8'
                id={column.id}
                key={column.id}
              >
                <div className='flex items-center gap-1'>
                  <Menu
                    position='bottom-start'
                    width={160}
                    withinPortal={false}
                    target={
                      <Button
                        className='w-47 justify-between'
                        color='gray'
                        label={getColumnLabel(column.id)}
                        suffixIcon='tabler:chevron-down'
                        suffixIconClass='text-gray-9'
                        variant='outline'
                      />
                    }
                  >
                    {sortOptions.map((option) => (
                      <MenuItem
                        key={option.id}
                        label={option.label}
                        onClick={() =>
                          updateSort(index, option.id, column.desc)
                        }
                      />
                    ))}
                  </Menu>

                  <Menu
                    position='bottom-start'
                    width={120}
                    withinPortal={false}
                    target={
                      <Button
                        className='w-20 justify-between'
                        color='gray'
                        label={column.desc ? 'Desc' : 'Asc'}
                        suffixIcon='tabler:chevron-down'
                        suffixIconClass='text-gray-9'
                        variant='outline'
                      />
                    }
                  >
                    {sortDirections.map((direction) => (
                      <MenuItem
                        key={direction}
                        label={direction}
                        onClick={() =>
                          updateSort(
                            index,
                            column.id,
                            direction === 'Descending',
                          )
                        }
                      />
                    ))}
                  </Menu>

                  <IconButton
                    color='gray'
                    icon='tabler:trash'
                    iconClass='text-red-11'
                    variant='outline'
                    onClick={() => removeSort(column.id)}
                  />
                </div>
              </SortableItem>
            ))}
          </SortableContainer>
        </div>

        <div className='flex items-center justify-between border-t border-gray-3 pt-2.5'>
          <Button
            color='gray'
            disabled={isAddDisabled}
            icon='tabler:plus'
            label='Add'
            variant='subtle'
            onClick={addSort}
          />

          {sortState.length > 0 && (
            <Button
              color='gray'
              label='Clear'
              variant='outline'
              onClick={resetSorting}
            />
          )}
        </div>
      </div>
    </Popover>
  )
}

TableSort.displayName = 'TableSort'
export default TableSort
