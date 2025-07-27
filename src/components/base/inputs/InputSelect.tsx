import React, { useMemo, useState } from 'react'
import type { Option } from '@/types/option'
import Combobox from './combobox/Combobox'

interface Props {
  options: Option[]
  className?: string
  clearable?: boolean
  creatable?: boolean
  description?: string
  disabled?: boolean
  error?: string
  label?: string
  optional?: boolean
  placeholder?: string
  readOnly?: boolean
  required?: boolean
  searchable?: boolean
  searchPlaceholder?: string
  tooltip?: string
  tooltipWidth?: number
  value?: Option | null
  onChange?: (value: Option | null) => void
}

const InputSelect = React.forwardRef<HTMLButtonElement, Props>(
  (
    {
      className,
      clearable,
      creatable,
      description,
      disabled,
      error,
      label,
      optional,
      options,
      placeholder,
      readOnly,
      required,
      searchable,
      searchPlaceholder,
      tooltip,
      tooltipWidth,
      value,
      onChange,
    },
    ref,
  ) => {
    const [search, setSearch] = useState('')

    const filteredOptions = useMemo(() => {
      const trimmed = search.trim().toLowerCase()
      if (!trimmed) return options

      return options.filter((option) =>
        option.name.toLowerCase().includes(trimmed),
      )
    }, [options, search])

    return (
      <Combobox
        className={className}
        clearable={clearable}
        creatable={creatable}
        description={error ? undefined : description}
        disabled={disabled}
        error={error}
        label={label}
        optional={optional}
        options={filteredOptions}
        placeholder={placeholder}
        readOnly={readOnly}
        ref={ref}
        required={required}
        search={search}
        searchable={searchable}
        searchPlaceholder={searchPlaceholder}
        tooltip={tooltip}
        tooltipWidth={tooltipWidth}
        value={value ? [value] : value}
        variant='single'
        onChange={onChange}
        onSearch={setSearch}
      >
        {value && (
          <div className='text-sm font-medium text-gray-900'>{value.name}</div>
        )}
      </Combobox>
    )
  },
)

InputSelect.displayName = 'InputSelect'
export default InputSelect
