import {
  buildSyntheticTableField,
  isLineItemHeading,
} from './AgentEditableTables'
import {
  findFormFieldForResultKey,
  findResultKeyForFormField,
  getFieldHeading,
  getFieldId,
  normalizeQualifierKey,
  type QualifierScalarEntry,
  type QualifierTableEntry,
} from './qualifierResultUtils'

export type QuoteScalarEntry = QualifierScalarEntry
export type QuoteTableEntry = QualifierTableEntry

export type QuoteTotalEntry = {
  field: any | null
  kind: QuoteTotalKind
  label: string
  resultKey: string
  value: number
}

export type QuoteTotalKind = 'subtotal' | 'freight' | 'tax' | 'total' | 'other'

export type QuoteViewModel = {
  grandTotal: QuoteTotalEntry | null
  lineItemTable: QuoteTableEntry | null
  listEntries: QuoteScalarEntry[]
  longTextEntries: QuoteScalarEntry[]
  metaEntries: QuoteScalarEntry[]
  otherTables: QuoteTableEntry[]
  titleEntry: QuoteScalarEntry | null
  totals: QuoteTotalEntry[]
}

const singularizeKey = (value: string) =>
  normalizeQualifierKey(value)
    .replace(/\s+s\b/g, '')
    .trim()

const isTableFieldType = (field: any) => {
  const type = String(field?.type || '')
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
  return type === 'TABLE' || type === 'DYNAMIC_TABLE' || type.includes('TABLE')
}

const isObjectRowArray = (value: unknown): value is Record<string, any>[] =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every((row) => row && typeof row === 'object' && !Array.isArray(row))

const isStringList = (value: unknown): value is string[] =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every((item) => typeof item === 'string')

const isLongTextValue = (field: any | null, value: unknown) => {
  const type = String(field?.type || '').toUpperCase()
  if (type === 'LONG_TEXT') return true
  if (typeof value === 'string' && value.includes('\n')) return true
  return typeof value === 'string' && value.length > 160
}

export const classifyQuoteTotalKey = (key: string): QuoteTotalKind | null => {
  const normalized = normalizeQualifierKey(key)
  const singular = singularizeKey(key)
  if (normalized === 'subtotal') return 'subtotal'
  if (normalized === 'total' || singular === 'grand total') return 'total'
  if (normalized.includes('freight')) return 'freight'
  if (
    normalized === 'hst' ||
    normalized === 'gst' ||
    normalized === 'vat' ||
    normalized.includes('tax')
  ) {
    return 'tax'
  }
  return null
}

const isLineItemTableKey = (key: string, field?: any) => {
  if (field && isLineItemHeading(getFieldHeading(field))) return true
  return isLineItemHeading(key)
}

const toNumber = (value: unknown) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

const displayTotalLabel = (label: string) =>
  label.trim().toLowerCase() === 'hst' ? 'HST' : label

const TOTAL_SORT: Record<QuoteTotalKind, number> = {
  freight: 1,
  other: 4,
  subtotal: 0,
  tax: 2,
  total: 3,
}

const findResultKeyByKind = (
  result: Record<string, any>,
  kind: QuoteTotalKind,
) =>
  Object.keys(result).find((key) => classifyQuoteTotalKey(key) === kind) || null

/** Infer tax rate from quote_result total keys (defaults to 13%). */
export const getQuoteTaxRate = (result: Record<string, any>) => {
  const subtotalKey = findResultKeyByKind(result, 'subtotal')
  const freightKey = findResultKeyByKind(result, 'freight')
  const taxKey = findResultKeyByKind(result, 'tax')
  const subtotal = subtotalKey ? toNumber(result[subtotalKey]) : 0
  const freight = freightKey ? toNumber(result[freightKey]) : 0
  const tax = taxKey ? toNumber(result[taxKey]) : 0
  const base = subtotal + freight
  if (base > 0 && tax > 0) return tax / base
  return 0.13
}

