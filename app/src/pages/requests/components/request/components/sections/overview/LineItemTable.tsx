import { Plus, Trash2 } from 'lucide-react'
import { type CSSProperties } from 'react'
import { useLingui } from '@lingui/react/macro'
import cn from '@/utils/cn'

// --- Helpers passed or redefined ---
const isLineItemAmountColumn = (key: string) => {
  const normalizedKey = key.toLowerCase().replace(/[\s_-]+/g, '')
  return (
    normalizedKey === 'lineamount' ||
    normalizedKey === 'amount' ||
    normalizedKey === 'totalamount'
  )
}

const getLineItemTextClass = (isNumeric = false) =>
  cn(
    'block w-full overflow-hidden text-ellipsis whitespace-nowrap',
    isNumeric && 'text-right',
  )

const getRawVal = (obj: any, pathKey: string) => {
  if (
    obj[pathKey] &&
    typeof obj[pathKey] === 'object' &&
    'Invoice Value' in obj[pathKey]
  ) {
    return obj[pathKey]['Invoice Value']
  }
  return obj[pathKey]
}

const getLineItemAmount = (item: any): any => {
  if (!item || typeof item !== 'object') return 0
  const keys = [
    'Amount',
    'Line Amount',
    'line amount',
    'LineAmount',
    'total',
    'amount',
    'line_amount',
    'lineAmount',
    'total_amount',
    'extended',
    'extended_amount',
  ]
  for (const k of keys) {
    const v = getRawVal(item, k)
    if (v !== undefined && v !== null && v !== '') return v
  }
  const qtyVal =
    getRawVal(item, 'Quantity') ??
    getRawVal(item, 'quantity') ??
    getRawVal(item, 'Qty') ??
    getRawVal(item, 'qty')
  const priceVal =
    getRawVal(item, 'Price') ??
    getRawVal(item, 'rate') ??
    getRawVal(item, 'unit_price') ??
    getRawVal(item, 'price')
  const qNum = Number.parseFloat(String(qtyVal).replace(/[^0-9.-]+/g, ''))
  const pNum = Number.parseFloat(String(priceVal).replace(/[^0-9.-]+/g, ''))
  if (!Number.isNaN(qNum) && !Number.isNaN(pNum)) {
    return (qNum * pNum).toFixed(2)
  }
  return 0
}

const parseLineNumber = (value: any): number | null => {
  if (value === undefined || value === null || value === '') return null
  const num = Number.parseFloat(String(value).replace(/[^0-9.-]+/g, ''))
  return Number.isNaN(num) ? null : num
}

const descriptionSimilarity = (left: string, right: string): number => {
  const a = left.trim().toLowerCase()
  const b = right.trim().toLowerCase()
  if (!a || !b) return 0
  if (a === b) return 100
  if (a.includes(b) || b.includes(a)) return 85
  const tokensA = new Set(a.split(/\s+/).filter(Boolean))
  const tokensB = new Set(b.split(/\s+/).filter(Boolean))
  if (tokensA.size === 0 || tokensB.size === 0) return 0
  let shared = 0
  tokensA.forEach((token) => {
    if (tokensB.has(token)) shared += 1
  })
  return Math.round((shared / Math.max(tokensA.size + tokensB.size - shared, 1)) * 100)
}

const numberMatchScore = (left: number | null, right: number | null): number | null => {
  if (left === null && right === null) return null
  if (left === null || right === null) return 0
  if (right === 0) return left === 0 ? 100 : 0
  const delta = Math.abs(left - right) / Math.abs(right)
  if (delta <= 0.01) return 100
  if (delta <= 0.05) return 80
  return 0
}

const readLinePart = (
  item: any,
  kind: 'description' | 'qty' | 'rate' | 'amount',
): string => {
  const key =
    kind === 'description'
      ? 'Description'
      : kind === 'qty'
        ? 'Qty'
        : kind === 'rate'
          ? 'Price'
          : 'Amount'
  const direct = getRawVal(item, key)
  if (direct !== undefined && direct !== null && direct !== '') return String(direct)
  const aliases =
    kind === 'description'
      ? ['description', 'item_description', 'Material Description', 'item', 'name']
      : kind === 'qty'
        ? ['quantity', 'Quantity', 'qty', 'Order Quantity']
        : kind === 'rate'
          ? ['price', 'rate', 'unit_price', 'Unit Cost', 'Net Price']
          : ['amount', 'line_amount', 'Line Amount', 'Extended', 'Net Value']
  for (const alias of aliases) {
    const value = getRawVal(item, alias)
    if (value !== undefined && value !== null && value !== '') return String(value)
  }
  return ''
}

