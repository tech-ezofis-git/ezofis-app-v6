import { forwardRef } from 'react'
import type { Option } from '@/types/option'
import type { SelectProps } from './shared/types'
import Combobox from './select/Combobox'
import useLocalSearch from './shared/hooks/useLocalSearch'

interface Props extends SelectProps {
  value: Option | null
  onChange: (value: Option | null) => void
}

const InputSelect = forwardRef<HTMLButtonElement, Props>(
  ({ dropdownFooter, options, value, onChange, ...rest }, ref) => {
    const { filteredOptions, search, onSearch } = useLocalSearch(options)

    const handleChange = (value: Option[]) => {
      onChange(value.length ? value[0] : null)
    }

    return (
      <Combobox
        {...rest}
        dropdownFooter={dropdownFooter}
        options={filteredOptions}
        ref={ref}
        search={search}
        value={value ? [value] : []}
        variant='single'
        onChange={handleChange}
        onSearch={onSearch}
      />
    )
  },
)

InputSelect.displayName = 'InputSelect'
export default InputSelect
