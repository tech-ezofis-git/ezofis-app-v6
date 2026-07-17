import Button from '@/components/base/button/Button'
import Menu from '@/components/base/menu/Menu'
import MenuItem from '@/components/base/menu/MenuItem'
import MenuLabel from '@/components/base/menu/MenuLabel'
import type { RowSize } from '../types'
import InputRadioIndicator from '../../inputs/InputRadioIndicator'

interface Props {
  rowSize: RowSize
  onRowSizeChange: (rowSize: RowSize) => void
  iconOnly?: boolean
}

const rowSizes = ['default', 'compact', 'comfortable']

const TableRows = ({ rowSize, onRowSizeChange, iconOnly }: Props) => {
  return (
    <Menu
      className='px-2 py-3'
      position='bottom-end'
      width={160}
      target={
        <Button
          color='gray'
          icon='lucide:rows-3'
          label={iconOnly ? undefined : 'Rows'}
          variant='outline'
        />
      }
    >
      <MenuLabel>Row size</MenuLabel>
      {rowSizes.map((item) => (
        <MenuItem
          className='capitalize'
          key={item}
          label={item}
          leftSection={<InputRadioIndicator checked={item === rowSize} />}
          onClick={() => onRowSizeChange(item as RowSize)}
        />
      ))}
    </Menu>
  )
}

TableRows.displayName = 'TableRows'
export default TableRows
