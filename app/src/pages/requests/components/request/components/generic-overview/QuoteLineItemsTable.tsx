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

const computeLineSubtotal = (row: Record<string, any>, columns: any[] = []) => {
  const qty = parseLooseNumber(resolveLineFieldValue(row, columns, 'Qty'))
  const price = parseLooseNumber(resolveLineFieldValue(row, columns, 'Price'))
  if (Number.isFinite(qty) && Number.isFinite(price)) {
    return roundMoney(qty * price)
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

  const needsReview = row?.['Needs Engineering Review']
  if (needsReview != null) next['Needs Engineering Review'] = needsReview

  const noteValue = resolveLineFieldValue(row, columns, 'Note')
  if (!isEmptyValue(noteValue)) next.Note = noteValue
  else if (!isEmptyValue(row?.Note)) next.Note = row.Note

  const categoryValue = resolveLineFieldValue(row, columns, 'Category')
  if (!isEmptyValue(categoryValue)) next.Category = categoryValue
  else if (!isEmptyValue(row?.Category)) next.Category = row.Category
  ;(['Product', 'Description', 'Qty', 'Price'] as const).forEach(
    (canonical) => {
      const value = resolveLineFieldValue(row, columns, canonical)
      next[canonical] = value
      const col = findColumnForCanonical(columns, canonical)
      const blockedIds = new Set([
        'Product',
        'Description',
        'Qty',
        'Price',
        'Subtotal',
        'Note',
        'Category',
      ])
      blockedIds.delete(canonical)
      if (col?.id && !blockedIds.has(String(col.id))) next[col.id] = value
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

/** Persist only form column ids (plus meta) — avoids name/UUID scramble. */
const toFormTableRows = (rows: Record<string, any>[], columns: any[]) =>
  rows.map((row) => {
    const mapped: Record<string, any> = {
      _rowId: row._rowId || generateRowId(),
    }
    if (row._approved != null) mapped._approved = row._approved
    if (row._hideNote != null) mapped._hideNote = row._hideNote
    // Keep warning payload so Approve can hide it after reload/sync.
    if (!isEmptyValue(row.Note)) mapped.Note = row.Note
    if (row['Needs Engineering Review'] != null) {
      mapped['Needs Engineering Review'] = row['Needs Engineering Review']
    }
    if (!isEmptyValue(row.Category)) mapped.Category = row.Category

    if (!columns.length) {
      ;(
        ['Product', 'Description', 'Qty', 'Price', 'Subtotal', 'Note'] as const
      ).forEach((key) => {
        mapped[key] = row[key]
      })
      return mapped
    }

    columns.forEach((col) => {
      const title = columnTitle(col)
      let canonical: string | null = null
      for (const key of Object.keys(LINE_FIELD_ALIASES)) {
        if (headingMatchesAliases(title, LINE_FIELD_ALIASES[key])) {
          canonical = key
          break
        }
      }
      if (canonical) {
        mapped[col.id] = row[canonical] ?? row[col.id] ?? ''
      } else if (!isEmptyValue(row[col.id])) {
        mapped[col.id] = row[col.id]
      } else {
        mapped[col.id] = ''
      }
    })
    return mapped
  })

const applyLineField = (
  row: Record<string, any>,
  canonical: string,
  value: any,
  columns: any[] = [],
) => {
  const next = { ...row, [canonical]: value }
  const col = findColumnForCanonical(columns, canonical)
  if (col?.id) next[col.id] = value
  return next
}

const emptyLineRow = (): Record<string, any> => ({
  _rowId: generateRowId(),
  Category: '',
  Description: '',
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

export const buildQuoteTotals = (
  rows: Record<string, any>[],
  freight: number,
  taxRate: number,
  columns: any[] = [],
) => {
  const subtotal = sumLineSubtotals(rows, columns)
  const hst = roundMoney((subtotal + freight) * taxRate)
  const total = roundMoney(subtotal + freight + hst)
  return { freight: roundMoney(freight), hst, subtotal, total }
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
  freight: number
  hst: number
  subtotal: number
  total: number
}

interface Props {
  items: Record<string, any>[]
  freight?: number
  readOnly?: boolean
  taxRate?: number
  title?: string
  workflow?: any
  onFieldChange?: (fieldId: string, value: any) => void
  onTotalsChange?: (totals: QuoteTotals) => void
}

const QuoteLineItemsTable = ({
  freight = 0,
  items,
  readOnly = false,
  taxRate = 0.13,
  title,
  workflow,
  onFieldChange,
  onTotalsChange,
}: Props) => {
  const { t } = useLingui()

  const tableField = useMemo(
    () =>
      collectFormTableFields(workflow).find((field) =>
        isLineItemHeading(getFieldHeading(field)),
      ),
    [workflow],
  )
  const tableColumns = useMemo(
    () => tableField?.settings?.specific?.tableColumns || [],
    [tableField],
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
    setRows(normalizedItems.length ? normalizedItems : [])
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync on content fingerprint only
  }, [itemsKey])

  useEffect(() => {
    if (readOnly) return
    if (normalizedItems.length > 0) return
    if (rows.length > 0) return
    setRows([emptyLineRow()])
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once when quote has no lines
  }, [normalizedItems, readOnly])

  const persist = (next: Record<string, any>[]) => {
    const normalized = normalizeLineItemRows(next, tableColumns)
    const totals = buildQuoteTotals(normalized, freight, taxRate, tableColumns)
    setRows(normalized)
    onTotalsChange?.(totals)
    if (!onFieldChange) return
    if (tableField) {
      onFieldChange(
        getFieldId(tableField),
        toFormTableRows(normalized, tableColumns),
      )
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
    )
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

  const approveRow = (index: number) => {
    persist(
      rowsRef.current.map((row, i) =>
        i === index ? { ...row, _approved: true, _hideNote: true } : row,
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

  const addRow = () => {
    persist([...rowsRef.current, emptyLineRow()])
  }

  const deleteRow = (index: number) => {
    const next = rowsRef.current.filter((_, i) => i !== index)
    persist(next.length > 0 ? next : [emptyLineRow()])
  }

  const canEdit = !readOnly
  const hasUnaccepted = rows.some((row) => !row._approved)

  if (!rows.length) return null

  return (
    <div className='flex flex-col gap-3'>
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
            {hasUnaccepted ? (
              <button
                className='inline-flex cursor-pointer items-center rounded-md border border-orange-7 bg-orange-2 px-2 py-1 text-[11px] font-semibold text-orange-11 transition-all hover:bg-orange-3 active:scale-95'
                type='button'
                onClick={acceptAll}
              >
                {t`Accept all`}
              </button>
            ) : null}
            <button
              className='inline-flex cursor-pointer items-center gap-1 rounded-md border border-[var(--primary-4)] bg-[var(--primary-1)] px-2 py-1 text-[11px] font-bold text-[var(--primary-11)] transition-colors hover:bg-[var(--primary-2)] active:scale-95'
              type='button'
              onClick={addRow}
            >
              <Icon className='h-3.5 w-3.5' icon='tabler:plus' />
              {t`Add Row`}
            </button>
          </div>
        )}
      </div>
      <div className='overflow-x-auto rounded-lg border border-gray-3'>
        <table className='w-full border-collapse text-left text-sm'>
          <thead className='bg-gray-1 text-xs text-gray-11'>
            <tr>
              <th className='min-w-[220px] border border-gray-3 p-3 text-center font-semibold'>
                Product
              </th>
              <th className='w-24 border border-gray-3 p-3 text-center font-semibold'>
                Qty
              </th>
              <th className='w-28 border border-gray-3 p-3 text-center font-semibold'>
                Price
              </th>
              <th className='w-28 border border-gray-3 p-3 text-center font-semibold'>
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
                canEdit={canEdit}
                item={item}
                key={item._rowId || i}
                productColumn={productColumn}
                useApiProduct={useApiProduct}
                onApprove={() => approveRow(i)}
                onChange={(key, value) => updateCell(i, key, value)}
                onDelete={() => deleteRow(i)}
                onSelectProduct={(code) => selectProduct(i, code)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const cellInputClass =
  'w-full rounded-md border border-transparent bg-transparent px-1 py-0.5 text-inherit outline-none transition-colors hover:border-gray-4 hover:bg-gray-1 focus:border-[var(--primary-6)] focus:bg-surface'

function HoverValue({
  align = 'left',
  canEdit,
  className,
  display,
  fill = false,
  input,
  keepOpenOnPortal = false,
}: {
  align?: 'center' | 'left' | 'right'
  canEdit: boolean
  className?: string
  display: ReactNode
  /** Stretch to the cell so sibling actions stay in a fixed column. */
  fill?: boolean
  /** Combobox / popover menus render in a portal — don't close on their clicks. */
  keepOpenOnPortal?: boolean
  input: (close: () => void) => ReactNode
}) {
  const [open, setOpen] = useState(false)
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

  if (!canEdit) return <>{display}</>

  return (
    <div
      ref={rootRef}
      className={cn(
        'group relative min-w-0',
        open ? 'block w-full' : 'inline-flex max-w-full items-center',
        !open && fill && 'min-w-0 flex-1',
        !open && align === 'right' && 'w-full justify-end',
        !open && align === 'center' && 'w-full justify-center',
      )}
    >
      {open ? (
        input(close)
      ) : (
        <>
          <button
            type='button'
            className={cn(
              'min-w-0 cursor-text border-0 bg-transparent p-0 text-inherit',
              align === 'right' && 'text-right',
              align === 'center' && 'text-center',
              className,
            )}
            onClick={() => setOpen(true)}
          >
            {display}
          </button>
          <button
            aria-label='Edit'
            type='button'
            className={cn(
              'absolute top-1/2 z-10 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-gray-8 opacity-0 transition-all group-hover:opacity-100 hover:bg-gray-3 hover:text-gray-12 active:scale-95',
              align === 'right'
                ? 'right-full mr-1'
                : fill
                  ? 'right-0'
                  : 'left-full ml-1',
            )}
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              setOpen(true)
            }}
          >
            <Icon className='size-3.5' icon='lucide:pencil' />
          </button>
        </>
      )}
    </div>
  )
}

function QuoteLineRow({
  canEdit,
  item,
  productColumn,
  useApiProduct,
  onApprove,
  onChange,
  onDelete,
  onSelectProduct,
}: {
  canEdit: boolean
  item: Record<string, any>
  productColumn: any
  useApiProduct: boolean
  onApprove: () => void
  onChange: (key: string, value: any) => void
  onDelete: () => void
  onSelectProduct: (code: string | null) => void | Promise<void>
}) {
  const { t } = useLingui()
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
  const lineSubtotal = computeLineSubtotal(item)
  const description = String(item.Description || '').trim()

  return (
    <tr className='group'>
      <td className='min-w-[220px] border border-gray-3 p-3 text-left align-top'>
        <div className='flex min-w-0 flex-col items-start gap-1 text-left'>
          <div className='flex w-full items-start gap-2'>
            <HoverValue
              canEdit={canEdit}
              className='block w-full text-left'
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
              <div
                className={cn(
                  'mt-0.5 shrink-0 self-start',
                  approved && 'flex w-6 justify-center',
                )}
              >
                {approved ? (
                  <Tooltip content={t`Accepted`}>
                    <span
                      aria-label={t`Accepted`}
                      className='inline-flex size-6 items-center justify-center rounded-full bg-green-3 text-green-11'
                    >
                      <Icon className='h-3.5 w-3.5' icon='tabler:check' />
                    </span>
                  </Tooltip>
                ) : (
                  <button
                    className='inline-flex shrink-0 cursor-pointer items-center rounded-md border border-orange-7 bg-orange-2 px-2 py-0.5 text-[11px] font-semibold text-orange-11 transition-all hover:bg-orange-3 active:scale-95'
                    type='button'
                    onClick={onApprove}
                  >
                    {t`Accept`}
                  </button>
                )}
              </div>
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
      <td className='w-24 border border-gray-3 p-3 text-center align-top text-gray-12'>
        <HoverValue
          align='center'
          canEdit={canEdit}
          className='text-center'
          display={<span>{formatQty(item.Qty)}</span>}
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
      <td className='w-28 border border-gray-3 p-3 text-right align-top text-gray-12'>
        <HoverValue
          align='right'
          canEdit={canEdit}
          className='block w-full text-right'
          display={
            <span className='block text-right'>${toMoney(item.Price)}</span>
          }
          input={() => (
            <input
              aria-label={t`Price`}
              className={cn(cellInputClass, 'text-right')}
              inputMode='decimal'
              value={item.Price ?? ''}
              autoFocus
              onChange={(event) => onChange('Price', event.target.value)}
            />
          )}
        />
      </td>
      <td className='w-28 border border-gray-3 p-3 text-right align-top'>
        <span className='font-semibold text-gray-12'>
          ${toMoney(lineSubtotal)}
        </span>
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
