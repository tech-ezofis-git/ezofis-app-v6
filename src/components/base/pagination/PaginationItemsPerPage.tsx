import Button from '@/components/base/button/Button'
import Menu from '@/components/base/menu/Menu'
import MenuItem from '@/components/base/menu/MenuItem'
interface Props {
  value: number
  itemLabel?: string
  onChange: (value: number) => void
}

const options = [5, 10, 20, 30, 50, 100]

const PaginationItemsPerPage: React.FC<Props> = ({
  itemLabel,
  value,
  onChange,
}) => {
  return (
    <div className='hidden items-center justify-end gap-2 select-none md:flex'>
      <div className='text-gray-700'>{itemLabel} per page:</div>
      <Menu
        width='target'
        target={
          <Button
            color='gray'
            label={value.toString()}
            suffixIcon='tabler:chevron-down'
            suffixIconClass='text-gray-500'
            variant='outline'
          />
        }
      >
        {options.map((option) => (
          <MenuItem
            key={option}
            label={option.toString()}
            onClick={() => onChange(option)}
          />
        ))}
      </Menu>
    </div>
  )
}

PaginationItemsPerPage.displayName = 'PaginationItemsPerPage'
export default PaginationItemsPerPage
