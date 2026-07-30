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
  autoOpen?: boolean
  dropdownFooter?: React.ReactNode
  loading?: boolean
  rightSectionIcon?: string
  variant?: SelectVariant
  onBottomReached?: () => void
  onChange: (value: Option[]) => void
  onCreate?: () => void
  onDropdownClose?: () => void
  onDropdownOpen?: () => void
  onSearch: (search: string) => void
}

const Combobox = forwardRef<HTMLButtonElement, Props>(
  (
    {
      autoOpen,
      creatable,
      createOptionLabel,
      dropdownFooter,
      isCreatableSearch,
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
      onDropdownClose,
      onDropdownOpen,
      onSearch,
      ...rest
    },
    ref,
  ) => {
    const comboboxStore = useCombobox({
      onDropdownClose: () => {
        onSearch('')
        comboboxStore.resetSelectedOption()
        onDropdownClose?.()
      },
    })

    useEffect(() => {
      if (!autoOpen) return
      comboboxStore.openDropdown()
      // eslint-disable-next-line react-hooks/exhaustive-deps -- open once when autoOpen is set
    }, [autoOpen])

    useEffect(() => {
      if (comboboxStore.dropdownOpened) {
        comboboxStore.focusSearchInput()
        onDropdownOpen?.()
      }
    }, [comboboxStore.dropdownOpened, onDropdownOpen])

    const handleSearchKeyDown = (
      event: React.KeyboardEvent<HTMLInputElement>,
    ) => {
      if (event.key === 'Enter' && creatable && search.trim()) {
        const trimmed = search.trim()
        if (isCreatableSearch && !isCreatableSearch(trimmed)) return

        // If there's an exact match in current options, let Mantine handle it naturally
        const hasExactMatch = options.some(
          (o) =>
            o.name.toLowerCase() === trimmed.toLowerCase() ||
            String(o.value || '').toLowerCase() === trimmed.toLowerCase(),
        )
        if (hasExactMatch) return

        event.preventDefault()
        const id = Date.now()
        const newOption = {
          description: '',
          disabled: false,
          id,
          name: trimmed,
          value: trimmed,
        }

        if (variant === 'single') {
          onChange([newOption])
        } else {
          const alreadySelected = value.some(
            (item) =>
              String(item.value || item.name).toLowerCase() ===
              trimmed.toLowerCase(),
          )
          if (!alreadySelected) onChange([...value, newOption])
        }
        onSearch('')
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
          data-combobox-dropdown
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
            createOptionLabel={createOptionLabel}
            isCreatableSearch={isCreatableSearch}
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
