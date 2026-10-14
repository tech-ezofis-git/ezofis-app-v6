/* eslint-disable @typescript-eslint/no-explicit-any */
import { applyCalculatedFields, evaluateFormula } from './formula'
import {
  normalizeCurrencyEntryValue,
  normalizePhoneEntryValue,
  normalizeV5FormJson,
  type V5CurrencyValue,
  type V5PhoneValue,
} from './v5SchemaAdapter'

export type CanonicalRuntimeFieldType =
  | 'ADDRESS'
  | 'AUDIO'
  | 'BARCODE'
  | 'BUTTON'
  | 'CALCULATED'
  | 'CHIPS'
  | 'CONSENT'
  | 'CONTACT_INFO'
  | 'COUNTER'
  | 'CURRENCY_AMOUNT'
  | 'DATE'
  | 'DATE_TIME'
  | 'DIVIDER'
  | 'DYNAMIC_TABLE'
  | 'EMAIL'
  | 'EMAIL_AUTHENTICATION'
  | 'EMBED_VIDEO'
  | 'FILE_UPLOAD'
  | 'FILL_IN_THE_BLANKS'
  | 'FULL_NAME'
  | 'HEADING'
  | 'HTML_EDITOR'
  | 'IMAGE_UPLOAD'
  | 'JSON_EDITOR'
  | 'LABEL'
  | 'LOCATION_MAP'
  | 'LOGIN_AUTHENTICATION'
  | 'LONG_TEXT'
  | 'MATRIX'
  | 'MOBILE_AUTHENTICATION'
  | 'MULTIPLE_CHOICE'
  | 'MULTI_SELECT'
  | 'NESTED_LIST'
  | 'NUMBER'
  | 'OPINION_SCALE'
  | 'PAGE_BREAK'
  | 'PASSWORD'
  | 'PHONE_NUMBER'
  | 'POPUP'
  | 'QR_CODE'
  | 'RATING'
  | 'REDIRECT_TO_URL'
  | 'SERIAL_NUMBER'
  | 'SHORT_TEXT'
  | 'SIGNATURE'
  | 'SINGLE_CHOICE'
  | 'SINGLE_SELECT'
  | 'SOCIAL_MEDIA'
  | 'TABLE'
  | 'TABS'
  | 'TEXT_BUILDER'
  | 'TIME'
  | 'URL'
  | 'USER'
  | 'YES_NO_TOGGLE'

const V5_FIELD_TYPE_ALIASES: Record<string, CanonicalRuntimeFieldType> = {
  BOOLEAN: 'YES_NO_TOGGLE',
  CHECKBOX: 'MULTIPLE_CHOICE',
  CURRENCY: 'CURRENCY_AMOUNT',
  DROPDOWN: 'SINGLE_SELECT',
  IMAGE: 'IMAGE_UPLOAD',
  LEGAL: 'MULTIPLE_CHOICE',
  LINE_ITEM: 'TABLE',
  RADIO: 'SINGLE_CHOICE',
  WEBSITE: 'URL',
  YES_NO: 'SINGLE_CHOICE',
}

/**
 * Legacy field types that are hidden from the V6 palette per Decision 1
 * but must be preserved and rendered inline when encountered in existing V5 forms.
 */
export const LEGACY_INLINE_FIELD_TYPES = new Set<string>([
  'POPUP',
  'TABS',
  'NESTED_LIST',
  'LOGIN_AUTHENTICATION',
  'EMAIL_AUTHENTICATION',
  'MOBILE_AUTHENTICATION',
])

/**
 * Resolves a field object or raw type string into a canonical V6 runtime field type,
 * handling all V5 legacy aliases (`CURRENCY`, `CHECKBOX`, `RADIO`, `YES_NO`, `LEGAL`, `WEBSITE`, `IMAGE`, etc.).
 */
export function resolveRuntimeFieldType(
  fieldOrType: any,
): CanonicalRuntimeFieldType {
  const rawType =
    typeof fieldOrType === 'string'
      ? fieldOrType
      : fieldOrType?.type || 'SHORT_TEXT'
  const upper = String(rawType || 'SHORT_TEXT')
    .trim()
    .toUpperCase()

  if (upper in V5_FIELD_TYPE_ALIASES) {
    return V5_FIELD_TYPE_ALIASES[upper]
  }

  return upper as CanonicalRuntimeFieldType
}

