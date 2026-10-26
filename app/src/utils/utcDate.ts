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

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}(T[\d:.]+([zZ]|[+-]\d{2}:?\d{2})?)?$/

/** True for ISO date / UTC timestamp strings, e.g. 2026-10-21T07:24:00. */
export const isIsoDateString = (value: unknown) =>
  typeof value === 'string' && ISO_DATE_PATTERN.test(value.trim())

/**
 * Report cell dates in local time, e.g. 21-10-2026 12:54 PM (date-only
 * values as 21-10-2026). Non-dates are returned unchanged.
 */
export const formatReportDate = (value: string) => {
  const date = parseUtcDate(value)
  if (!date) return value
  return dayjs(date).format(
    DATE_ONLY_PATTERN.test(value.trim()) ? 'DD-MM-YYYY' : 'DD-MM-YYYY hh:mm A',
  )
}
