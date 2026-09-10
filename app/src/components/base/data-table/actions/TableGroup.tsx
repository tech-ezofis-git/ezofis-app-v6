import { type Table as TanstackTable } from '@tanstack/react-table'
import Badge from '@/components/base/Badge'
import Button from '@/components/base/button/Button'
import InputCheckbox from '@/components/base/inputs/InputCheckbox'
import Menu from '@/components/base/menu/Menu'
import MenuDivider from '@/components/base/menu/MenuDivider'
import MenuItem from '@/components/base/menu/MenuItem'
import MenuLabel from '@/components/base/menu/MenuLabel'
import SortableContainer from '@/components/base/sortable/SortableContainer'
import SortableItem from '@/components/base/sortable/SortableItem'
import Tooltip from '@/components/base/Tooltip'

interface Props<TData> {
  table: TanstackTable<TData>
}

const TableGroup = <TData,>({ table }: Props<TData>) => {
  const groupState = table.getState().grouping
  const notGrouped = table
    .getAllLeafColumns()
    .filter(
      (column) =>
        !!column.accessorFn && column.getCanGroup() && !column.getIsGrouped(),
    )
  const grouped = groupState.map((column) => table.getColumn(column)!)

  const _rightSection = groupState.length ? (
    <Badge color='gray' label={String(groupState.length)} />
  ) : undefined

  return (
    <Menu
      className='px-2 pt-3'
      closeOnItemClick={false}
      position='bottom-start'
      width={240}
      target={
        <Tooltip content='Group by'>
          <Button
            color='gray'
            icon='lucide:copy'
            rightSection={_rightSection}
            variant='outline'
          />
        </Tooltip>
      }
    >
      <MenuLabel>Group by</MenuLabel>
      <SortableContainer
        items={groupState}
        onItemsChange={(groupState) => table.setGrouping(groupState)}
      >
        {grouped.map((column) => (
          <SortableItem id={column.id} key={column.id}>
            <MenuItem
              className='capitalize'
              label={column.columnDef.meta?.label ?? column.id}
              leftSection={<InputCheckbox checked={column.getIsGrouped()} />}
              onClick={() => column.toggleGrouping()}
            />
          </SortableItem>
        ))}
      </SortableContainer>

      {grouped.length > 0 && notGrouped.length > 0 && <MenuDivider />}

      {notGrouped.map((column) => (
        <MenuItem
          className='capitalize'
          key={column.id}
          label={column.columnDef.meta?.label ?? column.id}
          leftSection={<InputCheckbox checked={column.getIsGrouped()} />}
          onClick={() => column.toggleGrouping()}
        />
      ))}

      <MenuDivider />
      <Button
        className='mb-px w-full justify-center text-13'
        color='gray'
        disabled={!groupState.length}
        label='Reset grouping'
        variant='subtle'
        onClick={() => table.resetGrouping()}
      />
    </Menu>
  )
}

TableGroup.displayName = 'TableGroup'
export default TableGroup