export const buildQuoteViewModel = (
  result: Record<string, any>,
  formFields: any[],
  tableFields: any[],
): QuoteViewModel => {
  const scalarFormFields = formFields.filter(
    (field) => !isTableFieldType(field),
  )
  const usedKeys = new Set<string>()
  const scalars: QuoteScalarEntry[] = []
  const tables: QuoteTableEntry[] = []
  const totals: QuoteTotalEntry[] = []

  const pushScalar = (resultKey: string, value: unknown, field: any | null) => {
    if (value === null || value === undefined) return
    if (typeof value === 'string' && !value.trim()) return
    scalars.push({
      field,
      isLongText: isLongTextValue(field, value),
      isStringList: isStringList(value),
      label: field ? getFieldHeading(field) : resultKey,
      resultKey,
      value,
    })
  }

  const pushTotal = (resultKey: string, value: unknown, field: any | null) => {
    const kind = classifyQuoteTotalKey(resultKey)
    if (!kind) return
    usedKeys.add(resultKey)
    totals.push({
      field,
      kind,
      label: displayTotalLabel(field ? getFieldHeading(field) : resultKey),
      resultKey,
      value: toNumber(value),
    })
  }

  for (const field of scalarFormFields) {
    const resultKey = findResultKeyForFormField(result, field)
    if (!resultKey || usedKeys.has(resultKey)) continue
    const totalKind = classifyQuoteTotalKey(resultKey)
    if (totalKind) {
      pushTotal(resultKey, result[resultKey], field)
      continue
    }
    usedKeys.add(resultKey)
    pushScalar(resultKey, result[resultKey], field)
  }

  for (const field of tableFields) {
    const resultKey = findResultKeyForFormField(result, field)
    const rows =
      resultKey && isObjectRowArray(result[resultKey]) ? result[resultKey] : []
    if (resultKey) usedKeys.add(resultKey)
    if (rows.length > 0 || resultKey) {
      tables.push({
        field,
        label: getFieldHeading(field),
        resultKey: resultKey || getFieldId(field),
        rows,
      })
    }
  }

  for (const [key, value] of Object.entries(result)) {
    if (usedKeys.has(key)) continue

    const totalKind = classifyQuoteTotalKey(key)
    if (
      totalKind &&
      (typeof value === 'number' ||
        (typeof value === 'string' && value.trim() !== ''))
    ) {
      pushTotal(key, value, findFormFieldForResultKey(scalarFormFields, key))
      continue
    }

    if (isObjectRowArray(value)) {
      tables.push({
        field: buildSyntheticTableField(key, value),
        label: key,
        resultKey: key,
        rows: value,
      })
      usedKeys.add(key)
      continue
    }

    if (isStringList(value)) {
      const field = findFormFieldForResultKey(scalarFormFields, key)
      usedKeys.add(key)
      pushScalar(key, value, field)
      continue
    }

    if (value !== null && value !== undefined && value !== '') {
      const field = findFormFieldForResultKey(scalarFormFields, key)
      usedKeys.add(key)
      pushScalar(key, value, field)
    }
  }

  const lineItemTable =
    tables.find((table) => isLineItemTableKey(table.resultKey, table.field)) ||
    null
  const otherTables = tables.filter((table) => table !== lineItemTable)

  const shortScalars = scalars.filter(
    (entry) => !entry.isLongText && !entry.isStringList,
  )

  totals.sort((a, b) => TOTAL_SORT[a.kind] - TOTAL_SORT[b.kind])

  return {
    grandTotal: totals.find((entry) => entry.kind === 'total') || null,
    lineItemTable,
    listEntries: scalars.filter((entry) => entry.isStringList),
    longTextEntries: scalars.filter(
      (entry) => entry.isLongText && !entry.isStringList,
    ),
    metaEntries: shortScalars.slice(1),
    otherTables,
    titleEntry: shortScalars[0] || null,
    totals,
  }
}

/** Card/summary display for quote agent blocks (no hardcoded result keys). */
export const summarizeQuoteResult = (
  result: Record<string, any> | null | undefined,
  formFields: any[] = [],
  tableFields: any[] = [],
) => {
  if (!result || typeof result !== 'object') {
    return { title: '', total: null as number | null }
  }
  const vm = buildQuoteViewModel(result, formFields, tableFields)
  const titleValue = vm.titleEntry?.value
  const title =
    titleValue !== null && titleValue !== undefined && String(titleValue).trim()
      ? String(titleValue)
      : 'Completed'
  return {
    title,
    total: vm.grandTotal?.value ?? null,
  }
}
