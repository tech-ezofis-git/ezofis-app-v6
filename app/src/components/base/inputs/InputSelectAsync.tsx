import { forwardRef } from 'react'
import type { InfiniteQueryOptions, Option } from '@/api/dummy/types/option'
import type { SelectProps } from './shared/types'
import Combobox from './select/Combobox'
import useAsyncOptions from './shared/hooks/useAsyncOptions'

interface Props extends Omit<SelectProps, 'options'> {
  value: Option | null
  getQueryOptions: () => InfiniteQueryOptions
  onChange: (value: Option | null) => void
}

const InputSelectAsync = forwardRef<HTMLButtonElement, Props>(
  ({ value, getQueryOptions, onChange, ...rest }, ref) => {
    const { handleBottomReached, loading, options, search, onSearch } =
      useAsyncOptions(getQueryOptions)

    const handleChange = (value: Option[]) => {
      const list = value ?? []
      onChange(list.length ? list[0] : null)
    }

    return (
      <Combobox
        {...rest}
        loading={loading}
        options={options}
        ref={ref}
        search={search}
        value={value ? [value] : []}
        variant='single'
        onBottomReached={handleBottomReached}
        onChange={handleChange}
        onSearch={onSearch}
      />
    )
  },
)

InputSelectAsync.displayName = 'InputSelectAsync'
export default InputSelectAsync
