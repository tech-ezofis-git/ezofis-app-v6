import { type Table as TanstackTable } from '@tanstack/react-table'
import Badge from '@/components/base/Badge'
import Button from '@/components/base/button/Button'
import InputCheckbox from '@/components/base/inputs/InputCheckbox'
import Menu from '@/components/base/menu/Menu'
import MenuDivider from '@/components/base/menu/MenuDivider'
import MenuItem from '@/components/base/menu/MenuItem'
import MenuLabel from '@/components/base/menu/MenuLabel'
import ScrollAreaAutoSize from '@/components/base/scroll-area/ScrollAreaAutoSize'
import SortableContainer from '@/components/base/sortable/SortableContainer'
import SortableItem from '@/components/base/sortable/SortableItem'

interface Props<TData> {
  table: TanstackTable<TData>
  iconOnly?: boolean
}

const TableColumns = <TData,>({ iconOnly, table }: Props<TData>) => {
  const orderState = table.getState().columnOrder
  const columns = table
    .getAllLeafColumns()
    .filter((c) => c.getCanHide() && !c.getIsPinned())
  const visibleColumns = columns.filter((c) => c.getIsVisible())

  const _rightSection = (
    <Badge color='gray' label={String(visibleColumns.length)} />
  )

  const showAllColumns = () => {
    const visibilityState = table.getState().columnVisibility

    const columnIds = columns.map((c) => c.id)
    const newState = Object.fromEntries(columnIds.map((id) => [id, true]))

    table.setColumnVisibility({
      ...newState,
      group: visibilityState.group || false,
    })
  }

  return (
    <Menu
      className='p-1 pt-2'
      closeOnItemClick={false}
      position='bottom-start'
      width={240}
      target={
        <Button
          color='gray'
          icon='lucide:columns-3'
          label={iconOnly ? undefined : 'Columns'}
          rightSection={_rightSection}
          variant='outline'
        />
      }
    >
      <MenuLabel>Columns</MenuLabel>
      <ScrollAreaAutoSize maxHeight={360} type='auto'>
        <SortableContainer
          items={orderState}
          onItemsChange={(o) => table.setColumnOrder(o)}
        >
          {columns.map((column) => (
            <SortableItem id={column.id} key={column.id}>
              <MenuItem
                label={column.columnDef.meta?.label ?? column.id}
                leftSection={<InputCheckbox checked={column.getIsVisible()} />}
                onClick={() => column.toggleVisibility(!column.getIsVisible())}
              />
            </SortableItem>
          ))}
        </SortableContainer>
      </ScrollAreaAutoSize>

      <MenuDivider />
      <div className='flex items-center gap-1 pb-0.5'>
        <Button
          className='flex-1 justify-center text-13'
          color='gray'
          label='Show all'
          variant='subtle'
          onClick={showAllColumns}
        />
        <Button
          className='flex-1 justify-center text-13'
          color='gray'
          label='Unpin all'
          variant='subtle'
          onClick={() =>
            table.setColumnPinning(table.initialState.columnPinning)
          }
        />
      </div>
    </Menu>
  )
}

TableColumns.displayName = 'TableColumns'
export default TableColumns