/**
 * Resolves the effective user-facing label for a field, honoring V5 `displayLabel` when present.
 */
export function getEffectiveFieldLabel(
  field: any,
  fallback = 'Untitled Question',
): string {
  if (!field || typeof field !== 'object') return fallback
  const candidates = [
    field.settings?.general?.displayLabel,
    field.displayLabel,
    field.label,
    field.settings?.general?.label,
    field.name,
    field.title,
    field.settings?.title,
  ]
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim() !== '') {
      return candidate.trim()
    }
  }
  return fallback
}

/**
 * Resolves the effective user-facing label for a table column, honoring V5 `displayLabel` and `name`/`label`.
 */
export function getEffectiveColumnLabel(
  col: any,
  fallback = 'Column',
): string {
  if (!col || typeof col !== 'object') return fallback
  const candidates = [
    col.settings?.general?.displayLabel,
    col.displayLabel,
    col.name,
    col.label,
  ]
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim() !== '') {
      return candidate.trim()
    }
  }
  return fallback
}

export function getEffectiveFieldDescription(field: any): string {
  return String(
    field?.settings?.general?.description ?? field?.description ?? '',
  ).trim()
}

export function getEffectiveFieldPlaceholder(
  field: any,
  fallback = '',
): string {
  return (
    String(
      field?.settings?.general?.placeholder ??
        field?.settings?.specific?.placeholder ??
        '',
    ).trim() || fallback
  )
}

export function getEffectiveFieldTooltip(field: any): string {
  return String(field?.settings?.general?.tooltip ?? '').trim()
}

export function isFieldLabelHidden(field: any): boolean {
  return Boolean(field?.settings?.general?.hideLabel)
}

export function isFieldRequired(field: any): boolean {
  return (
    field?.settings?.validation?.fieldRule === 'REQUIRED' ||
    Boolean(
      field?.isRequired ||
      field?.required ||
      field?.isMandatory ||
      field?.settings?.validation?.required,
    )
  )
}

export function isFieldHidden(field: any): boolean {
  return (
    Boolean(field?.settings?.general?.hidden) ||
    field?.settings?.general?.visibility === 'HIDDEN' ||
    field?.hidden === true
  )
}

export function isFieldReadOnly(field: any): boolean {
  return (
    resolveRuntimeFieldType(field) === 'CALCULATED' ||
    Boolean(field?.settings?.general?.readOnly) ||
    Boolean(field?.settings?.specific?.isReadOnly) ||
    Boolean(field?.settings?.validation?.readonlySettings?.isReadOnly) ||
    Boolean(field?.settings?.validation?.readonlySettings?.state) ||
    field?.settings?.general?.visibility === 'READ_ONLY' ||
    field?.settings?.general?.visibility === 'DISABLE' ||
    field?.readOnly === true ||
    field?.disabled === true
  )
}

/**
 * Checks whether a value is a V5 structured currency object `{ currency, value }`.
 */
export function isStructuredCurrencyValue(
  raw: unknown,
): raw is V5CurrencyValue {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false
  const obj = raw as Record<string, any>
  return 'currency' in obj || ('value' in obj && !('phoneNo' in obj))
}

/**
 * Extracts the currency code from a structured currency value or field configuration.
 */
export function extractCurrencyCode(raw: unknown, field?: any): string {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, any>
    if (typeof obj.currency === 'string' && obj.currency.trim()) {
      return obj.currency.trim().toUpperCase()
    }
  }
  const spec = field?.settings?.specific || {}
  const configured =
    spec.defaultCurrency ||
    spec.currency ||
    (Array.isArray(spec.specificCurrencies) ? spec.specificCurrencies[0] : '')
  if (typeof configured === 'string' && configured.trim()) {
    return configured.trim().toUpperCase()
  }
  return 'USD'
}

/**
 * Extracts the numeric/editable amount from a V5 `{ currency, value }` object or V6 primitive.
 */
