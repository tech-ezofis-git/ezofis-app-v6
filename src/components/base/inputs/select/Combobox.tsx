import { Combobox as Base, useCombobox } from '@mantine/core'
import { forwardRef, useEffect } from 'react'
import type { Option } from '@/types/option'
import type { InputProps, SelectProps, SelectVariant } from '../shared/types'
import ComboboxOptions from './ComboboxOptions'
import ComboboxSearch from './ComboboxSearch'
import ComboboxTarget from './ComboboxTarget'

interface Props extends InputProps, SelectProps {
  search: string
  value: Option[]
  dropdownFooter?: React.ReactNode
  loading?: boolean
  rightSectionIcon?: string
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
      dropdownFooter,
      options,
      position = 'bottom-start',
      rightSectionIcon,
      search,
      searchable,
      searchPlaceholder,
      value,
      variant,
      width = 'target',
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

    useEffect(() => {
      if (comboboxStore.dropdownOpened) {
        comboboxStore.focusSearchInput()
      }
    }, [comboboxStore.dropdownOpened])

    const handleSearchKeyDown = (
      event: React.KeyboardEvent<HTMLInputElement>,
    ) => {
      if (event.key === 'Enter' && creatable && search.trim()) {
        // If there's an exact match in current options, let Mantine handle it naturally
        const hasExactMatch = options.some(
          (o) => o.name.toLowerCase() === search.toLowerCase(),
        )
        if (hasExactMatch) return

        const id = Date.now()
        const newOption = { description: '', disabled: false, id, name: search }

        if (variant === 'single') {
          onChange([newOption])
        } else {
          onChange([...value, newOption])
        }
        comboboxStore.closeDropdown()
      }
    }

    return (
      <Base
        position={position}
        store={comboboxStore}
        transitionProps={{ transition: 'pop' }}
        width={width}
      >
        <ComboboxTarget
          {...rest}
          ref={ref}
          rightSectionIcon={rightSectionIcon}
          value={value}
          variant={variant}
          onChange={onChange}
          onClick={() => comboboxStore.toggleDropdown()}
        />

        <Base.Dropdown
          classNames={{
            dropdown: 'border border-gray-3 bg-surface-raised p-0 shadow-md',
          }}
        >
          {(searchable || creatable) && (
            <ComboboxSearch
              placeholder={searchPlaceholder}
              search={search}
              onKeyDown={handleSearchKeyDown}
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

          {dropdownFooter && (
            <div className='border-t border-gray-1 bg-surface-raised p-1'>
              {dropdownFooter}
            </div>
          )}
        </Base.Dropdown>
      </Base>
    )
  },
)

Combobox.displayName = 'Combobox'
export default Combobox
