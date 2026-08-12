import { useDebouncedValue } from '@mantine/hooks'
import { useMemo, useState } from 'react'
import type { Option } from '@/types/option'

export default function useLocalSearch(options: Option[]) {
  const [search, setSearch] = useState('')
  const [debounced] = useDebouncedValue(search, 300)

  const filteredOptions = useMemo(() => {
    const trimmed = debounced.trim().toLowerCase()
    return trimmed
      ? options.filter((o) => o.name.toLowerCase().includes(trimmed))
      : options
  }, [options, debounced])

  return {
    filteredOptions,
    search,
    onSearch: setSearch,
  }
}
