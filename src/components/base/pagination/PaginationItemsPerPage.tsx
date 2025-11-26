import Button from '@/components/base/button/Button'
import Menu from '@/components/base/menu/Menu'
import MenuItem from '@/components/base/menu/MenuItem'
import cn from '@/utils/cn'
interface Props {
  pageSize: number
  className?: string
  itemLabel?: string
  onPageSizeChange: (value: number) => void
}

const options = [5, 10, 20, 30, 50, 100]

const PaginationItemsPerPage = ({
  className,
  itemLabel,
  pageSize,
  onPageSizeChange,
}: Props) => {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-2 select-none',
        className,
      )}
    >
      <div className='text-13 text-gray-11'>{itemLabel} per page:</div>
      <Menu
        width='target'
        target={
          <Button
            color='gray'
            label={pageSize.toString()}
            suffixIcon='tabler:chevron-down'
            suffixIconClass='text-gray-9'
            variant='outline'
          />
        }
      >
        {options.map((option) => (
          <MenuItem
            key={option}
            label={option.toString()}
            onClick={() => onPageSizeChange(option)}
          />
        ))}
      </Menu>
    </div>
  )
}

PaginationItemsPerPage.displayName = 'PaginationItemsPerPage'
export default PaginationItemsPerPage
