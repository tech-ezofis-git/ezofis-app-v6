/**
 * Moves a stored form date by a number of days. Form dates are stored as
 * "YYYY-MM-DD", and date and time values as "YYYY-MM-DD HH:mm"; the time part
 * is kept as it is. Use a negative number to go back.
 * Returns null when the value is not a date, so the caller leaves the field alone.
 */
export const shiftDateValue = (value: unknown, days: number): string | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})(.*)$/.exec(String(value ?? '').trim())
  if (!match) return null

  const [, year, month, day, rest] = match
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  // "2026-02-31" rolls over to March instead of failing, so check it round-trips.
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) {
    return null
  }

  date.setUTCDate(
    date.getUTCDate() + (Number.isFinite(days) ? Math.trunc(days) : 0),
  )
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}${rest}`
}
