/* eslint-disable @typescript-eslint/no-explicit-any */

/** The signed-in user's details used by the "logged in user" defaults. */
export interface TableUser {
  email: string
  firstName: string
  name: string
}

// A bare string is read as the user's email (how callers used to pass it)
const toTableUser = (user: string | TableUser): TableUser =>
  typeof user === 'string' ? { email: user, firstName: '', name: '' } : user

const isSameUserValue = (value: unknown, expected: string) =>
  expected !== '' && String(value) === expected

const isBlank = (v: unknown) => v === undefined || v === null || v === ''

const toPositiveNumber = (v: unknown): number | undefined => {
  if (isBlank(v)) return undefined
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

const readCell = (row: Record<string, any> | undefined, col: any) =>
  row?.[col.id] ?? (col.name ? row?.[col.name] : undefined)

/**
 * Builds the default values for a new / blank row. Columns without a
 * configured default are omitted, and any value already present in `row` is
 * kept, so user-entered data is never overwritten.
 */
export function buildTableRowDefaults(
  columns: any[],
  existingRows: Array<Record<string, any>>,
  user: string | TableUser,
  row: Record<string, any> = {},
): Record<string, any> {
  const defaults: Record<string, any> = {}
  for (const col of columns) {
    if (!isBlank(readCell(row, col))) continue
    const def = resolveTableColumnDefault(col, existingRows, user)
    if (def !== '' && def !== undefined) defaults[col.id] = def
  }
  return defaults
}

/**
 * True when an untouched first row may be replaced by incoming (scan / OCR /
 * import) rows. The row must hold only generated defaults AND the user must
 * not have edited it in this session: the stored data does not record where a
 * value came from, so a value the user typed that happens to equal a default
 * is only distinguishable while the component remembers the edit.
 */
export function canReplaceUntouchedRow(
  row: Record<string, any> | null | undefined,
  columns: any[],
  user: string | TableUser,
  wasEdited: boolean,
): boolean {
  return !wasEdited && isDefaultOnlyRow(row, columns, user)
}

/**
 * Trims typed / pasted text to the column's configured maximum length
 * (SHORT_TEXT and LONG_TEXT only). Enforced on change instead of through a
 * native `maxLength` / the textarea counter, so nothing visible is added and
 * paste cannot bypass it. No-op when no positive maximum is configured.
 */
export function clampTextToMaxLength(value: string, col: any): string {
  const type = String(col?.type || '').toUpperCase()
  if (type !== 'SHORT_TEXT' && type !== 'LONG_TEXT') return value
  const max = toPositiveNumber(col?.settings?.validation?.maximum)
  return max !== undefined && value.length > max
    ? value.slice(0, Math.floor(max))
    : value
}

/**
 * Currency code a CURRENCY_AMOUNT cell should show: the code stored in the
 * cell, else the column's default currency, else the first restricted
 * currency. Undefined when the column has no currency configuration at all,
 * in which case the cell keeps its original `$` prefix.
 */
export function getColumnCurrencyCode(
  col: any,
  value: unknown,
): string | undefined {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const stored = (value as Record<string, unknown>).currency
    if (typeof stored === 'string' && stored.trim()) {
      return stored.trim().toUpperCase()
    }
  }
  const configured = col?.settings?.specific?.defaultCurrency
  if (typeof configured === 'string' && configured.trim()) {
    return configured.trim().toUpperCase()
  }
  return getColumnCurrencyOptions(col)[0]
}

/**
 * Restricted currency codes for a CURRENCY_AMOUNT column. Empty unless the
 * column is set to "Specific currencies" (the same `currencyOptionsType` /
 * `specificCurrencies` keys top-level currency fields use).
 */
export function getColumnCurrencyOptions(col: any): string[] {
  const specific = col?.settings?.specific
  if (specific?.currencyOptionsType !== 'SPECIFIC') return []
  const list = Array.isArray(specific.specificCurrencies)
    ? specific.specificCurrencies
    : []
  return Array.from(
    new Set(
      list.map((c: unknown) => String(c).trim().toUpperCase()).filter(Boolean),
    ),
  )
}

/**
 * Configured decimal places for a NUMBER / COUNTER column, or undefined when
 * unset. Applies only with the DECIMAL content rule, so INTEGER stays
 * integer-only and columns without a rule are unchanged.
 */
export function getColumnDecimalDigits(col: any): number | undefined {
  const rule = String(
    col?.settings?.validation?.contentRule || '',
  ).toUpperCase()
  if (rule !== 'DECIMAL') return undefined
  const validation = col?.settings?.validation
  const raw = validation?.decimalDigits ?? validation?.decimalValue
  if (isBlank(raw)) return undefined
  const n = Number(raw)
  return Number.isInteger(n) && n >= 0 ? n : undefined
}

