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
import {
  resolveLineItemTableVariant,
  resolveQuoteFieldVariant,
  type QuoteVariantId,
} from './quoteVariants'

export type QuoteScalarEntry = QualifierScalarEntry
export type QuoteTableEntry = QualifierTableEntry

export type QuoteTotalEntry = {
  field: any | null
  kind: QuoteTotalKind
  label: string
  resultKey: string
  value: number
  /** Main / Alt / Opt — from labels like ALT Freight, OPT HST. */
  variant?: QuoteVariantId
}

export type QuoteTotalKind =
  | 'subtotal'
  | 'discount'
  | 'freight'
  | 'tax'
  | 'total'
  | 'other'

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
  // Strip Main/Alt/Opt / quote_2 / quote_3 prefixes so totals still classify.
  const stripVariantPrefix = (value: string) =>
    value
      .replace(/^(alt|opt|optional|alternative|main|base|primary)\s+/, '')
      .replace(/^quote\s*[23]\s+/, '')
      .trim()
  const stripped = stripVariantPrefix(normalized)
  const strippedSingular = stripVariantPrefix(singular)
  if (stripped === 'subtotal' || normalized.endsWith('subtotal')) return 'subtotal'
  if (
    stripped === 'discount' ||
    stripped === 'disc' ||
    normalized.endsWith('discount')
  ) {
    return 'discount'
  }
  if (
    stripped === 'total' ||
    strippedSingular === 'grand total' ||
    (normalized.endsWith('total') && !normalized.includes('subtotal'))
  ) {
    return 'total'
  }
  if (stripped.includes('freight') || normalized.includes('freight')) {
    return 'freight'
  }
  if (
    stripped === 'hst' ||
    stripped === 'hts' ||
    normalized.includes('hst') ||
    normalized.includes('hts') ||
    stripped === 'gst' ||
    stripped === 'vat' ||
    stripped.includes('tax')
  ) {
    return 'tax'
  }
  return null
}

/** Primary Line Item only — ALT / OPT Line Item are separate quote variants. */
const isPrimaryLineItemTableKey = (key: string, field?: any) => {
  const heading = field ? getFieldHeading(field) : key
  if (resolveLineItemTableVariant(heading) === 'main') return true
  if (resolveLineItemTableVariant(key) === 'main') return true
  // Bare "Line Item" without alt/opt tokens
  if (field && isLineItemHeading(getFieldHeading(field))) {
    return resolveLineItemTableVariant(getFieldHeading(field)) === 'main'
  }
  return isLineItemHeading(key) && resolveLineItemTableVariant(key) === 'main'
}

const toNumber = (value: unknown) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

const displayTotalLabel = (label: string) =>
  label.trim().toLowerCase() === 'hst' ? 'HST' : label

const TOTAL_SORT: Record<QuoteTotalKind, number> = {
  discount: 1,
  freight: 2,
  other: 5,
  subtotal: 0,
  tax: 3,
  total: 4,
}

/** Clean tab breakdown labels: "ALT Freight" → "Freight". */
export const displayQuoteTotalLabel = (
  kind: QuoteTotalKind,
  fallback = '',
) => {
  if (kind === 'subtotal') return 'Gross'
  if (kind === 'discount') return 'Discount'
  if (kind === 'freight') return 'Freight'
  if (kind === 'tax') return 'HST'
  if (kind === 'total') return 'Total'
  return fallback
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
    const label = field ? getFieldHeading(field) : resultKey
    const kind =
      classifyQuoteTotalKey(resultKey) || classifyQuoteTotalKey(label)
    if (!kind) return
    usedKeys.add(resultKey)
    totals.push({
      field,
      kind,
      label: displayTotalLabel(label),
      resultKey,
      value: toNumber(value),
      variant: resolveQuoteFieldVariant(label || resultKey),
    })
  }

  for (const field of scalarFormFields) {
    const heading = getFieldHeading(field)
    const matchedKey = findResultKeyForFormField(result, field)
    const resultKey = matchedKey || getFieldId(field)
    if (usedKeys.has(resultKey)) continue
    const totalKind =
      classifyQuoteTotalKey(resultKey) || classifyQuoteTotalKey(heading)
    if (totalKind) {
      const value = matchedKey
        ? result[matchedKey]
        : (result[heading] ?? result[getFieldId(field)])
      pushTotal(resultKey, value ?? 0, field)
      continue
    }
    if (!matchedKey) continue
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
    tables.find((table) =>
      isPrimaryLineItemTableKey(table.resultKey, table.field),
    ) || null
  const otherTables = tables.filter((table) => table !== lineItemTable)

  const shortScalars = scalars.filter(
    (entry) => !entry.isLongText && !entry.isStringList,
  )

  totals.sort((a, b) => TOTAL_SORT[a.kind] - TOTAL_SORT[b.kind])

  // Prefer form-mapped totals; keep one entry per kind × variant so Main /
  // ALT / OPT Freight (etc.) all survive for tab switching.
  const preferredTotals = [...totals].sort((a, b) => {
    const fieldRank = Number(Boolean(b.field)) - Number(Boolean(a.field))
    if (fieldRank !== 0) return fieldRank
    return TOTAL_SORT[a.kind] - TOTAL_SORT[b.kind]
  })
  const seenKindVariant = new Set<string>()
  const uniqueTotals: QuoteTotalEntry[] = []
  for (const entry of preferredTotals) {
    const variant = entry.variant || 'main'
    const dedupeKey = `${variant}:${entry.kind}`
    if (entry.kind !== 'other' && seenKindVariant.has(dedupeKey)) continue
    seenKindVariant.add(dedupeKey)
    uniqueTotals.push({ ...entry, variant })
  }
  uniqueTotals.sort((a, b) => TOTAL_SORT[a.kind] - TOTAL_SORT[b.kind])

  // When two totals share a display label, surface the result key so the UI
  // can tell form controls apart.
  const labelCounts = uniqueTotals.reduce<Record<string, number>>((acc, entry) => {
    const key = entry.label.trim().toLowerCase()
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
  const labeledTotals = uniqueTotals.map((entry) => {
    const key = entry.label.trim().toLowerCase()
    if ((labelCounts[key] || 0) <= 1) return entry
    return {
      ...entry,
      label: entry.resultKey || entry.label,
    }
  })

  return {
    grandTotal:
      labeledTotals.find(
        (entry) => entry.kind === 'total' && (entry.variant || 'main') === 'main',
      ) ||
      labeledTotals.find((entry) => entry.kind === 'total') ||
      null,
    lineItemTable,
    listEntries: scalars.filter((entry) => entry.isStringList),
    longTextEntries: scalars.filter(
      (entry) => entry.isLongText && !entry.isStringList,
    ),
    metaEntries: shortScalars.slice(1),
    otherTables,
    titleEntry: shortScalars[0] || null,
    totals: labeledTotals,
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
  const candidates = [vm.titleEntry, ...vm.metaEntries].filter(Boolean)
  const orderEntry = candidates.find((entry) => {
    const label = normalizeQualifierKey(String(entry?.label || ''))
    const key = normalizeQualifierKey(String(entry?.resultKey || ''))
    return label === 'order number' || key === 'order number'
  })
  const orderValue = orderEntry?.value
  const title =
    orderValue !== null &&
    orderValue !== undefined &&
    String(orderValue).trim()
      ? String(orderValue)
      : '-'
  return {
    title,
    total: vm.grandTotal?.value ?? null,
  }
}
