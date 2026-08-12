import {
  FILTER_MULTI_SEP,
  parseFilterValues,
  serializeFilterValues,
} from '@/utils/filterUtils'

/** Delimiter for multi-select filter values (aligned with shared filterUtils). */
export const MULTI_FILTER_SEP = FILTER_MULTI_SEP

export const splitFilterValues = (value?: string | null): string[] =>
  parseFilterValues(value)

export const joinFilterValues = (values: string[]): string =>
  serializeFilterValues(values)

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
