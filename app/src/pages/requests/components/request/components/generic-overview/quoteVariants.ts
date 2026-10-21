import {
  buildQuoteTotals,
  normalizeLineItemRows,
  toMoney,
} from './QuoteLineItemsTable'

export type QuoteVariantId = 'main' | 'alt' | 'opt'

export type QuoteVariant = {
  columns?: any[]
  description: string
  discount?: number
  fieldId?: string
  freight?: number
  id: QuoteVariantId
  itemCount: number
  label: string
  resultKey?: string
  rows: Record<string, any>[]
  shortLabel: string
  total: number
}

export type QuoteVariantTableSource = {
  columns?: any[]
  discount?: number
  fieldId?: string
  freight?: number
  id: QuoteVariantId
  resultKey?: string
  rows?: Record<string, any>[]
  total?: number
}

const normalizeKey = (value: string) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')

const compactKey = (value: string) => normalizeKey(value).replace(/\s+/g, '')

/** "quote_2 Line Traceability" / "ALT Freight" → "Line Traceability" / "Freight". */
export const stripQuoteVariantLabel = (label: string) =>
  String(label || '')
    .replace(
      /^\s*(quote[_\s-]*[123]|alt|opt|optional|alternative)\b[\s:_-]*/i,
      '',
    )
    .trim()

export const QUOTE_VARIANT_META: Record<
  QuoteVariantId,
  { description: string; label: string; shortLabel: string }
> = {
  alt: {
    description:
      'Recommended scope built from ALT Line Item with ALT Subtotal / Discount / Freight / HST / Total.',
    label: 'Quote 2 — Recommended',
    shortLabel: 'Quote 2 — Recommended',
  },
  main: {
    description:
      'Base scope as estimated from the RFQ — Line Item, Subtotal, Discount, Freight, HST, Total.',
    label: 'Quote 1 — Spec',
    shortLabel: 'Quote 1 — Spec',
  },
  opt: {
    description:
      'Alternate option from OPT Line Item with OPT Subtotal / Discount / Freight / HST / Total.',
    label: 'Quote 3 — Alternate',
    shortLabel: 'Quote 3 — Alternate',
  },
}

const VARIANT_ORDER: QuoteVariantId[] = ['main', 'alt', 'opt']

/** API quoteType for document preview — matches Quote 1 / 2 / 3 tabs. */
export const previewQuoteTypeForVariant = (
  variantId: QuoteVariantId | 'compare' | string | null | undefined,
): 'quote_1' | 'quote_2' | 'quote_3' | null => {
  if (variantId === 'alt') return 'quote_2'
  if (variantId === 'opt') return 'quote_3'
  if (variantId === 'main') return 'quote_1'
  return null
}

const classifyVariantToken = (raw: string): QuoteVariantId | null => {
  const compact = compactKey(raw)
  if (!compact) return null
  if (
    compact.includes('optional') ||
    compact === 'opt' ||
    compact.startsWith('optquote') ||
    compact.includes('optline') ||
    compact.includes('optionquote')
  ) {
    return 'opt'
  }
  if (
    compact.includes('alternative') ||
    compact === 'alt' ||
    compact.startsWith('altquote') ||
    compact.includes('altline')
  ) {
    return 'alt'
  }
  if (
    compact.includes('main') ||
    compact.includes('base') ||
    compact.includes('primary') ||
    compact === 'standard'
  ) {
    return 'main'
  }
  return null
}

/** Detect Main / Alt / Opt from a row's quote-type style fields. */
export const resolveRowQuoteVariant = (
  row: Record<string, any>,
): QuoteVariantId => {
  const candidates = [
    row?.QuoteType,
    row?.['Quote Type'],
    row?.quote_type,
    row?.quoteType,
    row?.Type,
    row?.['Line Type'],
    row?.lineType,
    row?._quoteType,
    row?.Category,
  ]
  for (const value of candidates) {
    const classified = classifyVariantToken(String(value ?? ''))
    if (classified) return classified
  }
  return 'main'
}

