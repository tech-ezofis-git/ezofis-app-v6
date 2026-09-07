import { useDebouncedValue } from '@mantine/hooks'
import { useMemo, useState } from 'react'
import type { Option } from '@/types/option'

export default function useLocalSearch(options: Option[] = []) {
  const [search, setSearch] = useState('')
  const [debounced] = useDebouncedValue(search, 300)

  const filteredOptions = useMemo(() => {
    const list = options ?? []
    const trimmed = debounced.trim().toLowerCase()
    return trimmed
      ? list.filter(
          (o) =>
            o.name.toLowerCase().includes(trimmed) ||
            (o.description || '').toLowerCase().includes(trimmed),
        )
      : list
  }, [options, debounced])

  return {
    filteredOptions,
    search,
    onSearch: setSearch,
  }
}
