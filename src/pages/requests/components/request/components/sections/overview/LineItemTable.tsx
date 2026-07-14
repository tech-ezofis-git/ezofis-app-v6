import { Plus, Trash2 } from 'lucide-react'
import { type CSSProperties } from 'react'
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

const getLineItemStickyClass = (
  index: number,
  bgClass = 'bg-surface',
): string =>
  cn(
    'relative before:absolute before:top-0 before:left-0 before:h-full before:w-px before:bg-[var(--gray-3)]',
    index < 2 && cn('sticky z-20', bgClass),
    index === 1 &&
      'after:absolute after:top-0 after:right-0 after:h-full after:w-px after:bg-[var(--gray-3)] shadow-[2px_0_5px_rgba(0,0,0,0.03)]'
  )

const getRightStickyStyle = (right: number, width: number): CSSProperties => ({
  maxWidth: width,
  minWidth: width,
  right,
  width,
})

const getLineItemTextClass = (isNumeric = false) =>
  cn(
    'block w-full overflow-hidden text-ellipsis whitespace-nowrap',
    isNumeric && 'text-right'
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
  return (
    item.Amount?.['Invoice Value'] ??
    item['Line Amount']?.['Invoice Value'] ??
    item['line amount'] ??
    item.LineAmount ??
    item.total ??
    item.amount ??
    item.line_amount ??
    item.lineAmount ??
    0
  )
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
  lineItems: any[]
  dynamicColumns: string[]
  isDynamicTable: boolean
  formModel: any
  agentData: any
  isCurrentlyProcessing: boolean
  currentScoreWidth: number
  LINE_ITEM_ACTION_WIDTH: number
  skeletonRows: string[]
  hasAnyScore: boolean
  dynamicWidths: number[]
  handleAddItem: () => void
  handleRemoveItem: (index: number) => void
  handleLineItemChange: (index: number, field: string, value: any) => void
  handleFieldFocus: (value: any, field: string) => void
}

