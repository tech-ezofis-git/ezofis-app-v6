import { forwardRef } from 'react'
import type { InfiniteQueryOptions, Option } from '@/api/dummy/types/option'
import type { SelectProps } from './shared/types'
import Combobox from './select/Combobox'
import useAsyncOptions from './shared/hooks/useAsyncOptions'

interface Props extends Omit<SelectProps, 'options'> {
  value: Option[]
  getQueryOptions: () => InfiniteQueryOptions
  onChange: (value: Option[]) => void
}

const InputSelectMultipleAsync = forwardRef<HTMLButtonElement, Props>(
  ({ getQueryOptions, ...rest }, ref) => {
    const { handleBottomReached, loading, options, search, onSearch } =
      useAsyncOptions(getQueryOptions)

    return (
      <Combobox
        {...rest}
        loading={loading}
        options={options}
        ref={ref}
        search={search}
        variant='multiple'
        onBottomReached={handleBottomReached}
        onSearch={onSearch}
      />
    )
  },
)

InputSelectMultipleAsync.displayName = 'InputSelectMultipleAsync'
export default InputSelectMultipleAsync