const scoreLineAgainstPo = (invoiceItem: any, poLines: any[], index: number): number | null => {
  if (!Array.isArray(poLines) || poLines.length === 0) return null
  const invoiceDesc = readLinePart(invoiceItem, 'description')
  let best = index >= 0 && index < poLines.length ? poLines[index] : poLines[0]
  let bestSim = descriptionSimilarity(invoiceDesc, readLinePart(best, 'description'))
  poLines.forEach((poLine) => {
    const sim = descriptionSimilarity(invoiceDesc, readLinePart(poLine, 'description'))
    if (sim > bestSim) {
      best = poLine
      bestSim = sim
    }
  })
  const parts = [
    invoiceDesc || readLinePart(best, 'description') ? bestSim : null,
    numberMatchScore(
      parseLineNumber(readLinePart(invoiceItem, 'qty')),
      parseLineNumber(readLinePart(best, 'qty')),
    ),
    numberMatchScore(
      parseLineNumber(readLinePart(invoiceItem, 'rate')),
      parseLineNumber(readLinePart(best, 'rate')),
    ),
    numberMatchScore(
      parseLineNumber(readLinePart(invoiceItem, 'amount')),
      parseLineNumber(readLinePart(best, 'amount')),
    ),
  ].filter((part): part is number => part !== null)
  if (parts.length === 0) return null
  return Math.round(parts.reduce((sum, part) => sum + part, 0) / parts.length)
}