export default function LineItemTable({
  lineItems,
  dynamicColumns,
  isDynamicTable,
  formModel,
  agentData,
  isCurrentlyProcessing,
  currentScoreWidth,
  LINE_ITEM_ACTION_WIDTH,
  skeletonRows,
  hasAnyScore,
  dynamicWidths,
  handleAddItem,
  handleRemoveItem,
  handleLineItemChange,
  handleFieldFocus,
}: LineItemTableProps) {
  const LINE_ITEM_AMOUNT_WIDTH = 80

  const getPinnedAmountStyle = (scoreWidth = currentScoreWidth): CSSProperties =>
    getRightStickyStyle(LINE_ITEM_ACTION_WIDTH + scoreWidth, LINE_ITEM_AMOUNT_WIDTH)

  const getPinnedAmountClass = (bgClass = 'bg-surface') =>
    cn(
      'sticky z-20 before:absolute before:top-0 before:left-0 before:h-full before:w-px before:bg-[var(--gray-3)]',
      bgClass
    )

  const getLineItemColumnWidth = (index: number, isNumeric = false) =>
    dynamicWidths[index] || (isNumeric ? 90 : 50)

  const getStickyLeftOffset = (index: number) => {
    if (index === 0) return 0
    let offset = 0
    for (let i = 0; i < index; i++) {
      const isNumeric = isDynamicTable && dynamicColumns ?
        (dynamicColumns[i]?.toLowerCase().includes('qty') ||
        dynamicColumns[i]?.toLowerCase().includes('quantity') ||
        dynamicColumns[i]?.toLowerCase().includes('rate') ||
        dynamicColumns[i]?.toLowerCase().includes('price') ||
        dynamicColumns[i]?.toLowerCase().includes('amount') ||
        dynamicColumns[i]?.toLowerCase().includes('total')) : (i > 0)
      offset += getLineItemColumnWidth(i, isNumeric)
    }
    return offset
  }

  const getLineItemCellStyle = (index: number, isNumeric = false): CSSProperties => {
    const width = getLineItemColumnWidth(index, isNumeric)
    const style: CSSProperties = { maxWidth: width, minWidth: width, width }
    if (index < 2) {
      style.left = getStickyLeftOffset(index)
    }
    return style
  }

  const currencyStr =
    formModel?.['Currency'] ||
    agentData?.['Extracted Invoice JSON']?.invoice_header?.['Currency']

  return (
    <table className='min-w-full border-separate border-spacing-0 text-left text-xs'>
      <thead className='border-b border-[var(--gray-3)] bg-[var(--gray-1)]'>
        <tr>
          {isDynamicTable ? (
            dynamicColumns.map((colKey, colIndex) => {
              const isNumeric =
                colKey.toLowerCase().includes('qty') ||
                colKey.toLowerCase().includes('quantity') ||
                colKey.toLowerCase().includes('rate') ||
                colKey.toLowerCase().includes('price') ||
                colKey.toLowerCase().includes('amount') ||
                colKey.toLowerCase().includes('total')
              const isAmountColumn = isLineItemAmountColumn(colKey)

              return (
                <th
                  key={colKey}
                  className={cn(
                    'border-b border-[var(--gray-3)] px-3 py-2 text-[11px] font-semibold whitespace-nowrap text-[var(--gray-11)]',
                    isNumeric && 'text-right',
                    isAmountColumn
                      ? getPinnedAmountClass('bg-[var(--gray-1)]')
                      : getLineItemStickyClass(colIndex, 'bg-[var(--gray-1)]')
                  )}
                  style={
                    isAmountColumn
                      ? getPinnedAmountStyle(currentScoreWidth)
                      : getLineItemCellStyle(colIndex, isNumeric)
                  }
                >
                  <div
                    className={cn(
                      getLineItemTextClass(isNumeric),
                      'flex flex-col gap-0.5'
                    )}
                  >
                    <span>{formatHeaderLabel(colKey)}</span>
                    {isAmountColumn && currencyStr ? (
                      <span className='text-[10px] leading-none opacity-70'>
                        ({currencyStr})
                      </span>
                    ) : null}
                  </div>
                </th>
              )
            })
          ) : (
            <>
              <th
                className={cn(
                  'border-b border-[var(--gray-3)] px-3 py-2 text-[11px] font-semibold whitespace-nowrap text-[var(--gray-11)]',
                  getLineItemStickyClass(0, 'bg-[var(--gray-1)]')
                )}
                style={getLineItemCellStyle(0)}
              >
                <span className={getLineItemTextClass()}>Description</span>
              </th>
              <th
                className={cn(
                  'border-b border-[var(--gray-3)] px-3 py-2 text-right text-[11px] font-semibold whitespace-nowrap text-[var(--gray-11)]',
                  getLineItemStickyClass(1, 'bg-[var(--gray-1)]')
                )}
                style={getLineItemCellStyle(1, true)}
              >
                <span className={getLineItemTextClass(true)}>Qty</span>
              </th>
              <th
                className={cn(
                  'border-b border-[var(--gray-3)] px-3 py-2 text-right text-[11px] font-semibold whitespace-nowrap text-[var(--gray-11)]',
                  getLineItemStickyClass(2, 'bg-[var(--gray-1)]')
                )}
                style={getLineItemCellStyle(2, true)}
              >
                <span className={getLineItemTextClass(true)}>Rate</span>
              </th>
              <th
                className={cn(
                  'border-b border-[var(--gray-3)] px-3 py-2 text-right text-[11px] font-semibold whitespace-nowrap text-[var(--gray-11)]',
                  getPinnedAmountClass('bg-[var(--gray-1)]')
                )}
                style={getPinnedAmountStyle(currentScoreWidth)}
              >
                <div
                  className={cn(
                    getLineItemTextClass(true),
                    'flex flex-col items-end gap-0.5'
                  )}
                >
                  <span>Amount</span>
                  {currencyStr ? (
                    <span className='text-[10px] leading-none opacity-70'>
                      ({currencyStr})
                    </span>
                  ) : null}
                </div>
              </th>
            </>
          )}
          {hasAnyScore && (
            <th
              className='sticky z-20 border-b border-[var(--gray-3)] bg-[var(--gray-1)] px-3 py-2 text-right text-[11px] font-semibold whitespace-nowrap text-[var(--gray-11)] before:absolute before:left-0 before:top-0 before:h-full before:w-px before:bg-[var(--gray-3)]'
              style={getRightStickyStyle(LINE_ITEM_ACTION_WIDTH, currentScoreWidth)}
            >
              <span className={getLineItemTextClass(true)}></span>
            </th>
          )}
          <th
            className='sticky z-20 border-b border-[var(--gray-3)] bg-[var(--gray-1)] p-1 text-center'
            style={getRightStickyStyle(0, LINE_ITEM_ACTION_WIDTH)}
          >
            <button
              className='inline-flex cursor-pointer items-center justify-center rounded border border-[var(--primary-4)] bg-[var(--primary-2)] p-1 text-[var(--primary-11)] transition-all hover:bg-[var(--primary-3)] hover:text-[var(--primary-12)] active:scale-95'
              title='Add New Item'
              type='button'
              onClick={handleAddItem}
            >
              <Plus className='h-3.5 w-3.5' />
            </button>
          </th>
        </tr>
      </thead>
      <tbody className='divide-y divide-[var(--gray-2)]'>
        {isCurrentlyProcessing && lineItems.length === 0
          ? skeletonRows.map((rowKey) => (
              <tr className='group transition-colors' key={rowKey}>
                {isDynamicTable ? (
                  dynamicColumns.map((colKey, index) => {
                    const isNumeric =
                      colKey.toLowerCase().includes('qty') ||
                      colKey.toLowerCase().includes('quantity') ||
                      colKey.toLowerCase().includes('rate') ||
                      colKey.toLowerCase().includes('price') ||
                      colKey.toLowerCase().includes('amount') ||
                      colKey.toLowerCase().includes('total')

                    return (
                      <td
                        key={colKey}
                        className={cn(
                          'px-3 py-3',
                          isNumeric && 'text-right',
                          getLineItemStickyClass(index)
                        )}
                        style={getLineItemCellStyle(index, isNumeric)}
                      >
                        <div
                          className={cn(
                            'h-4 animate-pulse rounded bg-[var(--gray-3)]',
                            index === 0 ? 'w-5/6' : 'ml-auto w-12'
                          )}
                        />
                      </td>
                    )
                  })
                ) : (
                  <>
                    <td
                      className={cn('px-3 py-3', getLineItemStickyClass(0))}
                      style={getLineItemCellStyle(0)}
                    >
                      <div className='h-4 w-5/6 animate-pulse rounded bg-[var(--gray-3)]' />
                    </td>
                    <td
                      className={cn('px-3 py-3', getLineItemStickyClass(1))}
                      style={getLineItemCellStyle(1, true)}
                    >
                      <div className='ml-auto h-4 w-8 animate-pulse rounded bg-[var(--gray-3)]' />
                    </td>
                    <td
                      className={cn('px-3 py-3', getLineItemStickyClass(2))}
                      style={getLineItemCellStyle(2, true)}
                    >
                      <div className='ml-auto h-4 w-12 animate-pulse rounded bg-[var(--gray-3)]' />
                    </td>
                    <td
                      className='px-3 py-3'
                      style={getLineItemCellStyle(3, true)}
                    >
                      <div className='ml-auto h-4 w-16 animate-pulse rounded bg-[var(--gray-3)]' />
                    </td>
                  </>
                )}
                {hasAnyScore && (
                  <td
                    className='sticky z-20 bg-surface px-3 py-3 before:absolute before:left-0 before:top-0 before:h-full before:w-px before:bg-[var(--gray-3)]'
                    style={getRightStickyStyle(LINE_ITEM_ACTION_WIDTH, currentScoreWidth)}
                  >
                    <div className='ml-auto h-4 w-12 animate-pulse rounded bg-[var(--gray-3)]' />
                  </td>
                )}
                <td
                  className='sticky z-20 bg-surface'
                  style={getRightStickyStyle(0, LINE_ITEM_ACTION_WIDTH)}
                />
              </tr>
            ))
          : lineItems.map((item: any, index: number) => {
              const matchData = agentData?.debug?.['Side-by-side Line Item matching']?.[index]
              const lineScore =
                matchData?.['Line Score'] ?? item['Line Score'] ?? item?.score
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
                      : 'bg-[var(--red-1)]/30 hover:bg-[var(--red-1)]/50'
                  )}
                >
                  {isDynamicTable ? (
                    dynamicColumns.map((colKey, colIndex) => {
                      const cellVal = getRawVal(item, colKey) ?? ''
                      const isNumeric =
                        colKey.toLowerCase().includes('qty') ||
                        colKey.toLowerCase().includes('quantity') ||
                        colKey.toLowerCase().includes('rate') ||
                        colKey.toLowerCase().includes('price') ||
                        colKey.toLowerCase().includes('amount') ||
                        colKey.toLowerCase().includes('total')
                      const isAmountColumn = isLineItemAmountColumn(colKey)

                      return (
                        <td
                          key={colKey}
                          className={cn(
                            'px-2 py-0.5 font-semibold text-[var(--gray-13)]',
                            isNumeric && 'text-right',
                            isAmountColumn
                              ? getPinnedAmountClass(rowBgClass)
                              : getLineItemStickyClass(colIndex, rowBgClass)
                          )}
                          style={
                            isAmountColumn
                              ? getPinnedAmountStyle(currentScoreWidth)
                              : getLineItemCellStyle(colIndex, isNumeric)
                          }
                        >
                          <div className='group/cell relative h-full min-h-[24px] w-full'>
                            <div className='invisible w-full min-w-0 break-words whitespace-nowrap px-1.5 py-1 text-xs font-semibold group-hover/cell:whitespace-normal'>
                              {cellVal || ' '}
                            </div>
                            <textarea
                              rows={1}
                              value={cellVal}
                              className={cn(
                                'absolute inset-0 h-full min-h-full w-full resize-none overflow-hidden whitespace-nowrap rounded border-none bg-transparent px-1.5 py-1 text-xs font-semibold transition-all hover:bg-[var(--gray-2)]/30 focus:bg-surface focus:outline-none focus:ring-1 focus:ring-[var(--primary-3)] group-hover/cell:whitespace-normal group-hover/cell:break-words',
                                isNumeric
                                  ? 'text-right text-[var(--gray-11)]'
                                  : 'text-[var(--gray-13)]'
                              )}
                              onBlur={(e) => {
                                if (
                                  colKey.toLowerCase().includes('price') ||
                                  colKey.toLowerCase().includes('rate') ||
                                  colKey.toLowerCase().includes('amount') ||
                                  colKey.toLowerCase().includes('total')
                                ) {
                                  const num = Number.parseFloat(
                                    e.target.value.replace(/[^0-9.-]+/g, '')
                                  )
                                  if (!Number.isNaN(num)) {
                                    handleLineItemChange(index, colKey, num.toFixed(2))
                                    return
                                  }
                                }
                                handleLineItemChange(index, colKey, e.target.value)
                              }}
                              onChange={(e) =>
                                handleLineItemChange(index, colKey, e.target.value)
                              }
                              onFocus={() => handleFieldFocus?.(cellVal, colKey)}
                            />
                          </div>
                        </td>
                      )
                    })
                  ) : (
                    <>
                      {/* Description Cell */}
                      <td
                        className={cn(
                          'px-2 py-0.5 font-semibold text-[var(--gray-13)]',
                          getLineItemStickyClass(0, rowBgClass)
                        )}
                        style={getLineItemCellStyle(0)}
                      >
                        <div className='group/cell relative h-full min-h-[24px] w-full'>
                          <div className='invisible w-full min-w-0 break-words whitespace-nowrap px-1.5 py-1 text-xs font-semibold group-hover/cell:whitespace-normal'>
                            {item.Description?.['Invoice Value'] ??
                              item.description ??
                              item.item_no ??
                              item.itemNo ??
                              ' '}
                          </div>
                          <textarea
                            rows={1}
                            className='absolute inset-0 h-full min-h-full w-full resize-none overflow-hidden whitespace-nowrap rounded border-none bg-transparent px-1.5 py-1 text-xs font-semibold text-[var(--gray-13)] transition-all hover:bg-[var(--gray-2)]/30 focus:bg-surface focus:outline-none focus:ring-1 focus:ring-[var(--primary-3)] group-hover/cell:whitespace-normal group-hover/cell:break-words'
                            value={
                              item.Description?.['Invoice Value'] ??
                              item.description ??
                              item.item_no ??
                              item.itemNo ??
                              ''
                            }
                            onChange={(e) =>
                              handleLineItemChange(index, 'description', e.target.value)
                            }
                            onFocus={() =>
                              handleFieldFocus?.(
                                item.Description?.['Invoice Value'] ??
                                  item.description ??
                                  item.item_no ??
                                  item.itemNo ??
                                  '',
                                'description'
                              )
                            }
                          />
                        </div>
                      </td>
                      {/* Quantity Cell */}
                      <td
                        className={cn(
                          'px-2 py-0.5 text-right font-semibold text-[var(--gray-11)]',
                          getLineItemStickyClass(1, rowBgClass)
                        )}
                        style={getLineItemCellStyle(1, true)}
                      >
                        <div className='group/cell relative h-full min-h-[24px] w-full'>
                          <div className='invisible w-full min-w-0 break-words whitespace-nowrap px-1.5 py-1 text-right text-xs font-semibold group-hover/cell:whitespace-normal'>
                            {item.Quantity?.['Invoice Value'] ?? item.quantity ?? ' '}
                          </div>
                          <textarea
                            rows={1}
                            className='absolute inset-0 h-full min-h-full w-full resize-none overflow-hidden whitespace-nowrap rounded border-none bg-transparent px-1.5 py-1 text-right text-xs font-semibold text-[var(--gray-11)] transition-all hover:bg-[var(--gray-2)]/30 focus:bg-surface focus:outline-none focus:ring-1 focus:ring-[var(--primary-3)] group-hover/cell:whitespace-normal group-hover/cell:break-words'
                            value={
                              item.Quantity?.['Invoice Value'] ?? item.quantity ?? ''
                            }
                            onChange={(e) =>
                              handleLineItemChange(index, 'quantity', e.target.value)
                            }
                            onFocus={() =>
                              handleFieldFocus?.(
                                item.Quantity?.['Invoice Value'] ??
                                  item.quantity ??
                                  '',
                                'qty'
                              )
                            }
                          />
                        </div>
                      </td>
                      {/* Rate Cell */}
                      <td
                        className={cn(
                          'px-2 py-0.5 text-right font-semibold text-[var(--gray-11)]',
                          getLineItemStickyClass(2, rowBgClass)
                        )}
                        style={getLineItemCellStyle(2, true)}
                      >
                        <div className='group/cell relative h-full min-h-[24px] w-full'>
                          <div className='invisible w-full min-w-0 break-words whitespace-nowrap px-1.5 py-1 text-right text-xs font-semibold group-hover/cell:whitespace-normal'>
                            {item.Price?.['Invoice Value'] ??
                              item.rate ??
                              item.unit_price ??
                              item.price ??
                              ' '}
                          </div>
                          <textarea
                            rows={1}
                            className='absolute inset-0 h-full min-h-full w-full resize-none overflow-hidden whitespace-nowrap rounded border-none bg-transparent px-1.5 py-1 text-right text-xs font-semibold text-[var(--gray-11)] transition-all hover:bg-[var(--gray-2)]/30 focus:bg-surface focus:outline-none focus:ring-1 focus:ring-[var(--primary-3)] group-hover/cell:whitespace-normal group-hover/cell:break-words'
                            value={
                              item.Price?.['Invoice Value'] ??
                              item.rate ??
                              item.unit_price ??
                              item.price ??
                              ''
                            }
                            onBlur={(e) => {
                              const num = Number.parseFloat(
                                e.target.value.replace(/[^0-9.-]+/g, '')
                              )
                              if (!Number.isNaN(num)) {
                                handleLineItemChange(index, 'price', num.toFixed(2))
                              }
                            }}
                            onChange={(e) =>
                              handleLineItemChange(index, 'price', e.target.value)
                            }
                            onFocus={() =>
                              handleFieldFocus?.(
                                item.Price?.['Invoice Value'] ??
                                  item.rate ??
                                  item.unit_price ??
                                  item.price ??
                                  '',
                                'price'
                              )
                            }
                          />
                        </div>
                      </td>
                      {/* Total Amount Cell */}
                      <td
                        className={cn(
                          'px-2 py-0.5 text-right font-semibold text-[var(--gray-13)]',
                          getPinnedAmountClass(rowBgClass)
                        )}
                        style={getPinnedAmountStyle(currentScoreWidth)}
                      >
                        <div className='group/cell relative h-full min-h-[24px] w-full'>
                          <div className='invisible w-full min-w-0 break-words whitespace-nowrap px-1.5 py-1 text-right text-xs font-semibold group-hover/cell:whitespace-normal'>
                            {item.Amount?.['Invoice Value'] ??
                              item['Line Amount']?.['Invoice Value'] ??
                              item['line amount'] ??
                              item.LineAmount ??
                              item.total ??
                              item.amount ??
                              item.line_amount ??
                              item.lineAmount ??
                              ' '}
                          </div>
                          <textarea
                            rows={1}
                            className='absolute inset-0 h-full min-h-full w-full resize-none overflow-hidden whitespace-nowrap rounded border-none bg-transparent px-1.5 py-1 text-right text-xs font-semibold text-[var(--gray-13)] transition-all hover:bg-[var(--gray-2)]/30 focus:bg-surface focus:outline-none focus:ring-1 focus:ring-[var(--primary-3)] group-hover/cell:whitespace-normal group-hover/cell:break-words'
                            value={
                              item.Amount?.['Invoice Value'] ??
                              item['Line Amount']?.['Invoice Value'] ??
                              item['line amount'] ??
                              item.LineAmount ??
                              item.total ??
                              item.amount ??
                              item.line_amount ??
                              item.lineAmount ??
                              ''
                            }
                            onBlur={(e) => {
                              const num = Number.parseFloat(
                                e.target.value.replace(/[^0-9.-]+/g, '')
                              )
                              if (!Number.isNaN(num)) {
                                handleLineItemChange(index, 'amount', num.toFixed(2))
                              }
                            }}
                            onChange={(e) =>
                              handleLineItemChange(index, 'amount', e.target.value)
                            }
                            onFocus={() =>
                              handleFieldFocus?.(
                                item.Amount?.['Invoice Value'] ??
                                  item['Line Amount']?.['Invoice Value'] ??
                                  item['line amount'] ??
                                  item.LineAmount ??
                                  item.total ??
                                  item.amount ??
                                  item.line_amount ??
                                  item.lineAmount ??
                                  '',
                                'line_amount'
                              )
                            }
                          />
                        </div>
                      </td>
                    </>
                  )}

                  {/* Match Score Cell */}
                  {hasAnyScore && (
                    <td
                      className={cn(
                        'sticky z-20 px-3 py-2 text-right font-semibold before:absolute before:left-0 before:top-0 before:h-full before:w-px before:bg-[var(--gray-3)]',
                        rowBgClass
                      )}
                      style={getRightStickyStyle(
                        LINE_ITEM_ACTION_WIDTH,
                        currentScoreWidth
                      )}
                    >
                      {(() => {
                        if (lineScore === undefined || lineScore === null)
                          return <span className='text-[11px] text-gray-9'>-</span>
                        const scoreNum = Number(lineScore)
                        return (
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
                      })()}
                    </td>
                  )}

                  {/* Action Cell */}
                  <td
                    className={cn(
                      'sticky z-20 px-2 py-0.5 text-center',
                      rowBgClass
                    )}
                    style={getRightStickyStyle(0, LINE_ITEM_ACTION_WIDTH)}
                  >
                    <button
                      className='rounded p-1 text-[var(--red-9)] transition-all hover:bg-[var(--red-2)] hover:text-[var(--red-11)] active:scale-95'
                      title='Remove Item'
                      type='button'
                      onClick={() => handleRemoveItem(index)}
                    >
                      <Trash2 className='h-3.5 w-3.5' />
                    </button>
                  </td>
                </tr>
              )
            })}
      </tbody>
      {lineItems.length > 0 && (
        <tfoot className='sticky bottom-0 z-30 bg-[var(--gray-1)] shadow-[0_-1px_0_var(--gray-3)]'>
          <tr className='border-t border-[var(--gray-3)]'>
            {/* Spacer cell to push sticky cells to the right */}
            {(!isDynamicTable || dynamicColumns.length > 1) && (
              <td
                colSpan={isDynamicTable ? dynamicColumns.length - 1 : 3}
                className='border-t border-[var(--gray-3)]'
              />
            )}
            {/* Total Amount cell */}
            <td
              className={cn(
                'border-t border-[var(--gray-3)] px-3 py-2.5 text-right',
                getPinnedAmountClass('bg-[var(--gray-1)]')
              )}
              style={getPinnedAmountStyle(currentScoreWidth)}
            >
              <span className='block w-full overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-bold text-[var(--gray-13)]'>
                {lineItems
                  .reduce((sum: number, item: any) => {
                    const val = getLineItemAmount(item)
                    const num = Number.parseFloat(
                      String(val).replace(/[^0-9.-]+/g, '')
                    )
                    return sum + (Number.isNaN(num) ? 0 : num)
                  }, 0)
                  .toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                    minimumFractionDigits: 2,
                  })}
              </span>
            </td>

            {/* Pinned Match Score filler */}
            {hasAnyScore && (
              <td
                className='sticky z-20 border-t border-[var(--gray-3)] bg-[var(--gray-1)] before:absolute before:left-0 before:top-0 before:h-full before:w-px before:bg-[var(--gray-3)]'
                style={getRightStickyStyle(
                  LINE_ITEM_ACTION_WIDTH,
                  currentScoreWidth
                )}
              />
            )}

            {/* Pinned Action filler */}
            <td
              className='sticky z-20 border-t border-[var(--gray-3)] bg-[var(--gray-1)]'
              style={getRightStickyStyle(0, LINE_ITEM_ACTION_WIDTH)}
            />
          </tr>
        </tfoot>
      )}
    </table>
  )
}
