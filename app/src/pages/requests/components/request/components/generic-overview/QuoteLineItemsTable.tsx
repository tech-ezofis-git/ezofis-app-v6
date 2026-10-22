import { arrayMove } from '@dnd-kit/sortable'
import { Icon } from '@iconify/react'
import { useLingui } from '@lingui/react/macro'
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { fetchFtlCatalogProduct } from '@/api/v6/ftlCatalog'
import Tooltip from '@/components/base/Tooltip'
import { ApiCatalogSelect } from '@/pages/requests/components/workflow-request/components/TableFieldRenderer'
import cn from '@/utils/cn'
import {
  collectFormTableFields,
  isLineItemHeading,
} from './AgentEditableTables'
import RowInsertRail from './RowInsertRail'
import { SortableRows, useSortableRow, useSortableRowIds } from './SortableRows'
import StickyScrollX from './StickyScrollX'
import {
  handleHistoryShortcut,
  TableHistoryButtons,
  useRowsHistory,
} from './tableHistory'

const getFieldHeading = (field: any) =>
  String(
    field?.label ||
      field?.displayLabel ||
      field?.name ||
      field?.settings?.general?.label ||
      field?.id ||
      '',
  )

const getFieldId = (field: any) =>
  String(field?.id || field?.jsonId || field?.name || '')

const normalizeHeading = (value: string) =>
  value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ')

const compactHeading = (value: string) =>
  normalizeHeading(value).replace(/\s+/g, '')

/** Light-orange for Accept all / Accept. */
const lineItemAcceptBtnClass =
  'inline-flex cursor-pointer items-center gap-1 rounded-md border border-[var(--orange-7)] bg-[var(--orange-2)] px-2 py-1 text-[11px] font-semibold text-[var(--orange-11)] transition-all hover:bg-[var(--orange-3)] active:scale-95'

/** Purple outline for + Add Row (white fill, primary border/text). */
/** Qty / Price / Discount / Subtotal share one width. */
const amountColumnClass = 'w-[8.5rem] min-w-[8.5rem]'

const lineItemAddRowBtnClass =
  'inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[var(--primary-4)] bg-surface px-3 py-1.5 text-[11px] font-semibold text-[var(--primary-11)] transition-all hover:bg-[var(--primary-2)] active:scale-95'

const columnTitle = (col: any) =>
  String(
    col?.name ||
      col?.label ||
      col?.displayLabel ||
      col?.settings?.general?.label ||
      '',
  )

const LINE_FIELD_ALIASES: Record<string, string[]> = {
  Category: ['category'],
  Description: ['description', 'desc', 'details', 'item description'],
  Discount: ['discount', 'disc', 'discount %', 'discount%'],
  Note: ['note', 'notes', 'remark', 'remarks'],
  Price: [
    'price',
    'unit price',
    'unitprice',
    'unit rate',
    'rate',
    'list price',
  ],
  Product: [
    'product',
    'sku',
    'item',
    'item name',
    'product code',
    'productcode',
  ],
  Qty: ['qty', 'quantity', 'qnty', 'qty.'],
  Subtotal: [
    'subtotal',
    'amount',
    'line amount',
    'line total',
    'extended',
    'ext',
    'total',
  ],
}

const headingMatchesAliases = (heading: string, aliases: string[]) => {
  const got = compactHeading(heading)
  if (!got) return false
  return aliases.some((alias) => compactHeading(alias) === got)
}

const findColumnForCanonical = (
  columns: any[] | undefined,
  canonical: string,
) => {
  const aliases = LINE_FIELD_ALIASES[canonical] || [canonical]
  return (
    (columns || []).find((col) =>
      headingMatchesAliases(columnTitle(col), aliases),
    ) || null
  )
}

const isEmptyValue = (value: unknown) =>
  value === undefined || value === null || String(value).trim() === ''

/**
 * Prefer form column UUID values over leftover agent keys (Product/Qty/Price).
 * Stale name-keys were overwriting the real price after catalog select.
 */
const readNamedField = (
  row: Record<string, any>,
  canonical: string,
  aliases: string[],
) => {
  if (!isEmptyValue(row?.[canonical])) return row[canonical]
  for (const [key, value] of Object.entries(row || {})) {
    if (key.startsWith('_')) continue
    if (!headingMatchesAliases(key, aliases)) continue
    if (!isEmptyValue(value)) return value
  }
  return undefined
}

const resolveLineFieldValue = (
  row: Record<string, any>,
  columns: any[] | undefined,
  canonical: string,
) => {
  const aliases = LINE_FIELD_ALIASES[canonical] || [canonical]
  const col = findColumnForCanonical(columns, canonical)
  const named = readNamedField(row, canonical, aliases)
  const fromColumn = col?.id != null ? row?.[col.id] : undefined
  const textValue = (value: unknown) => String(value ?? '').trim()
  const isBareNumber = (value: unknown) =>
    /^\d+(\.\d+)?$/.test(textValue(value))
  const qtyValue = row?.Qty ?? row?.Quantity ?? row?.qty ?? row?.quantity

  // Description text was being replaced by the qty stored on that column.
  if (canonical === 'Description') {
    const namedText = textValue(named)
    const columnText = textValue(fromColumn)
    const columnIsQty =
      isBareNumber(fromColumn) &&
      (qtyValue == null ||
        textValue(qtyValue) === '' ||
        Number(columnText) === Number(qtyValue))
    if (namedText && !isBareNumber(named)) return named
    if (columnIsQty) return namedText && !isBareNumber(named) ? named : ''
  }

  // The quote result's Qty/Quantity is the quantity. A form column that
  // picked up Price or another field must not replace it.
  if (canonical === 'Qty' && !isEmptyValue(named)) return named

  // Prefer real named Product/Price over a stale UUID 0 left on another quote.
  if (
    (canonical === 'Product' || canonical === 'Price') &&
    !isEmptyValue(named) &&
    (isEmptyValue(fromColumn) ||
      (canonical === 'Price' && Number(fromColumn) === 0 && Number(named) > 0))
  ) {
    return named
  }

  // Edited discount lives on the canonical key. A stale 0 on the other
  // quote's column UUID must not hide it when rows are copied across tables.
  if (canonical === 'Discount') {
    const namedNum = parseLooseNumber(named)
    const columnNum = parseLooseNumber(fromColumn)
    if (
      Number.isFinite(namedNum) &&
      namedNum > 0 &&
      (!Number.isFinite(columnNum) || columnNum === 0)
    ) {
      return named
    }
  }

  if (!isEmptyValue(fromColumn)) return fromColumn
  if (!isEmptyValue(named)) return named
  return ''
}