/** Detect quote_2 / quote_3 style labels used by the RFQ form. */
const classifyQuoteNumberToken = (compact: string): QuoteVariantId | null => {
  if (!compact) return null
  // quote_3 / quote3 / quote 3 …
  if (
    compact.includes('quote3') ||
    compact.startsWith('q3') ||
    /(^|[^a-z])quote3([^0-9]|$)/.test(compact)
  ) {
    return 'opt'
  }
  // quote_2 / quote2 / quote 2 …
  if (
    compact.includes('quote2') ||
    compact.startsWith('q2') ||
    /(^|[^a-z])quote2([^0-9]|$)/.test(compact)
  ) {
    return 'alt'
  }
  return null
}

export const classifyTableKey = (key: string): QuoteVariantId | null => {
  const compact = compactKey(key)
  if (!compact) return null
  const byNumber = classifyQuoteNumberToken(compact)
  if (byNumber) return byNumber
  if (
    compact.includes('optline') ||
    compact.includes('optionalline') ||
    compact.includes('optquote') ||
    compact.includes('optionalquote') ||
    (compact.includes('opt') && compact.includes('line')) ||
    (compact.includes('opt') && compact.includes('quote'))
  ) {
    return 'opt'
  }
  if (
    compact.includes('altline') ||
    compact.includes('alternativeline') ||
    compact.includes('altquote') ||
    (compact.includes('alt') && compact.includes('line')) ||
    (compact.includes('alt') && compact.includes('quote'))
  ) {
    return 'alt'
  }
  if (
    compact.includes('mainline') ||
    compact.includes('mainquote') ||
    (compact.includes('main') && compact.includes('line')) ||
    (compact.includes('main') && compact.includes('quote'))
  ) {
    return 'main'
  }
  return null
}

/** Map Line Item / quote_2 Line Item / quote_3 Line Item headings to a quote variant. */
export const resolveLineItemTableVariant = (
  key: string,
): QuoteVariantId | null => {
  const compact = compactKey(key)
  if (!compact) return null
  // quote_2 Line Traceability and Compare also contain a quote number.
  // Only line-item tables belong on the quote cards.
  if (!compact.includes('lineitem') && compact !== 'lineitems') return null
  const classified = classifyTableKey(key)
  if (classified) return classified
  return 'main'
}

/** Main / Alt / Opt from freight, subtotal, HST, remarks, discount field labels. */
export const resolveQuoteFieldVariant = (key: string): QuoteVariantId => {
  const compact = compactKey(key)
  if (!compact) return 'main'
  const byNumber = classifyQuoteNumberToken(compact)
  if (byNumber) return byNumber
  // Prefer prefix checks so labels like "Contact" are not misclassified as Alt.
  if (compact.startsWith('opt') || compact.startsWith('optional')) return 'opt'
  if (compact.startsWith('alt') || compact.startsWith('alternative')) return 'alt'
  return 'main'
}

export const isQuoteVariantTableKey = (key: string) =>
  Boolean(classifyTableKey(key) || resolveLineItemTableVariant(key))


const isObjectRowArray = (value: unknown): value is Record<string, any>[] =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every((row) => row && typeof row === 'object' && !Array.isArray(row))

/** Read Discount / Freight / Total scalars for a variant from quote_result. */
export const resolveVariantScalarFromResult = (
  result: Record<string, any> | null | undefined,
  variantId: QuoteVariantId,
  kind: 'discount' | 'freight' | 'subtotal' | 'tax' | 'total',
): number | null => {
  if (!result || typeof result !== 'object') return null
  const kindMatchers: Record<string, (compact: string) => boolean> = {
    discount: (c) => c === 'discount' || c.endsWith('discount'),
    freight: (c) => c.includes('freight'),
    subtotal: (c) => c === 'subtotal' || c.endsWith('subtotal'),
    tax: (c) =>
      c === 'hst' ||
      c.endsWith('hst') ||
      c.includes('tax') ||
      c.endsWith('gst'),
    total: (c) =>
      (c === 'total' || c.endsWith('total')) && !c.includes('subtotal'),
  }
  const matchesKind = kindMatchers[kind]
  for (const [key, value] of Object.entries(result)) {
    if (resolveQuoteFieldVariant(key) !== variantId) continue
    if (!matchesKind(compactKey(key))) continue
    const num = Number(value)
    if (Number.isFinite(num)) return num
  }
  return null
}