export function extractCurrencyNumericValue(raw: unknown): number | string {
  if (raw === undefined || raw === null || raw === '') return ''
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : ''
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed) return ''
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed)
        return extractCurrencyNumericValue(parsed)
      } catch {
        // continue
      }
    }
    const stripped = trimmed.replace(/^[A-Z]{3}\s*/i, '').replace(/[$,\s]/g, '')
    const num = Number(stripped)
    return !Number.isNaN(num) && stripped !== '' ? num : trimmed
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const normalized = normalizeCurrencyEntryValue(raw)
    if (
      normalized.value === undefined ||
      normalized.value === null ||
      normalized.value === ''
    ) {
      return ''
    }
    if (typeof normalized.value === 'number') return normalized.value
    const stripped = String(normalized.value)
      .replace(/[$,\s]/g, '')
      .trim()
    if (!stripped) return ''
    const num = Number(stripped)
    return !Number.isNaN(num) ? num : normalized.value
  }
  return ''
}

/**
 * Updates a currency field value while preserving V5 `{ currency, value }` object structure
 * when the existing value is structured or when the field originated from V5 `CURRENCY`.
 */
export function updateCurrencyFieldValue(
  previousValue: unknown,
  nextAmount: number | string | null | undefined,
  field?: any,
  nextCurrency?: string,
): V5CurrencyValue | number | string {
  const cleanAmount =
    nextAmount === undefined || nextAmount === null ? '' : nextAmount
  const isExistingPrimitive =
    typeof previousValue === 'number' ||
    (typeof previousValue === 'string' &&
      previousValue.trim() !== '' &&
      !previousValue.trim().startsWith('{'))
  const shouldKeepStructured =
    isStructuredCurrencyValue(previousValue) ||
    Boolean(nextCurrency) ||
    (!isExistingPrimitive &&
      (field?.legacyV5Type === 'CURRENCY' || field?.type === 'CURRENCY'))

  if (shouldKeepStructured) {
    const baseObj =
      previousValue &&
      typeof previousValue === 'object' &&
      !Array.isArray(previousValue)
        ? (previousValue as Record<string, any>)
        : {}
    const currency =
      nextCurrency || extractCurrencyCode(previousValue, field) || 'USD'
    return {
      ...baseObj,
      currency,
      value: cleanAmount,
    }
  }

  return cleanAmount
}

/**
 * Checks whether a value is a V5 structured phone object `{ code, phoneNo, ... }`.
 */
export function isStructuredPhoneValue(raw: unknown): raw is V5PhoneValue {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false
  const obj = raw as Record<string, any>
  return 'phoneNo' in obj || 'code' in obj || 'alpha2Code' in obj
}

/**
 * Extracts the editable string representation for a phone input from a V5 `{ code, phoneNo }` object or V6 string.
 */
export function extractPhoneInputString(raw: unknown): string {
  if (raw === undefined || raw === null || raw === '') return ''
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed)
        return extractPhoneInputString(parsed)
      } catch {
        // continue
      }
    }
    return raw
  }
  if (typeof raw === 'number') return String(raw)
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const norm = normalizePhoneEntryValue(raw)
    const phone = String(norm.phoneNo || '').trim()
    const code = String(norm.code || '').trim()
    if (!phone) return ''
    if (code && !phone.startsWith(code) && !phone.startsWith('+')) {
      return `${code} ${phone}`
    }
    return phone
  }
  return ''
}

/**
 * Updates a phone field value while preserving V5 `{ code, phoneNo, flag, alpha2Code, verified }`
 * metadata when the existing value is a structured V5 phone object.
 */
