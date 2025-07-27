import { useDebouncedCallback } from '@mantine/hooks'
import { useInfiniteQuery } from '@tanstack/react-query'
import React, { useMemo, useState } from 'react'
import type { InfiniteQueryOptions, Option } from '@/types/option'
import Combobox from './combobox/Combobox'

interface Props {
  className?: string
  clearable?: boolean
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
  getQueryOptions: () => InfiniteQueryOptions
  onChange?: (value: Option | null) => void
}

const InputSelectAsync = React.forwardRef<HTMLButtonElement, Props>(
  (
    {
      className,
      clearable,
      description,
      disabled,
      error,
      getQueryOptions,
      label,
      optional,
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

    const { data, fetchNextPage, hasNextPage, isFetching, isFetchingNextPage } =
      useInfiniteQuery(getQueryOptions())

    const loading = isFetching || isFetchingNextPage
    const options = useMemo(() => {
      return data?.pages.flatMap((page) => page.data) ?? []
    }, [data])

    const handleBottomReached = () => {
      if (hasNextPage && !loading) {
        fetchNextPage()
      }
    }

    const handleSearch = useDebouncedCallback(setSearch, 500)

    return (
      <Combobox
        className={className}
        clearable={clearable}
        description={error ? undefined : description}
        disabled={disabled}
        error={error}
        label={label}
        loading={loading}
        optional={optional}
        options={options}
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
        onBottomReached={handleBottomReached}
        onChange={onChange}
        onSearch={handleSearch}
      >
        {value && (
          <div className='text-sm font-medium text-gray-900'>{value.name}</div>
        )}
      </Combobox>
    )
  },
)

InputSelectAsync.displayName = 'InputSelectAsync'
export default InputSelectAsync
