import { type Table as TanstackTable } from '@tanstack/react-table'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import InputRadioIndicator from '@/components/base/inputs/InputRadioIndicator'
import Menu from '@/components/base/menu/Menu'
import MenuDivider from '@/components/base/menu/MenuDivider'
import MenuItem from '@/components/base/menu/MenuItem'
import MenuLabel from '@/components/base/menu/MenuLabel'
import Tooltip from '@/components/base/Tooltip'

interface Props<TData> {
  table: TanstackTable<TData>
  iconOnly?: boolean
}

const TableExport = <TData,>({ iconOnly = true, table }: Props<TData>) => {
  const trigger = iconOnly ? (
    <Tooltip content='Export' position='top'>
      <IconButton color='gray' icon='lucide:download' variant='outline' />
    </Tooltip>
  ) : (
    <Button
      color='gray'
      icon='lucide:download'
      label='Export'
      variant='outline'
    />
  )

  return (
    <Menu
      className='px-2 pt-3'
      closeOnItemClick={false}
      position='bottom-end'
      target={trigger}
      width={200}
    >
      <MenuLabel>Columns to export</MenuLabel>
      <MenuItem label='Visible columns' leftSection={<InputRadioIndicator />} />
      <MenuItem
        label='All columns'
        leftSection={<InputRadioIndicator checked />}
      />
      <MenuDivider />

      <MenuLabel>Rows to export</MenuLabel>
      <MenuItem
        disabled={!table.getIsSomeRowsSelected()}
        label='Selected rows'
        leftSection={<InputRadioIndicator />}
      />
      <MenuItem
        label='All rows'
        leftSection={<InputRadioIndicator checked />}
      />
      <MenuDivider />

      <MenuLabel>File format</MenuLabel>
      <MenuItem label='CSV' leftSection={<InputRadioIndicator />} />
      <MenuItem label='Excel' leftSection={<InputRadioIndicator checked />} />
      <MenuDivider />

      <Button
        className='mb-px w-full justify-center text-13'
        color='gray'
        label='Download'
        variant='subtle'
      />
    </Menu>
  )
}

TableExport.displayName = 'TableExport'
export default TableExport