const parseLooseNumber = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN
  if (isEmptyValue(value)) return NaN
  const cleaned = String(value).replace(/[^0-9.eE+-]/g, '')
  if (!cleaned) return NaN
  const num = Number(cleaned)
  return Number.isFinite(num) ? num : NaN
}

const roundMoney = (value: number) => Number(value.toFixed(2))

export const toMoney = (value: unknown) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return '0.00'
  return num.toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })
}

/** Whole quantities render as integers (1.0 → 1). */
const formatQty = (value: unknown) => {
  if (value === '' || value == null) return 'NA'
  const num = parseLooseNumber(value)
  if (!Number.isFinite(num)) return String(value)
  return Number.isInteger(num) ? String(num) : String(num)
}

const generateRowId = () => {
  try {
    return crypto.randomUUID()
  } catch {
    return `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }
}

type DiscountMode = 'percent' | 'amount'

const resolveDiscountMode = (row: Record<string, any>): DiscountMode => {
  const raw = String(row?._discountMode || row?.DiscountMode || 'percent')
    .trim()
    .toLowerCase()
  return raw === 'amount' || raw === '$' || raw === 'dollar'
    ? 'amount'
    : 'percent'
}

const computeLineSubtotal = (row: Record<string, any>, columns: any[] = []) => {
  const qty = parseLooseNumber(resolveLineFieldValue(row, columns, 'Qty'))
  const price = parseLooseNumber(resolveLineFieldValue(row, columns, 'Price'))
  if (Number.isFinite(qty) && Number.isFinite(price)) {
    const discountRaw = parseLooseNumber(
      resolveLineFieldValue(row, columns, 'Discount'),
    )
    const discount = Number.isFinite(discountRaw) ? discountRaw : 0
    const base = qty * price
    if (resolveDiscountMode(row) === 'amount') {
      // $ discount is per unit: Qty 10 × $5 off = $50 off the line.
      return roundMoney(Math.max(0, base - qty * discount))
    }
    // Default form formula: (Qty * Price) * (1 - Discount / 100)
    return roundMoney(base * (1 - discount / 100))
  }
  const existing = parseLooseNumber(
    resolveLineFieldValue(row, columns, 'Subtotal'),
  )
  return Number.isFinite(existing) ? existing : 0
}

/** Sync canonical keys ↔ form column UUIDs and always recompute Subtotal. */
export const normalizeLineItemRow = (
  row: Record<string, any>,
  columns: any[] = [],
  rowIndex = 0,
) => {
  // Keep a stable id so prop sync fingerprints don't thrash every render.
  const next: Record<string, any> = {
    _rowId: row?._rowId || row?._id || `line-${rowIndex}`,
  }
  if (row?._approved != null) next._approved = row._approved
  if (row?._hideNote != null) next._hideNote = row._hideNote
  next._discountMode = resolveDiscountMode(row)

  const needsReview = row?.['Needs Engineering Review']
  if (needsReview != null) next['Needs Engineering Review'] = needsReview

  const noteValue = resolveLineFieldValue(row, columns, 'Note')
  if (!isEmptyValue(noteValue)) next.Note = noteValue
  else if (!isEmptyValue(row?.Note)) next.Note = row.Note

  const categoryValue = resolveLineFieldValue(row, columns, 'Category')
  if (!isEmptyValue(categoryValue)) next.Category = categoryValue
  else if (!isEmptyValue(row?.Category)) next.Category = row.Category
  ;(['Product', 'Description', 'Qty', 'Price', 'Discount'] as const).forEach(
    (canonical) => {
      const value = resolveLineFieldValue(row, columns, canonical)
      // Keep Discount as '' while editing so the user can clear "0";
      // computeLineSubtotal already treats empty as 0.
      next[canonical] =
        isEmptyValue(value) && canonical === 'Discount' ? '' : value
      const col = findColumnForCanonical(columns, canonical)
      const blockedIds = new Set([
        'Product',
        'Description',
        'Qty',
        'Price',
        'Discount',
        'Subtotal',
        'Note',
        'Category',
      ])
      blockedIds.delete(canonical)
      if (col?.id && !blockedIds.has(String(col.id)))
        next[col.id] = next[canonical]
    },
  )

  const noteCol = findColumnForCanonical(columns, 'Note')
  if (noteCol?.id && !isEmptyValue(next.Note)) next[noteCol.id] = next.Note

  const subtotal = computeLineSubtotal(next, columns)
  next.Subtotal = subtotal
  const subtotalCol = findColumnForCanonical(columns, 'Subtotal')
  if (subtotalCol?.id) next[subtotalCol.id] = subtotal

  return next
}

export const normalizeLineItemRows = (
  rows: Record<string, any>[] | undefined,
  columns: any[] = [],
) => (rows || []).map((row, index) => normalizeLineItemRow(row, columns, index))

const CANONICAL_LINE_FIELDS = [
  'Product',
  'Description',
  'Qty',
  'Price',
  'Discount',
  'Note',
  'Category',
  'Subtotal',
] as const

const canonicalForColumn = (col: any): string | null => {
  const title = columnTitle(col)
  for (const key of Object.keys(LINE_FIELD_ALIASES)) {
    if (headingMatchesAliases(title, LINE_FIELD_ALIASES[key])) return key
  }
  return null
}

/** Pull a canonical field from a row using any available column defs + named keys. */
const pickCanonicalLineValue = (
  row: Record<string, any>,
  canonical: string,
  columnSets: any[][],
) => {
  for (const cols of columnSets) {
    if (!cols?.length) continue
    const value = resolveLineFieldValue(row, cols, canonical)
    if (!isEmptyValue(value)) return value
  }
  const aliases = LINE_FIELD_ALIASES[canonical] || [canonical]
  const named = readNamedField(row, canonical, aliases)
  if (!isEmptyValue(named)) return named

  // Direct UUID read from every known column def for this canonical.
  for (const cols of columnSets) {
    const col = findColumnForCanonical(cols, canonical)
    if (col?.id != null && !isEmptyValue(row?.[col.id])) return row[col.id]
  }

  // Last resort: walk every source column id present on the row.
  for (const cols of columnSets) {
    for (const col of cols || []) {
      if (canonicalForColumn(col) !== canonical) continue
      if (col?.id != null && !isEmptyValue(row?.[col.id])) return row[col.id]
    }
  }
  return ''
}

/**
 * Copy rows between quote tables with different column UUIDs (Line Item → quote_2).
 * Resolves Product/Qty/Price via source column ids, then writes target column ids.
 */
export const remapLineItemRows = (
  rows: Record<string, any>[] | undefined,
  sourceColumns: any[] = [],
  targetColumns: any[] = [],
) => {
  const columnSets = [sourceColumns, targetColumns].filter(
    (cols) => Array.isArray(cols) && cols.length > 0,
  )
  const writeColumns = targetColumns.length
    ? targetColumns
    : sourceColumns.length
      ? sourceColumns
      : []

  return (rows || []).map((row, index) => {
    const slim: Record<string, any> = {
      _discountMode: resolveDiscountMode(row),
      _rowId: generateRowId(),
    }
    if (row?._approved != null) slim._approved = row._approved
    if (row?._hideNote != null) slim._hideNote = row._hideNote
    if (row?.['Needs Engineering Review'] != null) {
      slim['Needs Engineering Review'] = row['Needs Engineering Review']
    }

    CANONICAL_LINE_FIELDS.forEach((canonical) => {
      slim[canonical] = pickCanonicalLineValue(row, canonical, columnSets)
    })

    // If still missing Product/Qty/Price, map source-col UUID → canonical by definition.
    if (sourceColumns.length) {
      sourceColumns.forEach((col) => {
        const canonical = canonicalForColumn(col)
        if (
          !canonical ||
          !(CANONICAL_LINE_FIELDS as readonly string[]).includes(canonical)
        ) {
          return
        }
        if (!isEmptyValue(slim[canonical])) return
        if (col?.id != null && !isEmptyValue(row?.[col.id])) {
          slim[canonical] = row[col.id]
        }
      })
    }

    return normalizeLineItemRow(slim, writeColumns, index)
  })
}

const ROW_ALIAS_KEYS = new Set([
  'Product',
  'Description',
  'Qty',
  'Price',
  'Discount',
  'Subtotal',
  '#',
])

/** Persist a line on its column control ids. Names stay in memory for display. */
export const toFormTableRows = (rows: Record<string, any>[], columns: any[]) =>
  rows.map((row) => {
    const mapped: Record<string, any> = {
      _rowId: row._rowId || generateRowId(),
    }
    if (row._approved != null) mapped._approved = row._approved
    if (row._hideNote != null) mapped._hideNote = row._hideNote
    if (row._discountMode) mapped._discountMode = row._discountMode
    if (row['Needs Engineering Review'] != null) {
      mapped['Needs Engineering Review'] = row['Needs Engineering Review']
    }
    if (!isEmptyValue(row.Note)) mapped.Note = row.Note
    if (!isEmptyValue(row.Category)) mapped.Category = row.Category

    if (!columns.length) {
      Object.entries(row || {}).forEach(([key, value]) => {
        if (key.startsWith('_') || ROW_ALIAS_KEYS.has(key)) return
        if (!isEmptyValue(value)) mapped[key] = value
      })
      return mapped
    }

    columns.forEach((col) => {
      if (col?.id == null || col.id === '') return
      const title = columnTitle(col)
      let canonical: string | null = null
      for (const key of Object.keys(LINE_FIELD_ALIASES)) {
        if (headingMatchesAliases(title, LINE_FIELD_ALIASES[key])) {
          canonical = key
          break
        }
      }
      if (canonical) {
        const namedValue = row[canonical]
        const columnValue = row[col.id]
        mapped[col.id] = !isEmptyValue(namedValue)
          ? namedValue
          : !isEmptyValue(columnValue)
            ? columnValue
            : ''
        return
      }
      mapped[col.id] = isEmptyValue(row[col.id]) ? '' : row[col.id]
    })
    return mapped
  })

const applyLineField = (
  row: Record<string, any>,
  canonical: string,
  value: any,
  columns: any[] = [],
) => {
  if (canonical === '_discountMode') {
    return { ...row, _discountMode: value === 'amount' ? 'amount' : 'percent' }
  }
  const next = { ...row, [canonical]: value }
  const col = findColumnForCanonical(columns, canonical)
  if (col?.id) next[col.id] = value
  return next
}

const emptyLineRow = (): Record<string, any> => ({
  _discountMode: 'percent',
  _rowId: generateRowId(),
  Category: '',
  Description: '',
  Discount: 0,
  Note: '',
  Price: 0,
  Product: '',
  Qty: 1,
  Subtotal: 0,
})

const sumLineSubtotals = (rows: Record<string, any>[], columns: any[] = []) =>
  roundMoney(
    rows.reduce((sum, row) => sum + computeLineSubtotal(row, columns), 0),
  )

/** Pre-discount line amount: Qty × Price (before % / $ discount). */
const computeLineGross = (row: Record<string, any>, columns: any[] = []) => {
  const qty = parseLooseNumber(resolveLineFieldValue(row, columns, 'Qty'))
  const price = parseLooseNumber(resolveLineFieldValue(row, columns, 'Price'))
  if (!Number.isFinite(qty) || !Number.isFinite(price)) return 0
  return qty * price
}

const sumLineGross = (rows: Record<string, any>[], columns: any[] = []) =>
  roundMoney(rows.reduce((sum, row) => sum + computeLineGross(row, columns), 0))

/**
 * Build quote totals.
 * - Subtotal = sum of line nets (after each line's Discount).
 * - Discount = $ saved on lines (gross − net), so the footer reflects row discounts.
 * - Optional `quoteDiscount` is an extra $ off only when lines have no discount applied
 *   (avoids double-counting when the Discount field was persisted from line savings).
 */
export const buildQuoteTotals = (
  rows: Record<string, any>[],
  freight: number,
  taxRate: number,
  columns: any[] = [],
  quoteDiscount = 0,
) => {
  const gross = sumLineGross(rows, columns)
  const subtotal = sumLineSubtotals(rows, columns)
  const lineDiscount = roundMoney(Math.max(0, gross - subtotal))
  const hasLineDiscount =
    lineDiscount > 0 ||
    rows.some((row) => {
      const raw = parseLooseNumber(
        resolveLineFieldValue(row, columns, 'Discount'),
      )
      return Number.isFinite(raw) && raw > 0
    })
  const extraDiscount = hasLineDiscount
    ? 0
    : Math.max(0, Number(quoteDiscount) || 0)
  const discountAmt = roundMoney(lineDiscount + extraDiscount)
  // Tax on net lines (+ freight). Line discounts are already in `subtotal`.
  const taxableBase =
    Math.max(0, subtotal - extraDiscount) + Number(freight || 0)
  const hst = roundMoney(taxableBase * taxRate)
  const total = roundMoney(taxableBase + hst)
  return {
    discount: discountAmt,
    freight: roundMoney(freight),
    gross,
    hst,
    subtotal,
    total,
  }
}

const findProductColumn = (columns: any[]) =>
  columns.find(
    (col) => col?.settings?.lookupSettings?.optionsSource === 'API',
  ) || findColumnForCanonical(columns, 'Product')

const findPriceColumn = (columns: any[]) =>
  findColumnForCanonical(columns, 'Price')

const findDescriptionColumn = (columns: any[]) =>
  findColumnForCanonical(columns, 'Description')

const findQtyColumn = (columns: any[]) => findColumnForCanonical(columns, 'Qty')

const isApiProductColumn = (col: any) =>
  col?.settings?.lookupSettings?.optionsSource === 'API'

const extractCatalogUnitPrice = (product: Record<string, any> | null) => {
  if (!product) return null
  const raw =
    product.unitPrice ??
    product.UnitPrice ??
    product.price ??
    product.Price ??
    product.unit_price ??
    product.listPrice
  const num = Number(raw)
  return Number.isFinite(num) ? num : null
}

const extractCatalogDescription = (product: Record<string, any> | null) => {
  if (!product) return null
  const raw =
    product.description ?? product.Description ?? product.productDescription
  return raw != null && String(raw).trim() ? String(raw) : null
}

const itemsFingerprint = (items: Record<string, any>[] | undefined) => {
  try {
    // Ignore volatile row ids so prop sync doesn't thrash.
    const slim = (items || []).map((row) => {
      const { _id, _rowId, ...rest } = row || {}
      return rest
    })
    return JSON.stringify(slim)
  } catch {
    return String((items || []).length)
  }
}

export type QuoteTotals = {
  discount: number
  freight: number
  /** Qty × Price before line discounts. */
  gross: number
  hst: number
  subtotal: number
  total: number
}

interface Props {
  items: Record<string, any>[]
  /** Quote-level discount ($) for the active Main/ALT/OPT tab. */
  discount?: number
  freight?: number
  /** When set, prefer these columns (ALT/OPT tables have distinct column UUIDs). */
  tableColumns?: any[]
  /** Persist edits to this form field id (Line Item / ALT Line Item / OPT Line Item). */
  tableFieldId?: string
  readOnly?: boolean
  taxRate?: number
  title?: string
  workflow?: any
  onFieldChange?: (fieldId: string, value: any) => void
  onTotalsChange?: (totals: QuoteTotals) => void
}

const QuoteLineItemsTable = ({
  discount = 0,
  freight = 0,
  items,
  readOnly = false,
  tableColumns: tableColumnsProp,
  tableFieldId,
  taxRate = 0.13,
  title,
  workflow,
  onFieldChange,
  onTotalsChange,
}: Props) => {
  const { t } = useLingui()

  const tableField = useMemo(() => {
    const fields = collectFormTableFields(workflow)
    if (tableFieldId) {
      const byId = fields.find((field) => getFieldId(field) === tableFieldId)
      if (byId) return byId
    }
    return fields.find((field) => isLineItemHeading(getFieldHeading(field)))
  }, [tableFieldId, workflow])

  const tableColumns = useMemo(() => {
    if (Array.isArray(tableColumnsProp) && tableColumnsProp.length > 0) {
      return tableColumnsProp
    }
    return tableField?.settings?.specific?.tableColumns || []
  }, [tableColumnsProp, tableField])

  const hasDiscountColumn = useMemo(
    () => Boolean(findColumnForCanonical(tableColumns, 'Discount')),
    [tableColumns],
  )

  const productColumn = useMemo(
    () => findProductColumn(tableColumns),
    [tableColumns],
  )
  const priceColumn = useMemo(
    () => findPriceColumn(tableColumns),
    [tableColumns],
  )
  const descriptionColumn = useMemo(
    () => findDescriptionColumn(tableColumns),
    [tableColumns],
  )
  const qtyColumn = useMemo(() => findQtyColumn(tableColumns), [tableColumns])
  const useApiProduct = isApiProductColumn(productColumn)

  const normalizedItems = useMemo(
    () => normalizeLineItemRows(items, tableColumns),
    [items, tableColumns],
  )

  const [rows, setRows] = useState<Record<string, any>[]>(() =>
    normalizedItems.length ? normalizedItems : [],
  )
  const rowsRef = useRef(rows)
  rowsRef.current = rows

  const itemsKey = useMemo(
    () => itemsFingerprint(normalizedItems),
    [normalizedItems],
  )

  useEffect(() => {
    // Sync local rows from props only — do NOT call onTotalsChange here.
    // Persisting totals on sync updates formModel → new items fingerprint → loop.
    // Do not invent a placeholder NA row when the quote truly has 0 items.
    setRows(normalizedItems.length ? normalizedItems : [])
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync on content fingerprint only
  }, [itemsKey])

  const history = useRowsHistory<Record<string, any>>(tableFieldId)

  const persist = (
    next: Record<string, any>[],
    options?: { coalesceKey?: string; skipHistory?: boolean },
  ) => {
    if (!options?.skipHistory) {
      history.record(rowsRef.current, options?.coalesceKey)
    }
    const normalized = normalizeLineItemRows(next, tableColumns)
    const totals = buildQuoteTotals(
      normalized,
      freight,
      taxRate,
      tableColumns,
      discount,
    )
    setRows(normalized)
    onTotalsChange?.(totals)
    if (!onFieldChange) return
    const persistId = tableFieldId || (tableField ? getFieldId(tableField) : '')
    if (persistId) {
      onFieldChange(persistId, toFormTableRows(normalized, tableColumns))
    } else {
      onFieldChange('Line Item', normalized)
    }
  }

  const updateCell = (index: number, key: string, value: any) => {
    persist(
      rowsRef.current.map((row, i) => {
        if (i !== index) return row
        return applyLineField(row, key, value, tableColumns)
      }),
      { coalesceKey: `${index}:${key}` },
    )
  }

  const undo = () => {
    const previous = history.undo(rowsRef.current)
    if (previous) persist(previous, { skipHistory: true })
  }

  const redo = () => {
    const next = history.redo(rowsRef.current)
    if (next) persist(next, { skipHistory: true })
  }

  const selectProduct = async (index: number, productCode: string | null) => {
    if (!productCode) {
      updateCell(index, 'Product', '')
      return
    }

    let unitPrice: number | null = null
    let description: string | null = null
    let resolvedCode = productCode
    try {
      const product = await fetchFtlCatalogProduct(productCode)
      unitPrice = extractCatalogUnitPrice(product)
      description = extractCatalogDescription(product)
      if (product?.productCode) resolvedCode = String(product.productCode)
    } catch {
      // keep selected code even if catalog details fail
    }

    persist(
      rowsRef.current.map((row, i) => {
        if (i !== index) return row

        let next = applyLineField(row, 'Product', resolvedCode, tableColumns)
        if (productColumn?.id) next[productColumn.id] = resolvedCode

        // Keep existing qty (never overwrite with unit price).
        const currentQty = resolveLineFieldValue(next, tableColumns, 'Qty')
        const qtyValue = isEmptyValue(currentQty) ? 1 : currentQty
        next = applyLineField(next, 'Qty', qtyValue, tableColumns)
        if (qtyColumn?.id) next[qtyColumn.id] = qtyValue

        if (unitPrice != null) {
          next = applyLineField(next, 'Price', unitPrice, tableColumns)
          if (priceColumn?.id) next[priceColumn.id] = unitPrice
          next.Price = unitPrice
        }

        if (description) {
          next = applyLineField(next, 'Description', description, tableColumns)
          if (descriptionColumn?.id) next[descriptionColumn.id] = description
          next.Description = description
        }

        return next
      }),
    )
  }

  const setRowApproved = (index: number, approved: boolean) => {
    persist(
      rowsRef.current.map((row, i) =>
        i === index
          ? { ...row, _approved: approved, _hideNote: approved }
          : row,
      ),
    )
  }

  const acceptAll = () => {
    persist(
      rowsRef.current.map((row) => ({
        ...row,
        _approved: true,
        _hideNote: true,
      })),
    )
  }

  // Index of a just-added row: it scrolls into view with its Product editor
  // open. Tracked by index (row ids can be regenerated on the form round
  // trip) and cleared shortly after so later remounts don't reopen it.
  const [focusRowIndex, setFocusRowIndex] = useState<number | null>(null)
  const focusTimerRef = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(focusTimerRef.current), [])

  const focusNewRow = (index: number) => {
    setFocusRowIndex(index)
    window.clearTimeout(focusTimerRef.current)
    focusTimerRef.current = window.setTimeout(
      () => setFocusRowIndex(null),
      1500,
    )
  }

  const addRow = () => {
    persist([...rowsRef.current, emptyLineRow()])
    focusNewRow(rowsRef.current.length)
  }

  const insertRow = (index: number) => {
    const current = rowsRef.current
    persist([
      ...current.slice(0, index),
      emptyLineRow(),
      ...current.slice(index),
    ])
    focusNewRow(index)
  }

  const deleteRow = (index: number) => {
    const next = rowsRef.current.filter((_, i) => i !== index)
    persist(next.length > 0 ? next : [emptyLineRow()])
  }

  const moveRow = (fromIndex: number, toIndex: number) => {
    persist(arrayMove(rowsRef.current, fromIndex, toIndex))
  }

  const canEdit = !readOnly
  const hasUnaccepted = rows.some((row) => !row._approved)
  const rowIds = useSortableRowIds(rows)
  const [isDraggingRow, setIsDraggingRow] = useState(false)

  // Parent renders a dedicated empty-state panel for 0-item quote tabs.
  if (!rows.length) return null

  return (
    // Focusable so Ctrl+Z / Ctrl+Y work after clicking anywhere in the table.
    <div
      className='flex flex-col gap-3 outline-none'
      tabIndex={canEdit ? -1 : undefined}
      onKeyDown={
        canEdit
          ? (event) => handleHistoryShortcut(event, undo, redo)
          : undefined
      }
    >
      <div className='flex items-center justify-between gap-2'>
        <h4 className='flex items-center gap-1.5 text-sm font-semibold text-gray-12'>
          <Icon
            className='h-4 w-4 text-[var(--primary-9)]'
            icon='tabler:shopping-cart'
          />
          {title || t`Line Items`} ({rows.length})
        </h4>
        {canEdit && (
          <div className='flex items-center gap-2'>
            <TableHistoryButtons
              canRedo={history.canRedo}
              canUndo={history.canUndo}
              onRedo={redo}
              onUndo={undo}
            />
            {hasUnaccepted ? (
              <button
                className={lineItemAcceptBtnClass}
                type='button'
                onClick={acceptAll}
              >
                <Icon
                  className='size-4 text-[var(--orange-9)]'
                  icon='tabler:circle-check'
                />
                {t`Accept all`}
              </button>
            ) : null}
            <button
              className={lineItemAddRowBtnClass}
              type='button'
              onClick={addRow}
            >
              <Icon className='h-3.5 w-3.5 text-current' icon='tabler:plus' />
              {t`Add Row`}
            </button>
          </div>
        )}
      </div>
      <RowInsertRail
        enabled={canEdit && !isDraggingRow}
        layoutKey={rowIds.join('|')}
        rowCount={rows.length}
        onInsert={insertRow}
      >
        <SortableRows
          ids={rowIds}
          onDragActiveChange={setIsDraggingRow}
          onMove={moveRow}
        >
          <StickyScrollX className='rounded-lg border border-gray-3'>
            <table className='w-full border-collapse text-left text-sm'>
              <thead className='bg-gray-1 text-xs text-gray-11'>
                <tr>
                  {canEdit ? (
                    <th
                      aria-label={t`Reorder`}
                      className='w-8 border border-gray-3 p-1'
                    />
                  ) : null}
                  <th className='min-w-[220px] border border-gray-3 p-3 text-left font-semibold'>
                    Product
                  </th>
                  <th
                    className={cn(
                      amountColumnClass,
                      'border border-gray-3 p-3 text-center font-semibold',
                    )}
                  >
                    Qty
                  </th>
                  <th
                    className={cn(
                      amountColumnClass,
                      'border border-gray-3 p-3 text-center font-semibold',
                    )}
                  >
                    Price
                  </th>
                  {hasDiscountColumn ? (
                    <th
                      className={cn(
                        amountColumnClass,
                        'border border-gray-3 p-3 text-center font-semibold whitespace-nowrap',
                      )}
                    >
                      Discount
                    </th>
                  ) : null}
                  <th
                    className={cn(
                      amountColumnClass,
                      'border border-gray-3 p-3 text-center font-semibold',
                    )}
                  >
                    Subtotal
                  </th>
                  {canEdit && (
                    <th
                      aria-label={t`Actions`}
                      className='w-px border border-gray-3 p-2 whitespace-nowrap'
                    />
                  )}
                </tr>
              </thead>
              <tbody className='bg-surface'>
                {rows.map((item, i) => (
                  <QuoteLineRow
                    autoEdit={canEdit && i === focusRowIndex}
                    canEdit={canEdit}
                    columns={tableColumns}
                    item={item}
                    key={rowIds[i]}
                    productColumn={productColumn}
                    showDiscount={hasDiscountColumn}
                    sortId={rowIds[i]}
                    useApiProduct={useApiProduct}
                    onApprovedChange={(approved) => setRowApproved(i, approved)}
                    onChange={(key, value) => updateCell(i, key, value)}
                    onDelete={() => deleteRow(i)}
                    onSelectProduct={(code) => selectProduct(i, code)}
                  />
                ))}
              </tbody>
            </table>
          </StickyScrollX>
        </SortableRows>
      </RowInsertRail>
    </div>
  )
}

const cellInputClass =
  'w-full rounded-md border border-transparent bg-transparent px-1 py-0.5 text-inherit outline-none transition-colors hover:border-gray-4 hover:bg-gray-1 focus:border-[var(--primary-6)] focus:bg-surface'

function HoverValue({
  align = 'left',
  canEdit,
  className,
  defaultOpen = false,
  display,
  fill = false,
  input,
  keepOpenOnPortal = false,
}: {
  align?: 'center' | 'left' | 'right'
  canEdit: boolean
  className?: string
  /** Mount already in edit mode (e.g. a freshly added row). */
  defaultOpen?: boolean
  display: ReactNode
  /** Stretch to the cell so sibling actions stay in a fixed column. */
  fill?: boolean
  /** Combobox / popover menus render in a portal — don't close on their clicks. */
  keepOpenOnPortal?: boolean
  input: (close: () => void) => ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  // Also open when an already-mounted cell becomes the new-row target.
  useEffect(() => {
    if (defaultOpen && canEdit) setOpen(true)
  }, [canEdit, defaultOpen])
  const rootRef = useRef<HTMLDivElement>(null)
  const close = () => setOpen(false)

  useEffect(() => {
    if (!open) return
    const isInsidePortal = (node: EventTarget | null) => {
      if (!(node instanceof Element)) return false
      return Boolean(
        node.closest(
          '[data-combobox-dropdown], [data-dates-dropdown], .mantine-Popover-dropdown, .mantine-Combobox-dropdown',
        ),
      )
    }
    const onPointerDown = (event: PointerEvent) => {
      const path = event.composedPath()
      if (rootRef.current && path.includes(rootRef.current)) return
      if (keepOpenOnPortal && path.some(isInsidePortal)) return
      setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    // Defer so the click that opened edit mode doesn't immediately close it,
    // and so Combobox portal mount isn't treated as an outside click.
    const timer = window.setTimeout(() => {
      document.addEventListener('pointerdown', onPointerDown, true)
      document.addEventListener('keydown', onKeyDown)
    }, 0)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [keepOpenOnPortal, open])

  if (!canEdit) {
    return (
      <div
        className={cn(
          'w-full min-w-0',
          align === 'center' && 'text-center',
          align === 'right' && 'text-right',
          align === 'left' && 'text-left',
          className,
        )}
      >
        {display}
      </div>
    )
  }

  if (open) {
    return (
      <div
        ref={rootRef}
        className={cn(
          'min-w-0',
          fill && 'w-full',
          align === 'center' && 'mx-auto w-full text-center',
          align === 'right' && 'w-full text-right',
        )}
      >
        {input(close)}
      </div>
    )
  }

  return (
    <div
      ref={rootRef}
      className={cn(
        'group relative flex min-w-0 gap-1',
        fill || align === 'left' ? 'items-start' : 'items-center',
        fill && 'w-full flex-1',
        align === 'right' && 'w-full justify-end pr-6',
        align === 'center' && 'w-full justify-center',
        align === 'left' && !fill && 'w-full',
      )}
    >
      <button
        type='button'
        className={cn(
          'min-w-0 cursor-text border-0 bg-transparent p-0 text-inherit',
          fill && 'flex-1 text-left',
          align === 'right' && 'text-right',
          align === 'center' && 'text-center',
          className,
        )}
        onClick={() => setOpen(true)}
      >
        {display}
      </button>
      {/* Absolute pencil keeps centered/right values visually aligned. */}
      <button
        aria-label='Edit'
        type='button'
        className={cn(
          'inline-flex size-6 shrink-0 items-center justify-center rounded-md text-gray-8 opacity-0 transition-all group-hover:opacity-100 hover:bg-gray-3 hover:text-gray-12 active:scale-95',
          align === 'center' || align === 'right'
            ? 'absolute top-1/2 right-0 -translate-y-1/2'
            : '',
        )}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setOpen(true)
        }}
      >
        <Icon className='size-3.5' icon='lucide:pencil' />
      </button>
    </div>
  )
}

function QuoteLineRow({
  autoEdit = false,
  canEdit,
  columns = [],
  item,
  productColumn,
  showDiscount = false,
  sortId,
  useApiProduct,
  onApprovedChange,
  onChange,
  onDelete,
  onSelectProduct,
}: {
  /** Freshly added row: scroll into view and open the Product editor. */
  autoEdit?: boolean
  canEdit: boolean
  columns?: any[]
  item: Record<string, any>
  productColumn: any
  showDiscount?: boolean
  sortId: string
  useApiProduct: boolean
  onApprovedChange: (approved: boolean) => void
  onChange: (key: string, value: any) => void
  onDelete: () => void
  onSelectProduct: (code: string | null) => void | Promise<void>
}) {
  const { t } = useLingui()
  const { handle, rowProps } = useSortableRow(sortId, !canEdit)
  const rowElRef = useRef<HTMLTableRowElement | null>(null)

  useEffect(() => {
    if (!autoEdit) return
    const frame = window.requestAnimationFrame(() =>
      rowElRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
    )
    return () => window.cancelAnimationFrame(frame)
  }, [autoEdit])
  const approved = Boolean(item._approved)
  const needsReview =
    item['Needs Engineering Review'] === true ||
    item['Needs Engineering Review'] === 1 ||
    String(item['Needs Engineering Review'] || '')
      .trim()
      .toLowerCase() === 'true'
  const noteText = String(item.Note || '').trim()
  // Show warning until the user Approves this row.
  const showWarning =
    !approved && !item._hideNote && (Boolean(noteText) || needsReview)

  const productLabel =
    String(productColumn?.name || productColumn?.label || '') || t`Product`
  const lineGross = computeLineGross(item, columns)
  const lineSubtotal = computeLineSubtotal(item, columns)
  const lineSaved = roundMoney(Math.max(0, lineGross - lineSubtotal))
  const hasLineSavings = lineSaved > 0
  const description = String(item.Description || '').trim()
  const discountMode = resolveDiscountMode(item)
  const discountDisplay = (() => {
    const resolved = resolveLineFieldValue(item, columns, 'Discount')
    const num = parseLooseNumber(
      !isEmptyValue(resolved) ? resolved : item.Discount,
    )
    if (!Number.isFinite(num)) return '0'
    return Number.isInteger(num) ? String(num) : String(num)
  })()

  const setDiscountMode = (mode: DiscountMode) => {
    onChange('_discountMode', mode)
  }

  return (
    <tr
      className={cn('group', rowProps.className)}
      style={rowProps.style}
      ref={(node) => {
        rowProps.ref(node)
        rowElRef.current = node
      }}
    >
      {canEdit ? (
        <td className='w-8 border border-gray-3 p-1 text-center align-top'>
          <div className='pt-2'>{handle}</div>
        </td>
      ) : null}
      <td className='min-w-[220px] border border-gray-3 p-3 text-left align-top'>
        <div className='flex min-w-0 flex-col items-start gap-1 text-left'>
          <div className='flex w-full items-start gap-2'>
            <HoverValue
              canEdit={canEdit}
              className='block w-full text-left'
              defaultOpen={autoEdit}
              keepOpenOnPortal={useApiProduct}
              fill
              display={
                <span className='block text-left font-semibold break-words text-[var(--primary-11)]'>
                  {item.Product || 'NA'}
                </span>
              }
              input={(close) =>
                useApiProduct ? (
                  <div className='w-full max-w-[280px] min-w-0'>
                    <ApiCatalogSelect
                      col={productColumn}
                      value={item.Product}
                      autoOpen
                      compact
                      onSelectProduct={async (code) => {
                        await onSelectProduct(code)
                        close()
                      }}
                    />
                  </div>
                ) : (
                  <input
                    aria-label={productLabel}
                    className={cn(cellInputClass, 'max-w-full font-semibold')}
                    value={item.Product ?? ''}
                    autoFocus
                    onChange={(event) =>
                      onChange('Product', event.target.value)
                    }
                  />
                )
              }
            />
            {canEdit ? (
              <Tooltip
                className='mt-0.5 shrink-0 self-start'
                content={approved ? t`Accepted — click to undo` : t`Accept`}
              >
                <button
                  aria-label={t`Accept line item`}
                  aria-pressed={approved}
                  type='button'
                  className={cn(
                    'inline-flex size-6 cursor-pointer items-center justify-center rounded-full transition-all hover:scale-110 active:scale-95',
                    approved
                      ? 'text-green-9 hover:text-green-10'
                      : 'text-[var(--orange-9)] hover:text-[var(--orange-10)]',
                  )}
                  onClick={() => onApprovedChange(!approved)}
                >
                  <Icon
                    className='size-5'
                    icon={
                      approved
                        ? 'tabler:circle-check-filled'
                        : 'tabler:circle-check'
                    }
                  />
                </button>
              </Tooltip>
            ) : null}
          </div>
          {description ? (
            <HoverValue
              canEdit={canEdit}
              className='text-left text-xs text-gray-11'
              display={
                <span className='text-xs break-words text-gray-11'>
                  {description}
                </span>
              }
              input={() => (
                <textarea
                  aria-label={t`Description`}
                  rows={2}
                  value={item.Description ?? ''}
                  autoFocus
                  className={cn(
                    cellInputClass,
                    'min-h-[2.5rem] w-full resize-y text-xs break-words',
                  )}
                  onChange={(event) =>
                    onChange('Description', event.target.value)
                  }
                />
              )}
            />
          ) : canEdit ? (
            <HoverValue
              canEdit={canEdit}
              className='text-left text-xs text-gray-9'
              display={<span className='text-xs text-gray-9'>NA</span>}
              input={() => (
                <textarea
                  aria-label={t`Description`}
                  rows={2}
                  value={item.Description ?? ''}
                  autoFocus
                  className={cn(
                    cellInputClass,
                    'min-h-[2.5rem] w-full resize-y text-xs break-words',
                  )}
                  onChange={(event) =>
                    onChange('Description', event.target.value)
                  }
                />
              )}
            />
          ) : (
            <span className='text-xs text-gray-9'>NA</span>
          )}
          {showWarning && needsReview ? (
            <div className='mt-1 flex items-center gap-1.5 text-xs font-semibold text-red-11'>
              <span className='inline-block size-2.5 shrink-0 bg-red-9' />
              {t`needs engineering review`}
            </div>
          ) : null}
          {showWarning && noteText ? (
            <p className='text-xs leading-5 break-words text-gray-9'>
              {noteText}
            </p>
          ) : null}
        </div>
      </td>
      <td
        className={cn(
          amountColumnClass,
          'border border-gray-3 p-3 text-center align-top text-gray-12',
        )}
      >
        <HoverValue
          align='center'
          canEdit={canEdit}
          className='w-full text-center'
          display={
            <span className='inline-block tabular-nums'>
              {formatQty(item.Qty)}
            </span>
          }
          input={() => (
            <input
              aria-label={t`Qty`}
              className={cn(cellInputClass, 'text-center')}
              inputMode='numeric'
              autoFocus
              value={
                item.Qty === '' || item.Qty == null ? '' : formatQty(item.Qty)
              }
              onChange={(event) => onChange('Qty', event.target.value)}
            />
          )}
        />
      </td>
      <td
        className={cn(
          amountColumnClass,
          'border border-gray-3 p-3 text-center align-top text-gray-12',
        )}
      >
        <HoverValue
          align='center'
          canEdit={canEdit}
          className='w-full text-center'
          display={
            <span className='inline-block tabular-nums'>
              ${toMoney(item.Price)}
            </span>
          }
          input={() => (
            <input
              aria-label={t`Price`}
              className={cn(cellInputClass, 'text-center')}
              inputMode='decimal'
              value={item.Price ?? ''}
              autoFocus
              onChange={(event) => onChange('Price', event.target.value)}
            />
          )}
        />
      </td>
      {showDiscount ? (
        <td
          className={cn(
            amountColumnClass,
            'border border-gray-3 p-3 text-center align-top text-gray-12',
          )}
        >
          <HoverValue
            align='center'
            canEdit={canEdit}
            className='w-full text-center'
            display={
              <span className='inline-block tabular-nums'>
                {discountMode === 'amount'
                  ? `$${discountDisplay}`
                  : `${discountDisplay}%`}
              </span>
            }
            input={() => (
              <div className='inline-flex h-8 items-stretch overflow-hidden rounded-md border border-gray-4 bg-surface'>
                <button
                  aria-label={t`Percent discount`}
                  aria-pressed={discountMode === 'percent'}
                  className={cn(
                    'inline-flex w-7 shrink-0 items-center justify-center text-xs font-bold transition-colors',
                    discountMode === 'percent'
                      ? 'bg-[var(--primary-9)] text-white'
                      : 'bg-gray-1 text-gray-10 hover:bg-gray-2',
                  )}
                  type='button'
                  onClick={() => setDiscountMode('percent')}
                >
                  %
                </button>
                <button
                  aria-label={t`Dollar discount`}
                  aria-pressed={discountMode === 'amount'}
                  className={cn(
                    'inline-flex w-7 shrink-0 items-center justify-center border-l border-gray-4 text-xs font-bold transition-colors',
                    discountMode === 'amount'
                      ? 'bg-[var(--primary-9)] text-white'
                      : 'bg-gray-1 text-gray-10 hover:bg-gray-2',
                  )}
                  type='button'
                  onClick={() => setDiscountMode('amount')}
                >
                  $
                </button>
                <input
                  aria-label={t`Discount`}
                  className='w-14 min-w-0 border-l border-gray-4 bg-transparent px-1.5 text-center text-sm text-gray-12 tabular-nums outline-none focus:bg-[var(--primary-1)]'
                  inputMode='decimal'
                  autoFocus
                  value={
                    item.Discount === '' || item.Discount == null
                      ? ''
                      : item.Discount
                  }
                  onChange={(event) => onChange('Discount', event.target.value)}
                />
              </div>
            )}
          />
        </td>
      ) : null}
      <td
        className={cn(
          amountColumnClass,
          'border border-gray-3 p-3 text-center align-top',
        )}
      >
        {hasLineSavings ? (
          <div className='flex flex-col items-center gap-0.5'>
            <span className='text-xs text-gray-9 tabular-nums line-through'>
              ${toMoney(lineGross)}
            </span>
            <span className='font-bold text-gray-12 tabular-nums'>
              ${toMoney(lineSubtotal)}
            </span>
            <span className='text-xs font-semibold text-green-11 tabular-nums'>
              {t`Saved`} ${toMoney(lineSaved)}
            </span>
          </div>
        ) : (
          <span className='inline-block font-semibold text-gray-12 tabular-nums'>
            ${toMoney(lineSubtotal)}
          </span>
        )}
      </td>
      {canEdit && (
        <td className='w-px border border-gray-3 p-2 text-right align-top whitespace-nowrap'>
          <div className='inline-flex items-center justify-end gap-1'>
            <Tooltip content={t`Delete row`}>
              <button
                aria-label={t`Delete row`}
                className='inline-flex size-7 cursor-pointer items-center justify-center rounded-md p-1 text-red-9 opacity-60 transition-all group-hover:opacity-100 hover:bg-red-2 active:scale-95'
                type='button'
                onClick={onDelete}
              >
                <Icon className='h-4 w-4' icon='tabler:trash' />
              </button>
            </Tooltip>
          </div>
        </td>
      )}
    </tr>
  )
}

export default QuoteLineItemsTable
