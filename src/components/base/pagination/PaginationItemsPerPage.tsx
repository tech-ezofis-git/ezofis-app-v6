import { Button, Menu, MenuItem } from '@/components/base'

interface Props {
  value: number
  itemLabel?: string
  onChange: (value: number) => void
}

const PaginationItemsPerPage: React.FC<Props> = ({
  itemLabel,
  onChange,
  value,
}) => {
  const options = [5, 10, 20, 30, 50, 100]

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

export default PaginationItemsPerPage
