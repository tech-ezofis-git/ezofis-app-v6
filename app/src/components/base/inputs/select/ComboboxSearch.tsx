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

  const _leftSection = <Icon className='text-gray-8' name='lucide:search' />

  return (
    <Base.Search
      className={className}
      leftSection={_leftSection}
      leftSectionWidth={40}
      placeholder={placeholder}
      value={search}
      classNames={{
        input:
          'm-0 h-10 w-full border-gray-3 bg-transparent placeholder:text-gray-8',
      }}
      onChange={handleChange}
      onKeyDown={onKeyDown}
    />
  )
}

ComboboxSearch.displayName = 'ComboboxSearch'
export default ComboboxSearch