export function updatePhoneFieldValue(
  previousValue: unknown,
  nextInput: string,
  field?: any,
): V5PhoneValue | string {
  const shouldKeepStructured =
    isStructuredPhoneValue(previousValue) ||
    Boolean(field?.settings?.specific?.preserveStructuredPhone)

  if (!shouldKeepStructured) {
    return nextInput
  }

  const prevNorm = normalizePhoneEntryValue(previousValue)
  const trimmed = String(nextInput ?? '').trim()
  const match = trimmed.match(/^(\+\d{1,4})[\s-]*(.*)$/)
  const nextCode = match ? match[1] : prevNorm.code || '+1'
  const nextPhoneNo = match ? match[2] : trimmed

  return {
    ...(previousValue && typeof previousValue === 'object'
      ? (previousValue as Record<string, any>)
      : {}),
    ...(prevNorm.alpha2Code !== undefined
      ? { alpha2Code: prevNorm.alpha2Code }
      : {}),
    code: nextCode,
    ...(prevNorm.flag !== undefined ? { flag: prevNorm.flag } : {}),
    phoneNo: nextPhoneNo,
    ...(prevNorm.verified !== undefined ? { verified: prevNorm.verified } : {}),
  }
}

export interface NormalizedMatrixRow {
  id: string
  key: string
  label: string
}

export interface NormalizedMatrixColumn {
  id: string
  key: string
  label: string
  options: string[]
  type:
    | 'RADIO'
    | 'CHECKBOX'
    | 'SHORT_TEXT'
    | 'NUMBER'
    | 'SINGLE_SELECT'
    | 'MULTI_SELECT'
}

/**
 * Normalizes V5 object-based (`[{ id, label, type, matrixTypeSettings }]`) and V6 string-based (`string[]`)
 * `matrixRows` and `matrixColumns` into a unified structure that never crashes React rendering.
 */
export function getNormalizedMatrixConfig(field: any): {
  columns: NormalizedMatrixColumn[]
  rows: NormalizedMatrixRow[]
} {
  const specific = field?.settings?.specific || {}

  const rawRows: any[] =
    (Array.isArray(specific.matrixRowObjects) &&
    specific.matrixRowObjects.length > 0
      ? specific.matrixRowObjects
      : Array.isArray(specific.matrixRows) && specific.matrixRows.length > 0
        ? specific.matrixRows
        : null) || ['Row 1', 'Row 2']

  const rawCols: any[] =
    (Array.isArray(specific.matrixColumnObjects) &&
    specific.matrixColumnObjects.length > 0
      ? specific.matrixColumnObjects
      : Array.isArray(specific.matrixColumns) &&
          specific.matrixColumns.length > 0
        ? specific.matrixColumns
        : null) || ['Column 1', 'Column 2']

  const rows: NormalizedMatrixRow[] = rawRows.map((item: any, idx: number) => {
    if (typeof item === 'string') {
      return { id: item, key: item, label: item }
    }
    if (item && typeof item === 'object') {
      const label = String(
        item.label ?? item.name ?? item.id ?? `Row ${idx + 1}`,
      )
      const id = String(item.id ?? label)
      return { id, key: id, label }
    }
    const fallback = `Row ${idx + 1}`
    return { id: fallback, key: fallback, label: fallback }
  })

  const columns: NormalizedMatrixColumn[] = rawCols.map(
    (item: any, idx: number) => {
      if (typeof item === 'string') {
        return {
          id: item,
          key: item,
          label: item,
          options: [],
          type: 'RADIO',
        }
      }
      if (item && typeof item === 'object') {
        const label = String(
          item.label ?? item.name ?? item.id ?? `Column ${idx + 1}`,
        )
        const id = String(item.id ?? label)
        const rawType = String(item.type || 'RADIO').toUpperCase()
        const type: NormalizedMatrixColumn['type'] = [
          'RADIO',
          'CHECKBOX',
          'SHORT_TEXT',
          'NUMBER',
          'SINGLE_SELECT',
          'MULTI_SELECT',
        ].includes(rawType)
          ? (rawType as NormalizedMatrixColumn['type'])
          : 'RADIO'
        const rawOpts =
          item.matrixTypeSettings?.customOptions ||
          item.matrixTypeSettings?.options ||
          item.options ||
          ''
        const options = Array.isArray(rawOpts)
          ? rawOpts.map((s: any) => String(s).trim()).filter(Boolean)
          : typeof rawOpts === 'string' && rawOpts.trim()
            ? rawOpts
                .split(/[\n,]/)
                .map((s: string) => s.trim())
                .filter(Boolean)
            : []
        return { id, key: id, label, options, type }
      }
      const fallback = `Column ${idx + 1}`
      return {
        id: fallback,
        key: fallback,
        label: fallback,
        options: [],
        type: 'RADIO',
      }
    },
  )

  return { columns, rows }
}

