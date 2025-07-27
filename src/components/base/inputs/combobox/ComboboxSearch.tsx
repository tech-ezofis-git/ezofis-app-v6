import { Combobox as Base } from '@mantine/core'
import React, { type ChangeEvent } from 'react'
import Icon from '@/components/base/Icon'

interface Props {
  className?: string
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
}

const ComboboxSearch: React.FC<Props> = ({
  className,
  placeholder = 'Search',
  value,
  onChange,
}) => {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) =>
    onChange?.(e.currentTarget.value)

  return (
    <Base.Search
      className={className}
      leftSection={<Icon className='text-gray-400' name='tabler:search' />}
      leftSectionWidth={40}
      placeholder={placeholder}
      value={value}
      classNames={{
        input: 'm-0 h-10 w-full border-gray-600/10 bg-transparent',
      }}
      onChange={handleChange}
    />
  )
}

ComboboxSearch.displayName = 'ComboboxSearch'
export default ComboboxSearch