/** Native input props for a NUMBER / COUNTER table cell. */
export function getNumberCellProps(col: any): {
  allowDecimal: boolean
  decimalScale: number | undefined
  placeholder: string
  prefix: string | undefined
  step: number | undefined
  suffix: string | undefined
} {
  const rule = String(
    col?.settings?.validation?.contentRule || '',
  ).toUpperCase()
  const specific = col?.settings?.specific
  return {
    allowDecimal: rule !== 'INTEGER',
    decimalScale: getColumnDecimalDigits(col),
    placeholder: specific?.placeholder || '0',
    prefix: specific?.prefixLabel || undefined,
    step: toPositiveNumber(specific?.step),
    suffix: specific?.suffixLabel || undefined,
  }
}

/**
 * True when the rows hold at least one cell the user could have entered, i.e.
 * a non-blank value that is not exactly what a column default would have
 * generated for that row. Used so an auto-filled default (an auto-sequence of
 * 1, the user's email…) never makes a required table look filled.
 */
export function hasMeaningfulTableRows(
  rows: unknown,
  columns: any[],
  user: string | TableUser,
): boolean {
  return (
    Array.isArray(rows) &&
    rows.some(
      (row, idx) =>
        !isDefaultOnlyRow(row, columns, user, rows.slice(0, idx)),
    )
  )
}

/**
 * True when every non-internal cell in the row is blank or equals the value a
 * column default would have generated for it. `rowsBefore` are the rows above
 * this one (an AUTO_SEQUENCE default depends on them). Cells that map to no
 * known column, or to a column without a matching default, count as user data.
 *
 * Known limit: stored rows carry no record of where a value came from, so a
 * user-entered value identical to the generated default is indistinguishable
 * from it here. Callers that must never discard such a row (see
 * `canReplaceUntouchedRow`) combine this with an in-session "edited" flag.
 */
export function isDefaultOnlyRow(
  row: Record<string, any> | null | undefined,
  columns: any[],
  user: string | TableUser,
  rowsBefore: Array<Record<string, any>> = [],
  now: Date = new Date(),
): boolean {
  return Object.entries(row || {}).every(([key, value]) => {
    if (key.startsWith('_') || isBlank(value)) return true
    if (typeof value === 'string' && value.trim() === '') return true
    if (Array.isArray(value) && value.length === 0) return true
    const col = columns.find((c) => c.id === key || (c.name && c.name === key))
    return col
      ? isGeneratedDefaultCell(col, value, user, rowsBefore, now)
      : false
  })
}

/** Whether `value` is exactly what this column's configured default produces. */
export function isGeneratedDefaultCell(
  col: any,
  value: unknown,
  user: string | TableUser,
  rowsBefore: Array<Record<string, any>> = [],
  now: Date = new Date(),
): boolean {
  const specific = col?.settings?.specific
  switch (specific?.defaultValueType || 'CUSTOM') {
    case 'AUTO_SEQUENCE':
      // Must match the number generation would have produced at this position
      return (
        Number.isFinite(Number(value)) &&
        Number(value) ===
          Number(resolveTableColumnDefault(col, rowsBefore, user, now))
      )
    case 'CURRENT_DATE':
      return String(value) === now.toISOString().slice(0, 10)
    case 'USER_EMAIL':
      return isSameUserValue(value, toTableUser(user).email)
    case 'USER_FIRST_NAME':
      return isSameUserValue(value, toTableUser(user).firstName)
    case 'USER_NAME':
      return isSameUserValue(value, toTableUser(user).name)
    case 'CUSTOM':
    default:
      return (
        !isBlank(specific?.customDefaultValue) &&
        String(value) === String(specific.customDefaultValue)
      )
  }
}

/**
 * Resolves the configured default for one table column.
 * AUTO_SEQUENCE continues from the highest numeric value already in that
 * column (not from the row count), so deleting a middle row never produces a
 * duplicate sequence number.
 */
export function resolveTableColumnDefault(
  col: any,
  existingRows: Array<Record<string, any>>,
  user: string | TableUser,
  now: Date = new Date(),
): any {
  const specific = col?.settings?.specific
  switch (specific?.defaultValueType || 'CUSTOM') {
    case 'USER_EMAIL':
      return toTableUser(user).email
    case 'USER_FIRST_NAME':
      return toTableUser(user).firstName
    case 'USER_NAME':
      return toTableUser(user).name
    case 'CURRENT_DATE':
      return now.toISOString().slice(0, 10)
    case 'AUTO_SEQUENCE': {
      let max = 0
      for (const row of existingRows) {
        const n = Number(readCell(row, col))
        if (!isBlank(readCell(row, col)) && Number.isFinite(n) && n > max) {
          max = n
        }
      }
      return max + 1
    }
    case 'CUSTOM':
    default:
      return specific?.customDefaultValue || ''
  }
}