const formatHeaderLabel = (key: string) => {
  if (isLineItemAmountColumn(key)) {
    return 'Amount'
  }
  return key
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export interface LineItemTableProps {
  agentData: any
  currentScoreWidth: number
  dynamicColumns: string[]
  dynamicWidths: number[]
  formModel: any
  hasAnyScore: boolean
  isCurrentlyProcessing: boolean
  isDynamicTable: boolean
  LINE_ITEM_ACTION_WIDTH: number
  compareLines?: any[]
  skeletonRows: string[]
  atEnd?: boolean
  hideFooter?: boolean
  handleAddItem?: () => void
  handleFieldFocus?: (value: any, field: string) => void
  handleLineItemChange?: (index: number, field: string, value: any) => void
  handleRemoveItem?: (index: number) => void
}

interface ColumnConfig {
  id: string
  isAmount: boolean
  isNumeric: boolean
  type: 'dynamic' | 'description' | 'qty' | 'rate' | 'amount' | 'score' | 'action'
  dynamicIndex?: number
  key?: string
}

export default function LineItemTable({
  agentData,
  atEnd = false,
  compareLines = [],
  currentScoreWidth,
  dynamicColumns,
  dynamicWidths,
  formModel,
  handleAddItem,
  handleFieldFocus,
  handleLineItemChange,
  handleRemoveItem,
  hasAnyScore,
  hideFooter = false,
  isCurrentlyProcessing,
  isDynamicTable,
  LINE_ITEM_ACTION_WIDTH,
  lineItems,
  skeletonRows,
}: LineItemTableProps) {
  const { t } = useLingui()
  const allColumns: ColumnConfig[] = []
  if (isDynamicTable) {
    dynamicColumns.forEach((colKey, idx) => {
      const isNumeric =
        colKey.toLowerCase().includes('qty') ||
        colKey.toLowerCase().includes('quantity') ||
        colKey.toLowerCase().includes('rate') ||
        colKey.toLowerCase().includes('price') ||
        colKey.toLowerCase().includes('amount') ||
        colKey.toLowerCase().includes('total')
      allColumns.push({
        dynamicIndex: idx,
        id: `dynamic-${colKey}-${idx}`,
        isAmount: isLineItemAmountColumn(colKey),
        isNumeric,
        key: colKey,
        type: 'dynamic',
      })
    })
  } else {
    allColumns.push(
      {
        id: 'description',
        type: 'description',
        isNumeric: false,
        isAmount: false,
      },
      { id: 'qty', isAmount: false, isNumeric: true, type: 'qty' },
      { id: 'rate', isAmount: false, isNumeric: true, type: 'rate' },
      { id: 'amount', isAmount: true, isNumeric: true, type: 'amount' },
    )
  }

  if (hasAnyScore) {
    allColumns.push({
      id: 'score',
      type: 'score',
      isNumeric: true,
      isAmount: false,
    })
  }
  if (handleAddItem || handleRemoveItem) {
    allColumns.push({
      id: 'action',
      type: 'action',
      isNumeric: false,
      isAmount: false,
    })
  }

  const getColWidth = (col: ColumnConfig, _idx: number): number => {
    if (col.type === 'action') return LINE_ITEM_ACTION_WIDTH
    if (col.type === 'score') return currentScoreWidth
    if (col.type === 'amount') return 100
    if (col.type === 'dynamic') {
      const dynIdx = col.dynamicIndex ?? 0
      return dynamicWidths[dynIdx] || (col.isNumeric ? 100 : 80)
    }
    // Correct index mappings for static columns to match dynamicWidths computed in Overview.tsx
    // (index 1 is description, index 2 is quantity, index 3 is rate)
    if (col.type === 'description') return dynamicWidths[1] || 140
    if (col.type === 'qty') return dynamicWidths[2] || 90
    if (col.type === 'rate') return dynamicWidths[3] || 100
    return 100
  }

  const getColStyleAndClass = (i: number, bgClass = 'bg-surface') => {
    const col = allColumns[i]
    const isStickyLeft = i < 3
    const isStickyRight = i >= 3 && i >= allColumns.length - 3
    const isLastCol = i === allColumns.length - 1
    const isAmount = col.type === 'amount' || col.isAmount

    const isAction = col.type === 'action'
    const className = cn(
      isAction
        ? 'p-1 text-center'
        : 'px-3 py-2 text-[11px] font-semibold text-[var(--gray-11)]',
      col.isNumeric && 'text-right',
      'border-b border-[var(--gray-3)]',
      !isLastCol && 'border-r border-[var(--gray-3)]',
      isAmount && !atEnd && 'border-l border-[var(--gray-3)]',
      (isStickyLeft || isStickyRight) && cn('sticky z-20', bgClass),
    )

    const style: CSSProperties = {}

    if (isStickyLeft || isStickyRight) {
      const width = getColWidth(col, i)
      const isGrowable = i === 2 || col.type === 'amount' || col.isAmount

      style.width = width
      style.minWidth = width
      if (!isGrowable) {
        style.maxWidth = width
      }
    }

    if (isStickyLeft) {
      let left = 0
      for (let j = 0; j < i; j++) {
        left += getColWidth(allColumns[j], j)
      }
      style.left = left
    } else if (isStickyRight) {
      let right = 0
      for (let j = i + 1; j < allColumns.length; j++) {
        right += getColWidth(allColumns[j], j)
      }
      style.right = right
    }

    return { className, style }
  }

  const getColCellConfig = (i: number, bgClass: string, borderT = false) => {
    const col = allColumns[i]
    const isStickyLeft = i < 3
    const isStickyRight = i >= 3 && i >= allColumns.length - 3
    const isLastCol = i === allColumns.length - 1
    const isAmount = col.type === 'amount' || col.isAmount

    const isAction = col.type === 'action'
    const isScore = col.type === 'score'
    const isQtyOrRate = col.type === 'qty' || col.type === 'rate'

    const className = cn(
      isAction
        ? 'px-2 py-0.5 text-center'
        : isScore
          ? 'px-3 py-2 font-semibold'
          : 'px-2 py-0.5 font-semibold',
      isQtyOrRate ? 'text-[var(--gray-11)]' : 'text-[var(--gray-13)]',
      col.isNumeric && 'text-right',
      borderT
        ? 'border-t border-[var(--gray-3)]'
        : 'border-b border-[var(--gray-3)]',
      !isLastCol && 'border-r border-[var(--gray-3)]',
      isAmount && !atEnd && 'border-l border-[var(--gray-3)]',
      (isStickyLeft || isStickyRight) && cn('sticky z-20', bgClass),
    )

    const style: CSSProperties = {}

    if (isStickyLeft || isStickyRight) {
      const width = getColWidth(col, i)
      const isGrowable = i === 2 || col.type === 'amount' || col.isAmount

      style.width = width
      style.minWidth = width
      if (!isGrowable) {
        style.maxWidth = width
      }
    }

    if (isStickyLeft) {
      let left = 0
      for (let j = 0; j < i; j++) {
        left += getColWidth(allColumns[j], j)
      }
      style.left = left
    } else if (isStickyRight) {
      let right = 0
      for (let j = i + 1; j < allColumns.length; j++) {
        right += getColWidth(allColumns[j], j)
      }
      style.right = right
    }

    return { className, style }
  }

  const getCellVal = (item: any, col: ColumnConfig): string => {
    if (!item || typeof item !== 'object') return ''

    // 1. Direct lookup by key if present
    if (col.key) {
      const direct = getRawVal(item, col.key)
      if (direct !== undefined && direct !== null && direct !== '') {
        return String(direct)
      }
    }

    // 2. Lookup by column group (works for dynamic and static types)
    const keyOrType = (col.key || col.type || '')
      .toLowerCase()
      .replace(/[\s_-]+/g, '')

    // Description Group
    if (
      keyOrType.includes('description') ||
      keyOrType.includes('descriptior') ||
      keyOrType === 'item' ||
      keyOrType === 'desc'
    ) {
      const keys = [
        'Description',
        'description',
        'item_no',
        'itemNo',
        'descriptior',
        'item_description',
        'product_description',
        'details',
        'item',
      ]
      for (const k of keys) {
        const v = getRawVal(item, k)
        if (v !== undefined && v !== null && v !== '') return String(v)
      }
    }

    // Qty Group
    if (keyOrType.includes('qty') || keyOrType.includes('quantity')) {
      const keys = [
        'Qty',
        'Quantity',
        'quantity',
        'qty',
        'qty_invoiced',
        'invoiced_qty',
        'quantity_invoiced',
        'count',
        'units',
      ]
      for (const k of keys) {
        const v = getRawVal(item, k)
        if (v !== undefined && v !== null && v !== '') return String(v)
      }
    }

    // Price / Rate Group
    if (
      keyOrType.includes('price') ||
      keyOrType.includes('rate') ||
      keyOrType.includes('cost')
    ) {
      const keys = [
        'Price',
        'rate',
        'unit_price',
        'price',
        'unit_rate',
        'unitprice',
        'unitcost',
        'cost',
      ]
      for (const k of keys) {
        const v = getRawVal(item, k)
        if (v !== undefined && v !== null && v !== '') return String(v)
      }
    }

    // Amount Group
    if (isLineItemAmountColumn(col.key || col.type)) {
      const keys = [
        'Amount',
        'Line Amount',
        'line amount',
        'LineAmount',
        'total',
        'amount',
        'line_amount',
        'lineAmount',
        'total_amount',
        'extended',
        'extended_amount',
      ]
      for (const k of keys) {
        const v = getRawVal(item, k)
        if (v !== undefined && v !== null && v !== '') return String(v)
      }
      const calcAmt = getLineItemAmount(item)
      if (
        calcAmt !== undefined &&
        calcAmt !== null &&
        calcAmt !== 0 &&
        calcAmt !== '0'
      ) {
        return String(calcAmt)
      }
    }

    // Line No Group
    if (keyOrType.includes('line')) {
      const keys = [
        'Line No',
        'Line',
        'line_no',
        'line',
        'line_number',
        'seq_no',
        'sr_no',
        'sl_no',
      ]
      for (const k of keys) {
        const v = getRawVal(item, k)
        if (v !== undefined && v !== null && v !== '') return String(v)
      }
    }

    // Fallbacks for static columns
    if (col.type === 'description') {
      const val =
        getRawVal(item, 'Description') ??
        getRawVal(item, 'description') ??
        getRawVal(item, 'item_no') ??
        getRawVal(item, 'itemNo')
      return val !== undefined && val !== null ? String(val) : ''
    }
    if (col.type === 'qty') {
      const val =
        getRawVal(item, 'Quantity') ??
        getRawVal(item, 'quantity') ??
        getRawVal(item, 'Qty') ??
        getRawVal(item, 'qty')
      return val !== undefined && val !== null ? String(val) : ''
    }
    if (col.type === 'rate') {
      const val =
        getRawVal(item, 'Price') ??
        getRawVal(item, 'rate') ??
        getRawVal(item, 'unit_price') ??
        getRawVal(item, 'price')
      return val !== undefined && val !== null ? String(val) : ''
    }
    if (col.type === 'amount') {
      const val = getLineItemAmount(item)
      return val !== undefined && val !== null ? String(val) : ''
    }

    return ''
  }

  const getColChangeKey = (col: ColumnConfig): string => {
    if (col.type === 'dynamic') return col.key || ''
    if (col.type === 'description') return 'description'
    if (col.type === 'qty') return 'quantity'
    if (col.type === 'rate') return 'price'
    if (col.type === 'amount') return 'amount'
    return ''
  }

  const getColFocusKey = (col: ColumnConfig): string => {
    if (col.type === 'dynamic') return col.key || ''
    if (col.type === 'description') return 'description'
    if (col.type === 'qty') return 'qty'
    if (col.type === 'rate') return 'price'
    if (col.type === 'amount') return 'line_amount'
    return ''
  }

  const currencyStr =
    formModel?.['Currency'] ||
    agentData?.['Extracted Invoice JSON']?.invoice_header?.['Currency']

  return (
    <table className='min-w-full border-separate border-spacing-0 text-left text-xs'>
      <thead className='border-b border-[var(--gray-3)] bg-[var(--gray-1)]'>
        <tr>
          {allColumns.map((col, i) => {
            const { className, style } = getColStyleAndClass(
              i,
              'bg-[var(--gray-1)]',
            )

            let headerContent: React.ReactNode = null
            if (col.type === 'dynamic') {
              const isAmountColumn = col.isAmount
              headerContent = (
                <div
                  className={cn(
                    getLineItemTextClass(col.isNumeric),
                    'flex flex-col gap-0.5',
                  )}
                >
                  <span>{formatHeaderLabel(col.key || '')}</span>
                  {isAmountColumn && currencyStr ? (
                    <span className='text-[10px] leading-none opacity-70'>
                      ({currencyStr})
                    </span>
                  ) : null}
                </div>
              )
            } else if (col.type === 'description') {
              headerContent = (
                <span className={getLineItemTextClass()}>{t`Description`}</span>
              )
            } else if (col.type === 'qty') {
              headerContent = (
                <span className={getLineItemTextClass(true)}>{t`Qty`}</span>
              )
            } else if (col.type === 'rate') {
              headerContent = (
                <span className={getLineItemTextClass(true)}>{t`Rate`}</span>
              )
            } else if (col.type === 'amount') {
              headerContent = (
                <div
                  className={cn(
                    getLineItemTextClass(true),
                    'flex flex-col items-end gap-0.5',
                  )}
                >
                  <span>{t`Amount`}</span>
                  {currencyStr ? (
                    <span className='text-[10px] leading-none opacity-70'>
                      ({currencyStr})
                    </span>
                  ) : null}
                </div>
              )
            } else if (col.type === 'score') {
              headerContent = (
                <span className={getLineItemTextClass(true)}>{t`Score`}</span>
              )
            } else if (col.type === 'action') {
              headerContent = handleAddItem ? (
                <button
                  className='inline-flex cursor-pointer items-center justify-center rounded border border-[var(--primary-4)] bg-[var(--primary-2)] p-1 text-[var(--primary-11)] transition-all hover:bg-[var(--primary-3)] hover:text-[var(--primary-12)] active:scale-95'
                  title={t`Add New Item`}
                  type='button'
                  onClick={handleAddItem}
                >
                  <Plus className='h-3.5 w-3.5' />
                </button>
              ) : null
            }

            return (
              <th key={col.id} className={className} style={style}>
                {headerContent}
              </th>
            )
          })}
        </tr>
      </thead>
      <tbody className=''>
        {isCurrentlyProcessing && lineItems.length === 0
          ? skeletonRows.map((rowKey) => (
              <tr className='group transition-colors' key={rowKey}>
                {allColumns.map((col, i) => {
                  const { className, style } = getColCellConfig(i, 'bg-surface')

                  const cellClassName = cn(
                    className.replace('py-0.5', 'py-3').replace('py-2', 'py-3'),
                  )

                  let cellContent: React.ReactNode = null
                  if (col.type === 'action') {
                    cellContent = null
                  } else if (col.type === 'score') {
                    cellContent = (
                      <div className='ml-auto h-4 w-12 animate-pulse rounded bg-[var(--gray-3)]' />
                    )
                  } else {
                    const isDescription =
                      col.type === 'description' ||
                      (col.type === 'dynamic' && col.dynamicIndex === 0)
                    cellContent = (
                      <div
                        className={cn(
                          'h-4 animate-pulse rounded bg-[var(--gray-3)]',
                          isDescription ? 'w-5/6' : 'ml-auto w-12',
                        )}
                      />
                    )
                  }

                  return (
                    <td key={col.id} className={cellClassName} style={style}>
                      {cellContent}
                    </td>
                  )
                })}
              </tr>
            ))
          : lineItems.map((item: any, index: number) => {
              const matchData =
                agentData?.debug?.['Side-by-side Line Item matching']?.[index]
              const storedScore =
                matchData?.['Line Score'] ?? item['Line Score'] ?? item?.score
              const storedNumber =
                storedScore === undefined || storedScore === null || storedScore === ''
                  ? null
                  : Number(storedScore)
              const comparedScore = scoreLineAgainstPo(item, compareLines, index)
              const lineScore =
                storedNumber !== null && !Number.isNaN(storedNumber) && storedNumber > 0
                  ? storedNumber
                  : comparedScore !== null
                    ? comparedScore
                    : storedNumber
              const isMatch =
                (lineScore !== undefined && lineScore !== null
                  ? Number(lineScore) >= 90
                  : false) || item?.status === 'MATCH'

              const rowBgClass = isMatch ? 'bg-surface' : 'bg-[var(--red-1)]'

              return (
                <tr
                  key={item._id}
                  className={cn(
                    'group transition-colors',
                    isMatch
                      ? 'hover:bg-[var(--gray-1)]'
                      : 'bg-[var(--red-1)]/30 hover:bg-[var(--red-1)]/50',
                  )}
                >
                  {allColumns.map((col, i) => {
                    const { className, style } = getColCellConfig(i, rowBgClass)

                    let cellContent: React.ReactNode = null
                    if (col.type === 'score') {
                      if (lineScore === undefined || lineScore === null) {
                        cellContent = (
                          <span className='text-[11px] text-gray-9'>-</span>
                        )
                      } else {
                        const scoreNum = Number(lineScore)
                        cellContent = (
                          <span
                            className={cn('text-xs font-bold', {
                              'text-[var(--green-9)]': scoreNum >= 90,
                              'text-[var(--orange-9)]':
                                scoreNum >= 70 && scoreNum < 90,
                              'text-[var(--red-9)]': scoreNum < 70,
                            })}
                          >
                            {scoreNum.toFixed(0)}%
                          </span>
                        )
                      }
                    } else if (col.type === 'action') {
                      cellContent = handleRemoveItem ? (
                        <button
                          className='rounded p-1 text-[var(--red-9)] transition-all hover:bg-[var(--red-2)] hover:text-[var(--red-11)] active:scale-95'
                          title={t`Remove Item`}
                          type='button'
                          onClick={() => handleRemoveItem(index)}
                        >
                          <Trash2 className='h-3.5 w-3.5' />
                        </button>
                      ) : null
                    } else {
                      const cellVal = getCellVal(item, col)
                      const changeKey = getColChangeKey(col)
                      const focusKey = getColFocusKey(col)
                      const isGray11 =
                        col.type === 'qty' ||
                        col.type === 'rate' ||
                        (col.type === 'dynamic' &&
                          col.isNumeric &&
                          !col.isAmount)

                      cellContent = (
                        <div className='group/cell relative h-full min-h-[24px] w-full'>
                          <div
                            className={cn(
                              'invisible w-full min-w-0 px-1.5 py-1 text-xs font-semibold break-words whitespace-nowrap group-hover/cell:whitespace-normal',
                              col.isNumeric && 'text-right',
                            )}
                          >
                            {cellVal || ' '}
                          </div>
                          <textarea
                            rows={1}
                            value={cellVal}
                            className={cn(
                              'absolute inset-0 h-full min-h-full w-full resize-none overflow-hidden rounded border-none bg-transparent px-1.5 py-1 text-xs font-semibold whitespace-nowrap transition-all group-hover/cell:break-words group-hover/cell:whitespace-normal hover:bg-[var(--gray-2)]/30 focus:bg-surface focus:ring-1 focus:ring-[var(--primary-3)] focus:outline-none',
                              isGray11
                                ? 'text-right text-[var(--gray-11)]'
                                : col.isNumeric
                                  ? 'text-right text-[var(--gray-13)]'
                                  : 'text-[var(--gray-13)]',
                            )}
                            onBlur={(e) => {
                              if (!handleLineItemChange) return
                              if (
                                col.type === 'rate' ||
                                col.type === 'amount' ||
                                (col.type === 'dynamic' &&
                                  (changeKey.toLowerCase().includes('price') ||
                                    changeKey.toLowerCase().includes('rate') ||
                                    changeKey
                                      .toLowerCase()
                                      .includes('amount') ||
                                    changeKey.toLowerCase().includes('total')))
                              ) {
                                const num = Number.parseFloat(
                                  e.target.value.replace(/[^0-9.-]+/g, ''),
                                )
                                if (!Number.isNaN(num)) {
                                  handleLineItemChange(
                                    index,
                                    changeKey,
                                    num.toFixed(2),
                                  )
                                  return
                                }
                              }
                              handleLineItemChange(
                                index,
                                changeKey,
                                e.target.value,
                              )
                            }}
                            onChange={(e) =>
                              handleLineItemChange?.(
                                index,
                                changeKey,
                                e.target.value,
                              )
                            }
                            onFocus={() =>
                              handleFieldFocus?.(cellVal, focusKey)
                            }
                          />
                        </div>
                      )
                    }

                    return (
                      <td
                        className={className}
                        key={col.id}
                        style={style}
                      >
                        {cellContent}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
      </tbody>
      {lineItems.length > 0 && !hideFooter && (
        <tfoot className='sticky bottom-0 z-30 bg-[var(--gray-1)]'>
          <tr>
            {allColumns.map((col, i) => {
              const { className, style } = getColCellConfig(
                i,
                'bg-[var(--gray-1)]',
                true,
              )

              let footerClassName = cn(
                className
                  .replace('py-0.5', 'py-1.5')
                  .replace('py-2', 'py-1.5')
                  .split(' ')
                  .filter(
                    (cls) =>
                      !cls.startsWith('border-r') &&
                      !cls.startsWith('border-l'),
                  )
                  .join(' '),
              )
              const footerStyle = { ...style }

              const amountIdx = allColumns.findIndex(
                (c) => c.type === 'amount' || c.isAmount,
              )
              const isTotalCell = amountIdx !== -1 && i === amountIdx - 1

              if (isTotalCell) {
                // Calculate right offset for Total cell so it sticks right next to the Amount column
                let rightOffset = 0
                for (let j = amountIdx; j < allColumns.length; j++) {
                  rightOffset += getColWidth(allColumns[j], j)
                }
                const width = getColWidth(col, i)

                footerClassName = cn(
                  footerClassName,
                  'sticky z-20 bg-[var(--gray-1)]',
                )

                footerStyle.position = 'sticky'
                footerStyle.right = rightOffset
                footerStyle.width = width
                footerStyle.minWidth = width
                footerStyle.maxWidth = width
                footerStyle.left = undefined // clear left offset if it was sticky left
              }

              let cellContent: React.ReactNode = null
              if (isTotalCell) {
                cellContent = (
                  <span className='block w-full px-1.5 text-right text-xs font-bold text-[var(--gray-13)]'>
                    Total
                  </span>
                )
              } else if (
                col.type === 'amount' ||
                (col.type === 'dynamic' && col.isAmount)
              ) {
                cellContent = (
                  <span className='block w-full overflow-hidden px-1.5 text-right text-xs font-bold text-ellipsis whitespace-nowrap text-[var(--gray-13)]'>
                    {lineItems
                      .reduce((sum: number, item: any) => {
                        const val = getCellVal(item, col)
                        const num = Number.parseFloat(
                          String(val).replace(/[^0-9.-]+/g, ''),
                        )
                        return sum + (Number.isNaN(num) ? 0 : num)
                      }, 0)
                      .toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                        minimumFractionDigits: 2,
                      })}
                  </span>
                )
              }

              return (
                <td
                  className={footerClassName}
                  key={`footer-${col.id}`}
                  style={footerStyle}
                >
                  {cellContent}
                </td>
              )
            })}
          </tr>
        </tfoot>
      )}
    </table>
  )
}