/**
 * Reads the value for a specific `(row, col)` cell in a `MATRIX` field,
 * supporting both V5 row/column IDs and V6 row/column labels, as well as
 * radio strings, checkbox arrays, and cell-keyed objects `{ [rowKey]: { [colKey]: val } }`.
 */
export function getMatrixCellValue(
  matrixValue: any,
  row: NormalizedMatrixRow,
  col: NormalizedMatrixColumn,
): any {
  if (!matrixValue || typeof matrixValue !== 'object') {
    return col.type === 'CHECKBOX' ? false : ''
  }

  let parsed = matrixValue
  if (typeof matrixValue === 'string') {
    try {
      parsed = JSON.parse(matrixValue)
    } catch {
      return col.type === 'CHECKBOX' ? false : ''
    }
  }

  const rowEntry = parsed[row.id] ?? parsed[row.label] ?? parsed[row.key]
  if (rowEntry === undefined || rowEntry === null) {
    return col.type === 'CHECKBOX' ? false : ''
  }

  if (col.type === 'RADIO') {
    if (typeof rowEntry === 'string') {
      return rowEntry === col.id || rowEntry === col.label ? true : rowEntry
    }
    if (typeof rowEntry === 'object' && !Array.isArray(rowEntry)) {
      const cellVal =
        rowEntry[col.id] ?? rowEntry[col.label] ?? rowEntry[col.key]
      if (cellVal !== undefined) {
        if (typeof cellVal === 'boolean') return cellVal
        if (col.options && col.options.length > 0) return cellVal
        return cellVal === col.id || cellVal === col.label
      }
    }
    return false
  }

  if (col.type === 'CHECKBOX') {
    if (Array.isArray(rowEntry)) {
      return rowEntry.includes(col.id) || rowEntry.includes(col.label)
        ? true
        : rowEntry
    }
    if (typeof rowEntry === 'object') {
      const cellVal =
        rowEntry[col.id] ?? rowEntry[col.label] ?? rowEntry[col.key]
      if (cellVal !== undefined) {
        if (Array.isArray(cellVal) || typeof cellVal === 'boolean') return cellVal
        return Boolean(cellVal)
      }
    }
    if (typeof rowEntry === 'string') {
      const parts = rowEntry.split(',').map((s) => s.trim())
      return parts.includes(col.id) || parts.includes(col.label)
    }
    return false
  }

  if (typeof rowEntry === 'object' && !Array.isArray(rowEntry)) {
    return (
      rowEntry[col.id] ??
      rowEntry[col.label] ??
      rowEntry[col.key] ??
      ''
    )
  }

  return String(rowEntry)
}

/**
 * Updates a `MATRIX` field value for `(row, col)` while preserving existing row keys.
 */
