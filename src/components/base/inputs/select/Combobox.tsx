import { Combobox as Base, useCombobox } from '@mantine/core'
import { forwardRef } from 'react'
import type { Option } from '@/types/option'
import type { InputProps, SelectProps, SelectVariant } from '../shared/types'
import ComboboxOptions from './ComboboxOptions'
import ComboboxSearch from './ComboboxSearch'
import ComboboxTarget from './ComboboxTarget'

interface Props extends InputProps, SelectProps {
  search: string
  value: Option[]
  loading?: boolean
  variant?: SelectVariant
  onBottomReached?: () => void
  onChange: (value: Option[]) => void
  onCreate?: () => void
  onSearch: (search: string) => void
}

const Combobox = forwardRef<HTMLButtonElement, Props>(
  (
    {
      creatable,
      options,
      search,
      searchable,
      searchPlaceholder,
      value,
      variant,
      onBottomReached,
      onChange,
      onSearch,
      ...rest
    },
    ref,
  ) => {
    const comboboxStore = useCombobox({
      onDropdownClose: () => {
        onSearch('')
        comboboxStore.resetSelectedOption()
      },
    })

    return (
      <Base store={comboboxStore}>
        <ComboboxTarget
          {...rest}
          ref={ref}
          value={value}
          variant={variant}
          onChange={onChange}
          onClick={() => comboboxStore.toggleDropdown()}
        />

        <Base.Dropdown
          classNames={{
            dropdown: 'border border-gray-3 bg-surface-raised p-0 shadow-lg',
          }}
        >
          {(searchable || creatable) && (
            <ComboboxSearch
              placeholder={searchPlaceholder}
              search={search}
              onSearch={onSearch}
            />
          )}

          <ComboboxOptions
            comboboxStore={comboboxStore}
            creatable={creatable}
            options={options}
            search={search}
            value={value}
            variant={variant}
            onBottomReached={onBottomReached}
            onChange={onChange}
          />
        </Base.Dropdown>
      </Base>
    )
  },
)

Combobox.displayName = 'Combobox'
export default Combobox