const buildVariant = (
  id: QuoteVariantId,
  rows: Record<string, any>[],
  freight: number,
  taxRate: number,
  columns: any[],
  extras?: {
    discount?: number
    fieldId?: string
    resultKey?: string
    total?: number
  },
): QuoteVariant => {
  const normalized = normalizeLineItemRows(rows, columns)
  const meta = QUOTE_VARIANT_META[id]
  const quoteDiscount = Number(extras?.discount || 0) || 0
  const totals = buildQuoteTotals(
    normalized,
    freight,
    taxRate,
    columns,
    quoteDiscount,
  )
  const hasRows = normalized.length > 0
  const apiTotal =
    extras?.total != null && Number.isFinite(Number(extras.total))
      ? Number(extras.total)
      : null
  // Prefer a real API/form total; ignore 0 so copied rows still show recomputed $.
  const total = hasRows
    ? apiTotal != null && apiTotal > 0
      ? apiTotal
      : totals.total
    : 0
  return {
    columns,
    description: meta.description,
    // Prefer $ saved on line discounts over the quote-level Discount field.
    discount: hasRows ? totals.discount : 0,
    fieldId: extras?.fieldId,
    freight: hasRows ? freight : 0,
    id,
    itemCount: normalized.length,
    label: meta.label,
    resultKey: extras?.resultKey,
    rows: normalized,
    shortLabel: meta.shortLabel,
    // Never show another quote's total on an empty tab.
    total,
  }
}

/**
 * Build Main / Alt / Opt quote variants from quote_result + line items.
 * Prefers explicit quote tables / nested quotes, then row-level Quote Type.
 * When `formVariantTables` is provided (Line Item / ALT Line Item / OPT Line Item),
 * those field ids + columns are attached and empty Alt/Opt tabs are still shown.
 */