export function setMatrixCellValue(
  matrixValue: any,
  row: NormalizedMatrixRow,
  col: NormalizedMatrixColumn,
  cellVal: any,
  toggleMode = true,
): Record<string, any> {
  let base: Record<string, any> = {}
  if (
    matrixValue &&
    typeof matrixValue === 'object' &&
    !Array.isArray(matrixValue)
  ) {
    base = { ...matrixValue }
  } else if (typeof matrixValue === 'string' && matrixValue.trim().startsWith('{')) {
    try {
      base = JSON.parse(matrixValue)
    } catch {
      base = {}
    }
  }

  const rowKey =
    row.id in base ? row.id : row.label in base ? row.label : row.id
  const currentRowVal = base[rowKey]

  // If column has its own options or currentRowVal is already an object, store nested column values
  const isV5NestedRow =
    (col.options && col.options.length > 0) ||
    (currentRowVal &&
      typeof currentRowVal === 'object' &&
      !Array.isArray(currentRowVal)) ||
    typeof cellVal === 'string' &&
      cellVal !== col.id &&
      cellVal !== col.label

  if (isV5NestedRow) {
    const rowObj =
      currentRowVal &&
      typeof currentRowVal === 'object' &&
      !Array.isArray(currentRowVal)
        ? { ...currentRowVal }
        : {}
    const colKey = col.id || col.label
    rowObj[colKey] = cellVal
    return {
      ...base,
      [rowKey]: rowObj,
    }
  }

  if (col.type === 'RADIO') {
    const storedColVal =
      currentRowVal === col.label ? col.label : col.id || col.label
    return {
      ...base,
      [rowKey]: storedColVal,
    }
  }

  if (col.type === 'CHECKBOX') {
    const currentList: string[] = Array.isArray(currentRowVal)
      ? [...currentRowVal]
      : typeof currentRowVal === 'string' && currentRowVal
        ? currentRowVal
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : []
    const colToken = col.id || col.label
    const filtered = currentList.filter(
      (item) => item !== col.id && item !== col.label,
    )
    if (cellVal) {
      filtered.push(colToken)
    }
    return {
      ...base,
      [rowKey]: filtered,
    }
  }

  const rowObj =
    currentRowVal &&
    typeof currentRowVal === 'object' &&
    !Array.isArray(currentRowVal)
      ? { ...currentRowVal }
      : {}
  rowObj[col.id || col.label] = cellVal
  return {
    ...base,
    [rowKey]: rowObj,
  }
}

const SUMMABLE_COLUMN_TYPES = new Set([
  'NUMBER',
  'CURRENCY_AMOUNT',
  'CURRENCY',
  'COUNTER',
])

/**
 * Determines whether a table field should display a summary/totals row.
 * Supports both V6 table-level `showSummaryRow` and V5 column-level `showColumnTotal`.
 */
export function shouldShowTableSummaryRow(
  field: any,
  columns?: any[],
): boolean {
  if (Boolean(field?.settings?.specific?.showSummaryRow)) return true
  const cols =
    columns ||
    field?.settings?.specific?.tableColumns ||
    field?.settings?.specific?.columns ||
    []
  return (
    Array.isArray(cols) &&
    cols.some((col: any) => col?.settings?.specific?.showColumnTotal === true)
  )
}

/**
 * Computes column totals for a table field, honoring both V5 `col.settings.specific.showColumnTotal`
 * and V6 `field.settings.specific.showSummaryRow`, and extracting numeric values from V5 currency objects.
 */
export function computeTableColumnTotals(
  field: any,
  rows: Record<string, any>[],
  columns?: any[],
): Record<string, number> {
  const cols: any[] =
    columns ||
    field?.settings?.specific?.tableColumns ||
    field?.settings?.specific?.columns ||
    []
  if (!shouldShowTableSummaryRow(field, cols)) return {}

  const hasExplicitColumnTotalFlag = cols.some(
    (col: any) => col?.settings?.specific?.showColumnTotal === true,
  )
  const tableShowSummary = Boolean(field?.settings?.specific?.showSummaryRow)

  const totals: Record<string, number> = {}
  for (const col of cols) {
    if (!col?.id) continue
    const colType = resolveRuntimeFieldType(col)
    const showColTotal = col.settings?.specific?.showColumnTotal

    let includeColumn = false
    if (showColTotal === true) {
      includeColumn = true
    } else if (showColTotal === false) {
      includeColumn = false
    } else if (tableShowSummary && !hasExplicitColumnTotalFlag) {
      includeColumn = SUMMABLE_COLUMN_TYPES.has(colType)
    }

    if (!includeColumn) continue

    totals[col.id] = (rows || []).reduce((sum, row) => {
      if (!row || typeof row !== 'object') return sum
      const rawCell =
        row[col.id] ?? (col.name ? row[col.name] : undefined) ?? ''
      const extracted = extractCurrencyNumericValue(rawCell)
      const num = Number(extracted)
      return sum + (Number.isFinite(num) && extracted !== '' ? num : 0)
    }, 0)
  }

  return totals
}

/**
 * Evaluates row-level `CALCULATED` columns for a table field across all rows.
 */
