import dayjs from 'dayjs'

/**
 * Parse API timestamps stored as UTC.
 * Bare ISO datetimes without Z/offset are treated as UTC, then can be
 * formatted with dayjs into the system timezone.
 */
export const parseUtcDate = (value: unknown): Date | null => {
  if (value == null || value === '') return null
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  let raw = String(value).trim()
  if (!raw) return null

  // Date-only values are calendar dates — do not force UTC.
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const date = new Date(raw)
    return Number.isNaN(date.getTime()) ? null : date
  }

  // Bare ISO datetime from DB (UTC) without Z/offset.
  if (/^\d{4}-\d{2}-\d{2}T/.test(raw) && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw)) {
    raw = `${raw}Z`
  }

  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date
}

export const formatUtcToLocalDate = (
  value: unknown,
  fallback = '—',
): string => {
  const date = parseUtcDate(value)
  if (!date) return value ? String(value) : fallback
  return dayjs(date).format('DD-MMM-YYYY')
}

export const formatUtcToLocalDateTime = (
  value: unknown,
  fallback = '—',
): string => {
  const date = parseUtcDate(value)
  if (!date) return value ? String(value) : fallback
  return dayjs(date).format('DD-MMM-YYYY hh:mm A')
}
