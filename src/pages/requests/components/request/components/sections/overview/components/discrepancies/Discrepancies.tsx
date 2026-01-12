
import { useMemo } from 'react'
import type { IDiscrepancy } from '@/pages/requests/types'
import Discrepancy from './Discrepancy'

interface Props {
  data: any
}

const Discrepancies = ({ data }: Props) => {

  const discrepancies: IDiscrepancy[] = useMemo(() => {
    const list: IDiscrepancy[] = []

    // 1. Invoice Errors
    if (data?.invoice_errors?.errors) {
      data.invoice_errors.errors.forEach((err: any) => {
        list.push({
          title: 'Invoice Error',
          description: `${err.field}: ${err.detail}`,
          severity: 'high' // Assuming errors are always high
        })
      })
    }

    // 2. Back Orders
    if (data?.back_order?.missing_qty_by_item) {
      data.back_order.missing_qty_by_item.forEach((item: any) => {
        list.push({
          title: 'Back Order Detected',
          description: `Line ${item.po_line_id}: Invoice Qty ${item.invoice_qty} vs PO Qty ${item.po_qty}. Remaining: ${item.remaining}`,
          severity: 'medium'
        })
      })
    }

    // 3. Supplier Validation
    if (data?.supplier_validation?.mismatch) {
      data.supplier_validation.mismatch.forEach((mismatch: any) => {
        list.push({
          title: 'Supplier Mismatch',
          description: `${mismatch.field}: ${mismatch.detail}`,
          severity: 'high'
        })
      })
    }

    return list
  }, [data])

  if (discrepancies.length === 0) return null

  return (
    <div>
      <div className='mb-4 text-sm font-medium text-gray-13'>Discrepancies</div>

      <div className='divide-y divide-gray-3 rounded border border-gray-3'>
        {discrepancies.map((discrepancy, index) => (
          <Discrepancy key={`${discrepancy.title}-${index}`} {...discrepancy} />
        ))}
      </div>
    </div>
  )
}

Discrepancies.displayName = 'Discrepancies'
export default Discrepancies