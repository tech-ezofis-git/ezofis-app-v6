/**
 * "Has the quote changed since its PDF was generated?" — compared on the
 * quote's business values, not on raw form state, so an edit that is undone
 * (Qty 2 → 5 → 2) reads as unchanged and UI-only writes (accept flags, row
 * alias keys, number-vs-string) never count as a change.
 */

export type QuoteSnapshot = {
  /** Every value the generated quote depends on, normalized. */
  all: string
  byVariant: Record<string, string>
}

type QuoteVariantLike = {
  discount?: number | null
  freight?: number | null
  id: string
  rows?: Record<string, unknown>[]
  total?: number | null
}

const NUMERIC = /^-?(?:\d+\.?\d*|\.\d+)$/

/** 2, 2.0, "2" and "$2.00" all normalize to 2; blanks to ''. */
export const normalizeQuoteValue = (value: unknown): unknown => {
  if (value == null) return ''
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.round(value * 100) / 100 : ''
  }
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const trimmed = value.trim()
    const numeric = trimmed.replace(/[$,%\s]/g, '')
    if (numeric && NUMERIC.test(numeric)) {
      return Math.round(Number(numeric) * 100) / 100
    }
    return trimmed
  }
  if (Array.isArray(value)) return value.map(normalizeQuoteValue)
  if (typeof value === 'object') {
    // `_`-prefixed keys are UI state (_approved, _hideNote, ids …).
    return Object.keys(value as Record<string, unknown>)
      .filter((key) => !key.startsWith('_'))
      .sort()
      .map((key) => [
        key,
        normalizeQuoteValue((value as Record<string, unknown>)[key]),
      ])
  }
  return String(value)
}

/** The line-item values that end up on the quote PDF, in row order. */
const quoteRowValues = (row: Record<string, unknown>) =>
  [
    row?.Product,
    row?.Description,
    row?.Qty,
    row?.Price,
    row?.Discount,
    // Percent vs amount changes the subtotal, so it is part of the quote.
    String(row?._discountMode || 'percent').toLowerCase(),
  ].map(normalizeQuoteValue)

export const buildQuoteSnapshot = (
  formModel: Record<string, unknown>,
  variants: QuoteVariantLike[],
  /** Form keys holding line-item tables; compared via `variants` instead. */
  lineItemKeys: Set<string>,
): QuoteSnapshot => {
  const byVariant: Record<string, string> = {}
  variants.forEach((variant) => {
    byVariant[variant.id] = JSON.stringify([
      (Array.isArray(variant.rows) ? variant.rows : []).map(quoteRowValues),
      normalizeQuoteValue(variant.total ?? 0),
      normalizeQuoteValue(variant.discount ?? 0),
      normalizeQuoteValue(variant.freight ?? 0),
    ])
  })
  const fields = Object.keys(formModel || {})
    .filter((key) => !key.startsWith('_') && !lineItemKeys.has(key))
    .sort()
    .map((key) => [key, normalizeQuoteValue(formModel[key])])
  return { all: JSON.stringify([fields, byVariant]), byVariant }
}

// The baseline is kept per request (and per generated document) so a reload
// still compares against the last generated quote, not the reloaded edits.
const BASELINE_STORAGE_PREFIX = 'ezofis:quote-baseline:v1:'

const hashString = (value: string) => {
  let hash = 5381
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash + value.charCodeAt(index)) | 0
  }
  return (hash >>> 0).toString(36)
}

export const quoteBaselineStorageKey = (
  instanceId: unknown,
  documentGenerateResponse: unknown,
) => {
  if (!instanceId) return null
  let generated = ''
  try {
    generated = JSON.stringify(documentGenerateResponse ?? '')
  } catch {
    generated = ''
  }
  return `${BASELINE_STORAGE_PREFIX}${String(instanceId)}:${hashString(generated)}`
}

export const readQuoteBaseline = (key: string | null): QuoteSnapshot | null => {
  if (!key) return null
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return typeof parsed?.all === 'string' && parsed?.byVariant
      ? (parsed as QuoteSnapshot)
      : null
  } catch {
    return null
  }
}

export const writeQuoteBaseline = (
  key: string | null,
  snapshot: QuoteSnapshot,
) => {
  if (!key) return
  try {
    window.localStorage.setItem(key, JSON.stringify(snapshot))
  } catch {
    // Storage unavailable: the in-memory baseline still works this session.
  }
}