export const extractQuoteVariants = (args: {
  columns?: any[]
  formVariantTables?: QuoteVariantTableSource[]
  freight?: number
  lineItems: Record<string, any>[]
  result?: Record<string, any> | null
  taxRate?: number
}): QuoteVariant[] => {
  const columns = args.columns || []
  const defaultFreight = Number(args.freight || 0)
  const taxRate = Number.isFinite(args.taxRate) ? Number(args.taxRate) : 0.13
  const result = args.result && typeof args.result === 'object' ? args.result : {}
  const lineItems = Array.isArray(args.lineItems) ? args.lineItems : []
  const formTables = Array.isArray(args.formVariantTables)
    ? args.formVariantTables
    : []

  const formById = new Map<QuoteVariantId, QuoteVariantTableSource>()
  formTables.forEach((entry) => {
    if (entry?.id) formById.set(entry.id, entry)
  })

  const columnsFor = (id: QuoteVariantId) =>
    formById.get(id)?.columns?.length
      ? (formById.get(id)!.columns as any[])
      : columns

  const freightFor = (id: QuoteVariantId) => {
    const fromForm = formById.get(id)?.freight
    if (Number.isFinite(Number(fromForm))) return Number(fromForm)
    const fromResult = resolveVariantScalarFromResult(result, id, 'freight')
    if (fromResult != null) return fromResult
    return id === 'main' ? defaultFreight : 0
  }

  const discountFor = (id: QuoteVariantId) => {
    const fromForm = formById.get(id)?.discount
    if (Number.isFinite(Number(fromForm))) return Number(fromForm)
    const fromResult = resolveVariantScalarFromResult(result, id, 'discount')
    return fromResult != null ? fromResult : 0
  }

  const totalFor = (id: QuoteVariantId) => {
    const fromForm = formById.get(id)?.total
    if (Number.isFinite(Number(fromForm))) return Number(fromForm)
    return resolveVariantScalarFromResult(result, id, 'total') ?? undefined
  }

  const extrasFor = (id: QuoteVariantId, resultKey?: string) => ({
    discount: discountFor(id),
    fieldId: formById.get(id)?.fieldId,
    resultKey:
      resultKey || formById.get(id)?.resultKey || formById.get(id)?.fieldId,
    total: totalFor(id),
  })

  const byId = new Map<QuoteVariantId, QuoteVariant>()

  // 1) Nested quotes: [{ type, items }] or { main: [], alt: [], opt: [] }
  const nestedQuotes = result.quotes || result.Quotes || result.quote_variants
  if (Array.isArray(nestedQuotes)) {
    nestedQuotes.forEach((entry: any, index: number) => {
      if (!entry || typeof entry !== 'object') return
      const id =
        classifyVariantToken(String(entry.type || entry.quoteType || entry.name || '')) ||
        (VARIANT_ORDER[index] as QuoteVariantId | undefined) ||
        'main'
      const rows = isObjectRowArray(entry.items)
        ? entry.items
        : isObjectRowArray(entry.rows)
          ? entry.rows
          : isObjectRowArray(entry.line_items)
            ? entry.line_items
            : []
      if (!rows.length && byId.has(id)) return
      byId.set(
        id,
        buildVariant(
          id,
          rows,
          freightFor(id),
          taxRate,
          columnsFor(id),
          extrasFor(id),
        ),
      )
    })
  } else if (nestedQuotes && typeof nestedQuotes === 'object') {
    ;(['main', 'alt', 'opt'] as const).forEach((id) => {
      const value =
        nestedQuotes[id] ||
        nestedQuotes[id.toUpperCase()] ||
        nestedQuotes[QUOTE_VARIANT_META[id].label]
      if (isObjectRowArray(value)) {
        byId.set(
          id,
          buildVariant(
            id,
            value,
            freightFor(id),
            taxRate,
            columnsFor(id),
            extrasFor(id),
          ),
        )
      }
    })
  }

  // 2) Sibling tables on quote_result (Line Item, quote_2 Line Item, …).
  // Traceability / Compare share the quote_2 prefix and must not replace line items.
  for (const [key, value] of Object.entries(result)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const parentId = classifyQuoteNumberToken(compactKey(key))
      if (!parentId) continue
      for (const [childKey, child] of Object.entries(
        value as Record<string, unknown>,
      )) {
        if (resolveLineItemTableVariant(childKey) !== parentId) continue
        if (!isObjectRowArray(child)) continue
        if (byId.get(parentId)?.itemCount) continue
        byId.set(
          parentId,
          buildVariant(
            parentId,
            child,
            freightFor(parentId),
            taxRate,
            columnsFor(parentId),
            extrasFor(parentId, childKey),
          ),
        )
      }
      continue
    }
    const id = resolveLineItemTableVariant(key)
    if (!id) continue
    if (!Array.isArray(value)) continue
    // Primary "Line Item" table is handled via lineItems args (main).
    if (
      id === 'main' &&
      compactKey(key).includes('lineitem') &&
      !compactKey(key).includes('main')
    ) {
      continue
    }
    const rows = isObjectRowArray(value) ? value : []
    if (!rows.length && byId.get(id)?.itemCount) continue
    byId.set(
      id,
      buildVariant(
        id,
        rows,
        freightFor(id),
        taxRate,
        columnsFor(id),
        extrasFor(id, key),
      ),
    )
  }

  // 2b) Form tables (Line Item / quote_2 / quote_3) — prefer live form rows + recompute
  formById.forEach((source, id) => {
    const existing = byId.get(id)
    const formRows = isObjectRowArray(source.rows) ? source.rows! : []
    // Prefer form rows after copy/edit; fall back to whatever was already extracted.
    const rows = formRows.length
      ? formRows
      : existing?.rows?.length
        ? existing.rows
        : []
    const nextColumns = source.columns?.length
      ? source.columns
      : existing?.columns?.length
        ? existing.columns
        : columnsFor(id)
    const nextFreight = Number.isFinite(Number(source.freight))
      ? Number(source.freight)
      : Number(existing?.freight ?? freightFor(id))
    const quoteDiscount = Number.isFinite(Number(source.discount))
      ? Number(source.discount)
      : Number(existing?.discount ?? discountFor(id))
    const apiTotal =
      source.total != null && Number.isFinite(Number(source.total))
        ? Number(source.total)
        : totalFor(id)
    byId.set(
      id,
      buildVariant(id, rows, nextFreight, taxRate, nextColumns, {
        discount: quoteDiscount,
        fieldId: source.fieldId || existing?.fieldId,
        resultKey:
          source.resultKey || source.fieldId || existing?.resultKey,
        // buildVariant ignores 0 and recomputes from rows when needed
        total: apiTotal > 0 ? apiTotal : undefined,
      }),
    )
  })

  // 3) Group shared line-item rows by quote-type field when no alt/opt tables yet
  if (!byId.has('alt') && !byId.has('opt') && lineItems.length > 0) {
    const grouped: Record<QuoteVariantId, Record<string, any>[]> = {
      alt: [],
      main: [],
      opt: [],
    }
    let hasNonMain = false
    lineItems.forEach((row) => {
      const id = resolveRowQuoteVariant(row)
      if (id !== 'main') hasNonMain = true
      grouped[id].push(row)
    })
    if (hasNonMain) {
      VARIANT_ORDER.forEach((id) => {
        if (!grouped[id].length) return
        byId.set(
          id,
          buildVariant(
            id,
            grouped[id],
            freightFor(id),
            taxRate,
            columnsFor(id),
            extrasFor(id),
          ),
        )
      })
    }
  }

  // Always ensure Main exists from the primary line items when present.
  if (!byId.has('main') && lineItems.length > 0) {
    byId.set(
      'main',
      buildVariant(
        'main',
        lineItems,
        freightFor('main'),
        taxRate,
        columnsFor('main'),
        extrasFor('main'),
      ),
    )
  } else if (byId.has('main') && lineItems.length > 0 && !formById.has('main')) {
    // Prefer live main line items when form didn't supply a separate source.
    byId.set(
      'main',
      buildVariant(
        'main',
        lineItems,
        freightFor('main'),
        taxRate,
        columnsFor('main'),
        {
          ...extrasFor('main'),
          resultKey: byId.get('main')?.resultKey,
        },
      ),
    )
  }

  const variants = VARIANT_ORDER.map((id) => byId.get(id)).filter(
    (entry): entry is QuoteVariant => Boolean(entry),
  )

  if (!variants.length) {
    return [
      buildVariant(
        'main',
        lineItems,
        freightFor('main'),
        taxRate,
        columnsFor('main'),
        extrasFor('main'),
      ),
    ]
  }

  return variants
}