export function evaluateTableRows(
  field: any,
  rows: Record<string, any>[],
): Record<string, any>[] {
  const cols: any[] =
    field?.settings?.specific?.tableColumns ||
    field?.settings?.specific?.columns ||
    []
  const calculatedCols = cols.filter(
    (c: any) => resolveRuntimeFieldType(c) === 'CALCULATED',
  )
  if (calculatedCols.length === 0 || !Array.isArray(rows)) return rows

  const colRefs = cols.map((c: any) => ({
    id: c.id,
    label: getEffectiveColumnLabel(c),
    name: c.name || c.label,
    settings: c.settings,
    type: resolveRuntimeFieldType(c),
  }))

  return rows.map((row) => {
    if (!row || typeof row !== 'object') return row
    const next = { ...row }
    for (let pass = 0; pass <= calculatedCols.length; pass += 1) {
      let changed = false
      for (const col of calculatedCols) {
        const tokens = col.settings?.specific?.formulaTokens
        if (!Array.isArray(tokens) || tokens.length === 0) continue
        const context = field?.id
          ? { ...next, [field.id]: rows }
          : { ...next, _rows: rows }
        const result = evaluateFormula(tokens, context, colRefs as any)
        const formatted = result === null ? '' : result
        if (next[col.id] !== formatted) {
          next[col.id] = formatted
          changed = true
        }
      }
      if (!changed) break
    }
    return next
  })
}

/**
 * Formats any runtime field value (including V5 structured currency/phone objects, matrices, tables, files)
 * into a clean human-readable display string so `[object Object]` is never rendered.
 */
export function formatRuntimeFieldDisplayValue(
  raw: unknown,
  field?: any,
): string {
  if (raw === undefined || raw === null || raw === '') return ''
  const runtimeType = field ? resolveRuntimeFieldType(field) : ''

  if (
    runtimeType === 'CURRENCY_AMOUNT' ||
    isStructuredCurrencyValue(raw)
  ) {
    if (typeof raw === 'object' && !Array.isArray(raw)) {
      const norm = normalizeCurrencyEntryValue(
        raw,
        extractCurrencyCode(raw, field),
      )
      if (norm.value === '' || norm.value === null || norm.value === undefined)
        return ''
      return `${norm.currency} ${norm.value}`.trim()
    }
    return String(raw)
  }

  if (runtimeType === 'PHONE_NUMBER' || isStructuredPhoneValue(raw)) {
    return extractPhoneInputString(raw)
  }

  if (Array.isArray(raw)) {
    if (raw.length === 0) return ''
    if (typeof raw[0] === 'object' && raw[0] !== null) {
      // A list of uploaded files reads better as its file names
      if (raw.every((item) => typeof item?.fileName === 'string')) {
        return raw.map((item) => item.fileName).join(', ')
      }
      return `${raw.length} ${raw.length === 1 ? 'item' : 'items'}`
    }
    return raw.map((item) => String(item)).join(', ')
  }

  if (typeof raw === 'object') {
    const obj = raw as Record<string, any>
    if (typeof obj.fileName === 'string' && obj.fileName) {
      return obj.fileName
    }
    if (typeof obj.name === 'string' && obj.name) {
      return obj.name
    }
    if (typeof obj.label === 'string' && obj.label) {
      return obj.label
    }
    // Matrix or key-value map
    const entries = Object.entries(obj).filter(
      ([k, v]) => !k.startsWith('_') && v !== undefined && v !== null && v !== '',
    )
    if (entries.length === 0) return ''

    if (runtimeType === 'MATRIX' || field?.type === 'MATRIX') {
      const cfg = getNormalizedMatrixConfig(field)
      const rowLabelMap = new Map(cfg.rows.map((r) => [r.id, r.label]))
      const colLabelMap = new Map(cfg.columns.map((c) => [c.id, c.label]))
      return entries
        .map(([k, v]) => {
          const rowLabel = rowLabelMap.get(k) || k
          if (v && typeof v === 'object' && !Array.isArray(v)) {
            const inner = Object.entries(v)
              .map(([ck, cv]) => {
                const cLabel = colLabelMap.get(ck) || ck
                return Array.isArray(cv)
                  ? `${cLabel}: ${cv.join(', ')}`
                  : `${cLabel}: ${String(cv)}`
              })
              .join(', ')
            return `${rowLabel}: [${inner}]`
          }
          return Array.isArray(v)
            ? `${rowLabel}: ${v.join(', ')}`
            : `${rowLabel}: ${String(v)}`
        })
        .join('; ')
    }

    return entries
      .map(([k, v]) => {
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          const inner = Object.entries(v)
            .map(([ck, cv]) =>
              Array.isArray(cv)
                ? `${ck}: ${cv.join(', ')}`
                : `${ck}: ${String(cv)}`,
            )
            .join(', ')
          return `${k}: [${inner}]`
        }
        return Array.isArray(v) ? `${k}: ${v.join(', ')}` : `${k}: ${String(v)}`
      })
      .join('; ')
  }

  return String(raw)
}

