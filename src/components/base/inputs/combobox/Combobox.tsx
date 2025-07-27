import { Combobox as Base, useCombobox } from '@mantine/core'
import React from 'react'
import type { Option } from '@/types/option'
import type { SelectVariant } from '../types'
import ComboboxOptions from './ComboboxOptions'
import ComboboxSearch from './ComboboxSearch'
import ComboboxTarget from './ComboboxTarget'

interface Props {
  options: Option[]
  children?: React.ReactNode
  className?: string
  clearable?: boolean
  creatable?: boolean
  description?: string
  disabled?: boolean
  error?: string
  label?: string
  loading?: boolean
  optional?: boolean
  placeholder?: string
  readOnly?: boolean
  required?: boolean
  search?: string
  searchable?: boolean
  searchPlaceholder?: string
  tooltip?: string
  tooltipWidth?: number
  value?: Option[] | null
  variant?: SelectVariant
  onBottomReached?: () => void
  onChange?: (value: Option | null) => void
  onCreate?: () => void
  onSearch?: (value: string) => void
}

const Combobox = React.forwardRef<HTMLButtonElement, Props>(
  (
    {
      children,
      className,
      clearable,
      creatable,
      description,
      disabled,
      error,
      label,
      loading,
      optional,
      options,
      placeholder,
      readOnly,
      required,
      search,
      searchable,
      searchPlaceholder,
      tooltip,
      tooltipWidth,
      value,
      variant,
      onBottomReached,
      onChange,
      onSearch,
    },
    ref,
  ) => {
    const comboboxStore = useCombobox({
      onDropdownClose: () => {
        onSearch?.('')
        comboboxStore.resetSelectedOption()
      },
    })

    return (
      <Base store={comboboxStore}>
        <ComboboxTarget
          className={className}
          clearable={clearable}
          description={description}
          disabled={disabled}
          error={error}
          label={label}
          loading={loading}
          optional={optional}
          placeholder={placeholder}
          readOnly={readOnly}
          ref={ref}
          required={required}
          tooltip={tooltip}
          tooltipWidth={tooltipWidth}
          value={value}
          onChange={onChange}
          onClick={() => comboboxStore.toggleDropdown()}
        >
          {children}
        </ComboboxTarget>

        <Base.Dropdown
          classNames={{
            dropdown: 'border-0 bg-surface-raised p-0 ring-1 ring-gray-600/10',
          }}
        >
          {(searchable || creatable) && (
            <ComboboxSearch
              placeholder={searchPlaceholder}
              value={search}
              onChange={onSearch}
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