export const formatQuoteDelta = (total: number, mainTotal: number) => {
  const delta = Number((total - mainTotal).toFixed(2))
  if (!Number.isFinite(delta) || Math.abs(delta) < 0.005) return ''
  const sign = delta > 0 ? '+' : '-'
  return `${sign}$${toMoney(Math.abs(delta))} vs Quote 1`
}

const productKey = (row: Record<string, any>) =>
  String(row?.Product || row?.product || '')
    .trim()
    .toLowerCase()

export type QuoteLineDiffRow = {
  description: string
  price: number
  product: string
  qty: number
}

export type QuoteLineDiff = {
  added: QuoteLineDiffRow[]
  priceChanged: Array<QuoteLineDiffRow & { beforePrice: number }>
  qtyChanged: Array<QuoteLineDiffRow & { beforeQty: number }>
  removed: QuoteLineDiffRow[]
}

const toDiffRow = (row: Record<string, any>): QuoteLineDiffRow => ({
  description: String(row?.Description || row?.description || '').trim(),
  price: Number(row?.Price ?? row?.price ?? 0) || 0,
  product: String(row?.Product || row?.product || '').trim() || '—',
  qty: Number(row?.Qty ?? row?.Quantity ?? row?.qty ?? 0) || 0,
})

/** Diff line items between Quote 1 (before) and Quote 2/3 (after). */
export const diffQuoteLineItems = (
  beforeRows: Record<string, any>[],
  afterRows: Record<string, any>[],
): QuoteLineDiff => {
  const beforeMap = new Map<string, Record<string, any>>()
  const afterMap = new Map<string, Record<string, any>>()
  ;(beforeRows || []).forEach((row) => {
    const key = productKey(row)
    if (key) beforeMap.set(key, row)
  })
  ;(afterRows || []).forEach((row) => {
    const key = productKey(row)
    if (key) afterMap.set(key, row)
  })

  const added: QuoteLineDiff['added'] = []
  const removed: QuoteLineDiff['removed'] = []
  const qtyChanged: QuoteLineDiff['qtyChanged'] = []
  const priceChanged: QuoteLineDiff['priceChanged'] = []

  afterMap.forEach((row, key) => {
    const prev = beforeMap.get(key)
    if (!prev) {
      added.push(toDiffRow(row))
      return
    }
    const next = toDiffRow(row)
    const prior = toDiffRow(prev)
    if (Math.abs(next.qty - prior.qty) > 0.0001) {
      qtyChanged.push({ ...next, beforeQty: prior.qty })
    }
    if (Math.abs(next.price - prior.price) > 0.0001) {
      priceChanged.push({ ...next, beforePrice: prior.price })
    }
  })

  beforeMap.forEach((row, key) => {
    if (!afterMap.has(key)) removed.push(toDiffRow(row))
  })

  return { added, priceChanged, qtyChanged, removed }
}

