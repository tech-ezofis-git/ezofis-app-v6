import { Icon } from '@iconify/react'
import { useLingui } from '@lingui/react/macro'
import { useEffect, useMemo, useState } from 'react'
import { mapExternalRowsToTableColumns } from '@/pages/requests/components/workflow-request/components/TableFieldRenderer'
import cn from '@/utils/cn'
import {
  collectFormFields,
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
  value
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/s\b/g, '')

const toNumber = (value: unknown) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

const toMoney = (value: unknown) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return '0.00'
  return num.toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })
}

const roundMoney = (value: number) => Number(value.toFixed(2))

const recalcLineSubtotal = (row: Record<string, any>) => {
  const qty = Number(row.Qty)
  const price = Number(row.Price)
  if (!Number.isFinite(qty) || !Number.isFinite(price)) return row
  return { ...row, Subtotal: roundMoney(qty * price) }
}

const sumLineSubtotals = (rows: Record<string, any>[]) =>
  roundMoney(rows.reduce((sum, row) => sum + toNumber(row.Subtotal), 0))

const buildQuoteTotals = (
  rows: Record<string, any>[],
  freight: number,
  taxRate: number,
) => {
  const subtotal = sumLineSubtotals(rows)
  const hst = roundMoney((subtotal + freight) * taxRate)
  const total = roundMoney(subtotal + freight + hst)
  return { freight: roundMoney(freight), hst, subtotal, total }
}

const writeNamedFormFields = (
  workflow: any,
  onFieldChange: ((fieldId: string, value: any) => void) | undefined,
  values: Record<string, unknown>,
) => {
  if (!onFieldChange) return
  const fields = collectFormFields(workflow)
  Object.entries(values).forEach(([label, value]) => {
    const want = normalizeHeading(label)
    const field = fields.find(
      (item) => normalizeHeading(getFieldHeading(item)) === want,
    )
    onFieldChange(field ? getFieldId(field) : label, value)
  })
}

export const getQuoteTaxRate = (result: Record<string, any>) => {
  const subtotal = toNumber(result.Subtotal)
  const freight = toNumber(result.Freight)
  const hst = toNumber(result.Hst ?? result.HST)
  const base = subtotal + freight
  if (base > 0 && hst > 0) return hst / base
  return 0.13
}

interface Totals {
  freight: number
  hst: number
  subtotal: number
  total: number
}

interface Props {
  freight?: number
  items: Record<string, any>[]
  readOnly?: boolean
  taxRate?: number
  workflow?: any
  onFieldChange?: (fieldId: string, value: any) => void
  onTotalsChange?: (totals: Totals) => void
}

