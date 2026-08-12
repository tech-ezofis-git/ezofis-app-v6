import { forwardRef } from 'react'
import type { Option } from '@/types/option'
import type { SelectProps } from './shared/types'
import Combobox from './select/Combobox'
import useLocalSearch from './shared/hooks/useLocalSearch'

interface Props extends SelectProps {
  value: Option[]
  onChange: (value: Option[]) => void
}

const InputSelectMultiple = forwardRef<HTMLButtonElement, Props>(
  ({ options, ...rest }, ref) => {
    const { filteredOptions, search, onSearch } = useLocalSearch(options)

    return (
      <Combobox
        {...rest}
        options={filteredOptions}
        ref={ref}
        search={search}
        variant='multiple'
        onSearch={onSearch}
      />
    )
  },
)

InputSelectMultiple.displayName = 'InputSelectMultiple'
export default InputSelectMultiple