export const VARIANT_REMARKS_KEYS: Record<QuoteVariantId, string[]> = {
  alt: ['quote_2 Remarks', 'ALT Remarks'],
  main: ['Remarks'],
  opt: ['quote_3 Remarks', 'OPT Remarks'],
}

export type QuoteVariantEmptyMeta = {
  reason: string
  status: string
}

const pickNestedStatusReason = (
  block: Record<string, any> | null | undefined,
  prefix: 'quote_2' | 'quote_3',
): QuoteVariantEmptyMeta | null => {
  if (!block || typeof block !== 'object' || Array.isArray(block)) return null
  const status = String(
    block[`${prefix} Status`] ||
      block.Status ||
      block.status ||
      block[`${prefix}_Status`] ||
      '',
  ).trim()
  const reason = String(
    block[`${prefix} Reason`] ||
      block.Reason ||
      block.reason ||
      block[`${prefix}_Reason`] ||
      '',
  ).trim()
  if (!status && !reason) return null
  return { reason, status }
}

/** Status / reason for empty Quote 2 / Quote 3 from quote_result.quote_2 / quote_3. */
export const extractQuoteVariantEmptyMeta = (
  result: Record<string, any> | null | undefined,
): Partial<Record<'alt' | 'opt', QuoteVariantEmptyMeta>> => {
  if (!result || typeof result !== 'object') return {}
  const out: Partial<Record<'alt' | 'opt', QuoteVariantEmptyMeta>> = {}
  const alt =
    pickNestedStatusReason(result.quote_2, 'quote_2') ||
    pickNestedStatusReason(result.quote2, 'quote_2') ||
    pickNestedStatusReason(result['Quote 2'], 'quote_2')
  const opt =
    pickNestedStatusReason(result.quote_3, 'quote_3') ||
    pickNestedStatusReason(result.quote3, 'quote_3') ||
    pickNestedStatusReason(result['Quote 3'], 'quote_3')
  if (alt) out.alt = alt
  if (opt) out.opt = opt
  return out
}

const isNoComparisonValue = (value: unknown) => {
  if (value == null) return true
  if (typeof value === 'string') {
    const compact = value.toLowerCase().replace(/[\s_-]+/g, '')
    return (
      !compact ||
      compact.includes('nocomparison') ||
      compact === 'null' ||
      compact === 'none'
    )
  }
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') {
    const entries = Object.values(value as Record<string, unknown>)
    if (!entries.length) return true
    return entries.every(isNoComparisonValue)
  }
  return false
}

const rowQuoteText = (row: unknown) => {
  if (!row || typeof row !== 'object') return String(row ?? '')
  return Object.entries(row as Record<string, unknown>)
    .filter(([key]) => !key.startsWith('_'))
    .map(([, value]) => String(value ?? ''))
    .join(' ')
}

