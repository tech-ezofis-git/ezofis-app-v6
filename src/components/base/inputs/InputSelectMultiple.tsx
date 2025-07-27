import { useDebouncedValue } from '@mantine/hooks'
import React, { useMemo, useState } from 'react'
import type { Option } from '@/types/option'
import Combobox from './combobox/Combobox'

interface Props {
  options: Option[]
  value: Option[]
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
  onChange: (value: Option[]) => void
}

const InputSelectMultiple = React.forwardRef<HTMLButtonElement, Props>(
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
    const [firstValue, counter] = useMemo(() => {
      const first = value[0] || null
      const count = value.length > 1 ? value.length - 1 : null
      return [first, count]
    }, [value])

    const [search, setSearch] = useState('')
    const [debounced] = useDebouncedValue(search, 200)

    const filteredOptions = useMemo(() => {
      const trimmed = debounced.trim().toLowerCase()
      return trimmed
        ? options.filter((o) => o.name.toLowerCase().includes(trimmed))
        : options
    }, [options, debounced])

    const handleChange = (selected: Option | null) => {
      if (!selected) return onChange([])
      const exists = value.some((v) => v.id === selected.id)
      onChange(
        exists
          ? value.filter((v) => v.id !== selected.id)
          : [...value, selected],
      )
    }

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
        value={value}
        variant='multiple'
        onChange={handleChange}
        onSearch={setSearch}
      >
        <div className='flex items-center gap-1 py-1'>
          {firstValue && (
            <div className='truncate rounded bg-gray-600/10 px-2 py-0.5 text-sx font-medium whitespace-nowrap text-gray-900'>
              {firstValue.name}
            </div>
          )}
          {counter && (
            <div className='rounded bg-gray-600/10 px-2 py-0.5 text-sx font-medium whitespace-nowrap text-gray-900'>
              +{counter}
            </div>
          )}
        </div>
      </Combobox>
    )
  },
)

InputSelectMultiple.displayName = 'InputSelectMultiple'
export default InputSelectMultiple