/**
 * Hydrates a form model for either a new form submission or an existing saved entry.
 *
 * - When `savedEntryValues` is provided (viewing/editing an existing entry), saved entry values
 *   ALWAYS take precedence and are NEVER overwritten by initial defaults.
 * - When `savedEntryValues` is omitted/null (`isNewEntry: true`), `initialDefaults` are used.
 * - Finally runs `applyCalculatedFields` so calculated fields and table calculated columns are up to date.
 */
export function hydrateFormModel(
  panels: any[],
  savedEntryValues?: Record<string, any> | null,
  options?: {
    formRules?: any[]
    initialDefaults?: Record<string, any>
    seedMissingDefaults?: boolean
  },
): Record<string, any> {
  const allFields = (panels || []).flatMap((p: any) => p?.fields || [])
  const fieldById = new Map<string, any>()
  for (const field of allFields) {
    if (field?.id) fieldById.set(String(field.id), field)
  }

  const isExistingEntry =
    savedEntryValues !== undefined && savedEntryValues !== null

  const baseModel: Record<string, any> = isExistingEntry
    ? options?.seedMissingDefaults && options?.initialDefaults
      ? { ...options.initialDefaults }
      : {}
    : { ...(options?.initialDefaults || {}) }

  if (isExistingEntry) {
    for (const [key, rawVal] of Object.entries(savedEntryValues)) {
      const field = fieldById.get(key)
      const runtimeType = field ? resolveRuntimeFieldType(field) : ''

      if (
        (runtimeType === 'TABLE' || runtimeType === 'DYNAMIC_TABLE') &&
        typeof rawVal === 'string' &&
        rawVal.trim().startsWith('[')
      ) {
        try {
          const parsed = JSON.parse(rawVal)
          if (Array.isArray(parsed)) {
            baseModel[key] = parsed
            continue
          }
        } catch {
          // keep original
        }
      }

      if (
        runtimeType === 'MATRIX' &&
        typeof rawVal === 'string' &&
        rawVal.trim().startsWith('{')
      ) {
        try {
          const parsed = JSON.parse(rawVal)
          if (parsed && typeof parsed === 'object') {
            baseModel[key] = parsed
            continue
          }
        } catch {
          // keep original
        }
      }

      baseModel[key] = rawVal
    }
  }

  return applyCalculatedFields(panels || [], baseModel, options?.formRules)
}

/**
 * Safely normalizes a raw `formJson` object (or string) from the backend using `normalizeV5FormJson`
 * so runtime consumers (`useWorkflowForm`, `FormEntriesPage`, etc.) automatically get V5-to-V6
 * field, table column, rule, and formula token normalization even if the form was never re-saved in V6.
 */
export function ensureNormalizedRuntimeFormJson(rawFormJson: any): {
  panels: any[]
  rules: any[]
  secondaryPanels: any[]
  settings: Record<string, any>
} {
  if (!rawFormJson) {
    return { panels: [], rules: [], secondaryPanels: [], settings: {} }
  }
  const normalized = normalizeV5FormJson(rawFormJson)
  return {
    panels: normalized.panels || [],
    rules: normalized.rules || [],
    secondaryPanels: normalized.secondaryPanels || [],
    settings: normalized.rawSettings || {},
  }
}
