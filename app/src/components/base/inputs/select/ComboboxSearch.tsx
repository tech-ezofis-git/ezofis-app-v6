import { Combobox as Base } from '@mantine/core'
import { type ChangeEvent } from 'react'
import Icon from '@/components/base/icon/Icon'

interface Props {
  search: string
  className?: string
  placeholder?: string
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onSearch: (search: string) => void
}

const ComboboxSearch = ({
  className,
  placeholder = 'Search',
  search,
  onKeyDown,
  onSearch,
}: Props) => {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) =>
    onSearch(e.currentTarget.value)

  const _leftSection = (
    <Icon className='text-primary-11' name='lucide:search' />
  )

  return (
    <Base.Search
      className={className}
      leftSection={_leftSection}
      leftSectionPointerEvents='none'
      leftSectionWidth={28}
      placeholder={placeholder}
      value={search}
      classNames={{
        input:
          'm-0 h-10 w-full border-gray-3 bg-transparent !pl-8 placeholder:text-gray-8',
        section:
          'bg-primary-4 text-primary-11 data-[position=right]:bg-transparent data-[position=right]:text-inherit',
      }}
      onChange={handleChange}
      onKeyDown={onKeyDown}
    />
  )
}

ComboboxSearch.displayName = 'ComboboxSearch'
export default ComboboxSearch