const rowMatchesQuoteKey = (row: unknown, key: 'quote_2' | 'quote_3') => {
  const compact = rowQuoteText(row).toLowerCase().replace(/[\s_-]+/g, '')
  const token = key.replace('_', '')
  return compact.includes(token) || compact.includes(key)
}

/** Keep Compare rows for one quote, dropping "No comparison" placeholders. */
const compareRowsForVariant = (
  formCompareRows: unknown[],
  key: 'quote_2' | 'quote_3',
) =>
  formCompareRows.filter(
    (row) =>
      rowMatchesQuoteKey(row, key) && !isNoComparisonValue(rowQuoteText(row)),
  )

/** Builder columns plus columns the user added on a DYNAMIC_TABLE. */
export const effectiveDynamicColumns = (field: any, rows: unknown) => {
  const schema = Array.isArray(field?.settings?.specific?.tableColumns)
    ? field.settings.specific.tableColumns
    : []
  const list = Array.isArray(rows) ? rows : []
  const dynamic =
    list.find(
      (row) =>
        row &&
        typeof row === 'object' &&
        Array.isArray((row as { _dynamicColumns?: unknown })._dynamicColumns),
    )?._dynamicColumns || []
  const seen = new Set<string>()
  return [...schema, ...dynamic].filter((col) => {
    const id = String(col?.id || '')
    if (!id || seen.has(id)) return false
    if (col?.settings?.general?.visibility === 'HIDDEN') return false
    seen.add(id)
    return true
  })
}

export const resolveComparePayload = (
  result: Record<string, any> | null | undefined,
  variantId: 'alt' | 'opt',
  formCompareRows?: unknown,
): unknown | null => {
  const key = variantId === 'alt' ? 'quote_2' : 'quote_3'
  const compareRoot = result?.compare || result?.Compare
  const fromResult =
    compareRoot && typeof compareRoot === 'object' && !Array.isArray(compareRoot)
      ? (compareRoot as Record<string, unknown>)[key]
      : undefined

  // Structured quote diff (object) renders as short text, with any arrays
  // inside it rendered as tables. A form Compare array is the table source
  // when that object is missing. Null / "No comparison" stays empty.
  if (
    fromResult &&
    typeof fromResult === 'object' &&
    !Array.isArray(fromResult) &&
    !isNoComparisonValue(fromResult)
  ) {
    return fromResult
  }
  if (Array.isArray(fromResult) && !isNoComparisonValue(fromResult)) {
    return fromResult
  }
  if (Array.isArray(formCompareRows)) {
    const useful = compareRowsForVariant(formCompareRows, key)
    return useful.length ? useful : null
  }
  return null
}

/** Fallback result/form keys for totals (supports both ALT_* and quote_2_* naming). */
export const VARIANT_SCALAR_KEYS: Record<
  QuoteVariantId,
  Partial<Record<'discount' | 'freight' | 'subtotal' | 'tax' | 'total', string[]>>
> = {
  alt: {
    discount: ['quote_2 Discount', 'ALT Discount'],
    freight: ['quote_2 Freight', 'ALT Freight'],
    subtotal: ['quote_2 Subtotal', 'ALT Subtotal'],
    tax: ['quote_2 HST', 'ALT HST'],
    total: ['quote_2 Total', 'ALT Total'],
  },
  main: {
    discount: ['Discount'],
    freight: ['Freight'],
    subtotal: ['Subtotal'],
    tax: ['Hst', 'HST'],
    total: ['Total'],
  },
  opt: {
    discount: ['quote_3 Discount', 'OPT Discount'],
    freight: ['quote_3 Freight', 'OPT Freight'],
    subtotal: ['quote_3 Subtotal', 'OPT Subtotal'],
    tax: ['quote_3 HST', 'OPT HST'],
    total: ['quote_3 Total', 'OPT Total'],
  },
}

/** Result keys claimed as quote-variant tables (hide from otherTables). */
export const collectQuoteVariantResultKeys = (
  variants: QuoteVariant[],
): Set<string> => {
  const keys = new Set<string>()
  variants.forEach((variant) => {
    if (variant.resultKey) keys.add(variant.resultKey)
  })
  return keys
}
