import { type Table as TanstackTable } from '@tanstack/react-table'
import Button from '@/components/base/button/Button'
import InputRadio from '@/components/base/inputs/InputRadio'
import Menu from '@/components/base/menu/Menu'
import MenuDivider from '@/components/base/menu/MenuDivider'
import MenuItem from '@/components/base/menu/MenuItem'
import MenuLabel from '@/components/base/menu/MenuLabel'

interface Props<TData> {
  table: TanstackTable<TData>
}

const TableExport = <TData,>({ table }: Props<TData>) => {
  return (
    <Menu
      className='px-2 pt-3'
      closeOnItemClick={false}
      position='bottom-end'
      width={200}
      target={
        <Button
          color='gray'
          icon='tabler:download'
          label='Export'
          variant='outline'
        />
      }
    >
      <MenuLabel>Columns to export</MenuLabel>
      <MenuItem label='Visible columns' leftSection={<InputRadio />} />
      <MenuItem label='All columns' leftSection={<InputRadio checked />} />
      <MenuDivider />

      <MenuLabel>Rows to export</MenuLabel>
      <MenuItem
        disabled={!table.getIsSomeRowsSelected()}
        label='Selected rows'
        leftSection={<InputRadio />}
      />
      <MenuItem label='All rows' leftSection={<InputRadio checked />} />
      <MenuDivider />

      <MenuLabel>File format</MenuLabel>
      <MenuItem label='CSV' leftSection={<InputRadio />} />
      <MenuItem label='Excel' leftSection={<InputRadio checked />} />
      <MenuDivider />

      <Button
        className='mb-px w-full justify-center text-small'
        color='gray'
        label='Download'
        variant='subtle'
      />
    </Menu>
  )
}

TableExport.displayName = 'TableExport'
export default TableExport