const QuoteLineItemsTable = ({
  freight = 0,
  items,
  readOnly = false,
  taxRate = 0.13,
  workflow,
  onFieldChange,
  onTotalsChange,
}: Props) => {
  const { t } = useLingui()
  const [rows, setRows] = useState<Record<string, any>[]>(() => items || [])

  useEffect(() => {
    setRows(items || [])
  }, [items])

  const tableField = useMemo(
    () =>
      collectFormTableFields(workflow).find((field) =>
        isLineItemHeading(getFieldHeading(field)),
      ),
    [workflow],
  )

  const persist = (next: Record<string, any>[]) => {
    const totals = buildQuoteTotals(next, freight, taxRate)
    setRows(next)
    onTotalsChange?.(totals)
    if (!onFieldChange) return
    if (tableField) {
      const columns = tableField.settings?.specific?.tableColumns || []
      onFieldChange(
        getFieldId(tableField),
        columns.length ? mapExternalRowsToTableColumns(next, columns) : next,
      )
    } else {
      onFieldChange('Line Item', next)
    }
    writeNamedFormFields(workflow, onFieldChange, {
      HST: totals.hst,
      Hst: totals.hst,
      Subtotal: totals.subtotal,
      Total: totals.total,
    })
  }

  const updateCell = (index: number, key: string, value: any) => {
    persist(
      rows.map((row, i) => {
        if (i !== index) return row
        return recalcLineSubtotal({ ...row, [key]: value })
      }),
    )
  }

  const approveRow = (index: number) => {
    persist(
      rows.map((row, i) =>
        i === index
          ? { ...row, Description: '', Note: row.Note, _approved: true }
          : row,
      ),
    )
  }

  if (!rows.length) return null

  const canEdit = !readOnly

  return (
    <div className='flex flex-col gap-3'>
      <h4 className='flex items-center gap-1.5 text-sm font-semibold text-gray-12'>
        <Icon
          className='h-4 w-4 text-[var(--primary-9)]'
          icon='tabler:shopping-cart'
        />
        Line Items ({rows.length})
      </h4>
      <div className='overflow-x-auto rounded-lg border border-gray-3'>
        <table className='w-full text-left text-sm'>
          <thead className='bg-gray-1 text-xs text-gray-11'>
            <tr>
              <th className='p-3 font-semibold'>Product</th>
              <th className='p-3 font-semibold'>Description</th>
              <th className='p-3 text-center font-semibold'>Qty</th>
              <th className='p-3 text-right font-semibold'>Price</th>
              <th className='p-3 text-right font-semibold'>Subtotal</th>
              {canEdit && (
                <th className='w-24 p-3 text-right font-semibold'>
                  {t`Approve`}
                </th>
              )}
            </tr>
          </thead>
          <tbody className='divide-y divide-gray-2 bg-surface'>
            {rows.map((item, i) => (
              <ReactFragmentRow
                canEdit={canEdit}
                item={item}
                key={item._rowId || i}
                onApprove={() => approveRow(i)}
                onChange={(key, value) => updateCell(i, key, value)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const cellInputClass =
  'w-full rounded-md border border-transparent bg-transparent px-1 py-0.5 text-inherit outline-none transition-colors hover:border-gray-4 hover:bg-gray-1 focus:border-[var(--primary-6)] focus:bg-white'

function ReactFragmentRow({
  canEdit,
  item,
  onApprove,
  onChange,
}: {
  canEdit: boolean
  item: Record<string, any>
  onApprove: () => void
  onChange: (key: string, value: any) => void
}) {
  const { t } = useLingui()
  const approved = Boolean(item._approved)

  return (
    <>
      <tr className='group'>
        <td className='p-3 align-top font-medium text-gray-12'>
          <div className='flex items-center gap-2'>
            {canEdit ? (
              <input
                className={cn(cellInputClass, 'font-medium')}
                value={item.Product ?? ''}
                onChange={(event) => onChange('Product', event.target.value)}
              />
            ) : (
              item.Product
            )}
            {item['Needs Engineering Review'] && (
              <span className='flex' title='Needs Engineering Review'>
                <Icon
                  className='h-4 w-4 shrink-0 text-orange-9'
                  icon='tabler:alert-triangle'
                />
              </span>
            )}
          </div>
          <div className='mt-0.5 text-xs text-gray-9'>{item.Category}</div>
        </td>
        <td className='p-3 align-top text-gray-11'>
          {canEdit ? (
            <textarea
              className={cn(cellInputClass, 'min-h-[2.5rem] resize-y')}
              rows={2}
              value={item.Description ?? ''}
              onChange={(event) => onChange('Description', event.target.value)}
            />
          ) : (
            item.Description
          )}
        </td>
        <td className='p-3 text-center align-top text-gray-12'>
          {canEdit ? (
            <input
              className={cn(cellInputClass, 'text-center')}
              type='number'
              value={item.Qty ?? ''}
              onChange={(event) => onChange('Qty', event.target.value)}
            />
          ) : (
            item.Qty
          )}
        </td>
        <td className='p-3 text-right align-top text-gray-12'>
          {canEdit ? (
            <input
              className={cn(cellInputClass, 'text-right')}
              type='number'
              value={item.Price ?? ''}
              onChange={(event) => onChange('Price', event.target.value)}
            />
          ) : (
            <>${toMoney(item.Price)}</>
          )}
        </td>
        <td className='p-3 text-right align-top font-semibold text-gray-12'>
          ${toMoney(item.Subtotal)}
        </td>
        {canEdit && (
          <td className='p-3 text-right align-top'>
            {approved ? (
              <span className='inline-flex items-center gap-1 rounded-md border border-green-3 bg-green-2 px-2 py-0.5 text-[10px] font-bold text-green-11'>
                <Icon className='h-3.5 w-3.5' icon='tabler:check' />
                {t`Approved`}
              </span>
            ) : (
              <button
                className='inline-flex cursor-pointer items-center gap-1 rounded-md border border-green-4 bg-green-2 px-2 py-0.5 text-[10px] font-bold text-green-11 opacity-70 transition-all group-hover:opacity-100 hover:bg-green-3 active:scale-95'
                type='button'
                onClick={onApprove}
              >
                <Icon className='h-3.5 w-3.5' icon='tabler:check' />
                {t`Approve`}
              </button>
            )}
          </td>
        )}
      </tr>
      {item.Note && (
        <tr>
          <td className='px-3 pt-0 pb-3' colSpan={canEdit ? 6 : 5}>
            <div className='flex items-start gap-2 rounded border border-orange-3 bg-orange-2/30 p-2 text-xs text-gray-10 text-orange-11'>
              <Icon
                className='mt-0.5 h-4 w-4 shrink-0'
                icon='tabler:info-circle'
              />
              <span>{item.Note}</span>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export function QuoteAgentResultView({
  onFieldChange,
  readOnly,
  result,
  workflow,
}: {
  readOnly?: boolean
  result: Record<string, any>
  workflow?: any
  onFieldChange?: (fieldId: string, value: any) => void
}) {
  const freight = toNumber(result.Freight)
  const taxRate = getQuoteTaxRate(result)
  const initialItems = Array.isArray(result['Line Item'])
    ? result['Line Item']
    : []
  const [totals, setTotals] = useState(() =>
    buildQuoteTotals(initialItems, freight, taxRate),
  )

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <h3 className='text-lg font-bold text-gray-12'>
            {result.Project || 'Unknown Project'}
          </h3>
          <p className='mt-1 flex gap-2 text-sm text-gray-9'>
            <span>Order: {result['Order Number'] || '-'}</span>
            <span>•</span>
            <span>{result['Invoice Type'] || 'Quotation'}</span>
            <span>•</span>
            <span>{result.Date || '-'}</span>
          </p>
        </div>
        <div className='flex flex-col items-end gap-1'>
          <div className='text-xl font-bold text-[var(--primary-11)]'>
            ${toMoney(totals.total)}
          </div>
          <div className='text-xs font-medium text-gray-9'>Total Amount</div>
        </div>
      </div>

      {initialItems.length > 0 && (
        <QuoteLineItemsTable
          freight={freight}
          items={initialItems}
          readOnly={readOnly}
          taxRate={taxRate}
          workflow={workflow}
          onFieldChange={onFieldChange}
          onTotalsChange={setTotals}
        />
      )}

      <div className='flex justify-end border-t border-gray-3 pt-4'>
        <div className='flex w-full max-w-sm flex-col gap-2 text-sm'>
          <div className='flex justify-between text-gray-11'>
            <span>Subtotal</span>
            <span className='font-medium text-gray-12'>
              ${toMoney(totals.subtotal)}
            </span>
          </div>
          <div className='flex justify-between text-gray-11'>
            <span>Freight</span>
            <span className='font-medium text-gray-12'>
              ${toMoney(totals.freight)}
            </span>
          </div>
          <div className='flex justify-between text-gray-11'>
            <span>HST</span>
            <span className='font-medium text-gray-12'>
              ${toMoney(totals.hst)}
            </span>
          </div>
          <div className='mt-2 flex justify-between border-t border-gray-2 pt-2 text-base font-bold text-gray-12'>
            <span>Total</span>
            <span className='text-[var(--primary-11)]'>
              ${toMoney(totals.total)}
            </span>
          </div>
        </div>
      </div>

      {result.Assumptions && result.Assumptions.length > 0 && (
        <div className='flex flex-col gap-2 border-t border-gray-3 pt-2'>
          <h4 className='flex items-center gap-1.5 text-sm font-semibold text-gray-12'>
            <Icon className='h-4 w-4 text-orange-9' icon='tabler:bulb' />
            Assumptions & Rules Applied
          </h4>
          <ul className='flex list-disc flex-col gap-1 pl-5'>
            {result.Assumptions.map((note: string, i: number) => (
              <li className='text-xs text-gray-10' key={i}>
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.Remarks && (
        <div className='flex flex-col gap-2 border-t border-gray-3 pt-2'>
          <h4 className='text-sm font-semibold text-gray-12'>Remarks</h4>
          <p className='text-xs leading-relaxed text-gray-10'>{result.Remarks}</p>
        </div>
      )}
    </div>
  )
}

export default QuoteLineItemsTable
