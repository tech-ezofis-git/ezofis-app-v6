import {
  flexRender,
  type Header,
  type Table as TanstackTable,
} from '@tanstack/react-table'
import { produce } from 'immer'
import { type ComponentProps, useState } from 'react'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import Menu from '@/components/base/menu/Menu'
import MenuDivider from '@/components/base/menu/MenuDivider'
import MenuItem from '@/components/base/menu/MenuItem'
import MenuSub from '@/components/base/menu/MenuSub'
import Th from '@/components/base/table/Th'
import cn from '@/utils/cn'
import getColumnPinnedStyles from './helpers/getColumnPinnedStyles'
import TableEllipsis, { shouldDisableTableEllipsis } from './TableEllipsis'

interface Props<TData> extends ComponentProps<'th'> {
  header: Header<TData, unknown>
  table: TanstackTable<TData>
}

const TableHeaderCell = <TData,>({
  header,
  style,
  table,
  className,
}: Props<TData>) => {
  const [opened, setOpened] = useState(false)

  const column = header.column
  const headerAlign = column.columnDef.meta?.headerAlign ?? 'left'
  const showMenu = column.columnDef.meta?.showMenu
  const disableEllipsis = shouldDisableTableEllipsis(
    column.id,
    column.columnDef.meta?.disableEllipsis,
  )

  const columns = table.getAllLeafColumns()
  const isAccessorColumn = !!column.accessorFn
  const canSort = isAccessorColumn && column.getCanSort()
  const isSorted = column.getIsSorted()
  const isPinned = column.getIsPinned()
  const columnOrder = table.getState().columnOrder

  const headerContent = (
    <TableEllipsis disabled={disableEllipsis}>
      {flexRender(column.columnDef.header, header.getContext())}
    </TableEllipsis>
  )

  const getTargetColumnId = (id: string, direction: 'right' | 'left') => {
    const index = columns.findIndex((c) => c.id === id)
    if (index === -1) return ''

    if (direction === 'right') {
      for (let i = index + 1; i < columns.length; i++) {
        if (columns[i].getIsVisible()) return columns[i].id
      }
    } else {
      for (let i = index - 1; i >= 0; i--) {
        if (columns[i].getIsVisible()) return columns[i].id
      }
    }
    return ''
  }

  const changeColumnOrder = (direction: 'left' | 'right') => {
    const index = columnOrder.indexOf(column.id)
    const targetId = getTargetColumnId(column.id, direction)

    if (targetId === '') return

    const targetIndex = columnOrder.indexOf(targetId)
    if (targetIndex === -1) return

    const newState = produce(columnOrder, (draft) => {
      const temp = draft[index]
      draft[index] = draft[targetIndex]
      draft[targetIndex] = temp
    })
    table.setColumnOrder(newState)
  }

  const moveColumn = (position: 'left' | 'right') => {
    setOpened(false)
    setTimeout(() => changeColumnOrder(position), 100)
  }

  const pinColumn = (position: 'left' | 'right' | false) => {
    setOpened(false)
    setTimeout(() => column.pin(position), 100)
  }

  const headerAlignClassName =
    headerAlign === 'center'
      ? 'justify-center'
      : headerAlign === 'right'
        ? 'justify-end'
        : 'justify-start'

  return (
    <Th
      className={cn(
        'group/dtcell min-h-10 max-w-0 overflow-visible bg-[var(--gray-2)] py-0 [--pinned-bg:var(--gray-2)]',
        column.columnDef.meta?.headerClassName,
        column.columnDef.meta?.className,
        className,
      )}
      key={header.id}
      style={{
        ...getColumnPinnedStyles(column, table),
        ...style,
        background: 'var(--gray-2)',
        backgroundColor: 'var(--gray-2)',
      }}
    >
      <div
        className={cn(
          'flex min-h-10 w-full min-w-0 items-center py-1',
          headerAlignClassName,
        )}
      >
        {/* display column */}
        {!isAccessorColumn && headerContent}

        {/* sortable accessor column */}
        {canSort && (
          <button
            className='flex h-full min-w-0 flex-1 cursor-pointer items-center justify-start bg-transparent px-0 text-left outline-none hover:bg-transparent focus:bg-transparent active:bg-transparent'
            type='button'
            onClick={column.getToggleSortingHandler()}
          >
            <div className='flex min-w-0 items-center gap-1.5'>
              <div className='min-w-0 flex-1'>{headerContent}</div>
              <div className='flex size-4 shrink-0 items-center justify-center'>
                {isSorted ? (
                  <Icon
                    className='size-3.5 text-[var(--gray-11)]'
                    name={
                      isSorted === 'desc'
                        ? 'lucide:arrow-down'
                        : 'lucide:arrow-up'
                    }
                  />
                ) : null}
              </div>
            </div>
          </button>
        )}

        {/* non-sortable accessor column (e.g. display-only headers) */}
        {isAccessorColumn && !canSort && (
          <div className='min-w-0 flex-1'>{headerContent}</div>
        )}

        {/* menu button */}
        {showMenu && (
          <Menu
            opened={opened}
            position='bottom-end'
            width={160}
            target={
              <IconButton
                className='group'
                color='gray'
                icon='lucide:chevrons-up-down'
                iconClass='size-4 text-gray-9 group-hover:text-gray-10'
                variant='ghost'
              />
            }
            onChange={setOpened}
          >
            {column.id === 'group' && (
              <>
                <MenuItem
                  icon='lucide:chevron-down'
                  label='Expand all'
                  onClick={() => table.toggleAllRowsExpanded(true)}
                />
                <MenuItem
                  icon='lucide:chevron-right'
                  label='Collapse all'
                  onClick={() => table.toggleAllRowsExpanded(false)}
                />
                <MenuDivider />
                <MenuItem
                  icon='lucide:copy-x'
                  label='Ungroup all'
                  onClick={() => table.resetGrouping()}
                />
              </>
            )}

            {column.id !== 'group' && (
              <>
                <MenuSub
                  disabled={!column.getCanSort()}
                  icon='lucide:arrow-down-up'
                  label='Sort'
                >
                  <MenuItem
                    disabled={isSorted === 'asc'}
                    icon='lucide:arrow-up'
                    label='Ascending'
                    onClick={() => column.toggleSorting(false)}
                  />
                  <MenuItem
                    disabled={isSorted === 'desc'}
                    icon='lucide:arrow-down'
                    label='Descending'
                    onClick={() => column.toggleSorting(true)}
                  />
                  <MenuItem
                    disabled={!isSorted}
                    icon='lucide:x'
                    label='Clear sort'
                    onClick={column.clearSorting}
                  />
                </MenuSub>

                <MenuItem
                  disabled={!column.getCanGroup()}
                  icon={column.getIsGrouped() ? 'lucide:copy-x' : 'lucide:copy'}
                  label={column.getIsGrouped() ? 'Ungroup' : 'Group'}
                  onClick={column.toggleGrouping}
                />

                <MenuSub
                  disabled={!column.getCanPin()}
                  icon='lucide:pin'
                  label='Pin'
                >
                  <MenuItem
                    disabled={!isPinned}
                    icon='lucide:pin-off'
                    label='Unpin'
                    onClick={() => pinColumn(false)}
                  />
                  <MenuItem
                    disabled={isPinned === 'left'}
                    icon='lucide:pin'
                    iconClass='rotate-90'
                    label='Left'
                    onClick={() => pinColumn('left')}
                  />
                  <MenuItem
                    disabled={isPinned === 'right'}
                    icon='lucide:pin'
                    iconClass='-rotate-90'
                    label='Right'
                    onClick={() => pinColumn('right')}
                  />
                </MenuSub>

                <MenuSub
                  disabled={!!isPinned}
                  icon='lucide:move-horizontal'
                  label='Move'
                >
                  <MenuItem
                    disabled={column.getIsFirstColumn('center')}
                    icon='lucide:move-left'
                    label='Left'
                    onClick={() => moveColumn('left')}
                  />
                  <MenuItem
                    disabled={column.getIsLastColumn('center')}
                    icon='lucide:move-right'
                    label='Right'
                    onClick={() => moveColumn('right')}
                  />
                </MenuSub>
                <MenuDivider />

                <MenuItem
                  disabled={!!isPinned || !column.getCanHide()}
                  icon='lucide:eye-off'
                  iconClass='text-red-11'
                  label='Hide'
                  onClick={() =>
                    column.toggleVisibility(!column.getIsVisible())
                  }
                />
              </>
            )}
          </Menu>
        )}
      </div>

      {/* resize handle */}
      {column.getCanResize() && (
        <div
          className='absolute top-0 right-0 z-10 h-full w-1.5 cursor-col-resize touch-none select-none hover:bg-primary-6'
          onDoubleClick={column.resetSize}
          onMouseDown={header.getResizeHandler()}
          onTouchStart={header.getResizeHandler()}
        />
      )}
    </Th>
  )
}

TableHeaderCell.displayName = 'TableHeaderCell'
export default TableHeaderCell
