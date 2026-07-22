/** Delimiter for multi-select filter values stored in Record<string, string>. */
export const MULTI_FILTER_SEP = '||'

export const splitFilterValues = (value?: string | null): string[] => {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return []
  if (trimmed.includes(MULTI_FILTER_SEP)) {
    return trimmed
      .split(MULTI_FILTER_SEP)
      .map((part) => part.trim())
      .filter(Boolean)
  }
  return [trimmed]
}

export const joinFilterValues = (values: string[]): string =>
  values
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(MULTI_FILTER_SEP)

export const toggleFilterValue = (
  current: string | null | undefined,
  value: string,
): string => {
  const selected = splitFilterValues(current)
  const next = selected.includes(value)
    ? selected.filter((item) => item !== value)
    : [...selected, value]
  return joinFilterValues(next)
}

/** OR-match: item matches if it includes any selected value. */
export const matchesAnyFilterValue = (
  itemValue: string,
  filterValue: string | null | undefined,
): boolean => {
  const selected = splitFilterValues(filterValue)
  if (!selected.length) return true

  const lower = String(itemValue || '')
    .trim()
    .toLowerCase()
  if (!lower) return false

  return selected.some((part) => lower.includes(part.toLowerCase()))
}
