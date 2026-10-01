import { useLingui } from '@lingui/react/macro'
import { useMemo } from 'react'
import type { IDiscrepancy } from '@/pages/requests/types'
import Title from '@/components/base/Title'
import Discrepancy from './Discrepancy'

interface Props {
  data: any
}

const Discrepancies = ({ data }: Props) => {
  const { t } = useLingui()
  const discrepancies: IDiscrepancy[] = useMemo(() => {
    const list: IDiscrepancy[] = []

    // 1. Invoice Errors
    if (data?.invoice_errors?.errors) {
      data.invoice_errors.errors.forEach((err: any) => {
        list.push({
          description: t`${err.field}: ${err.detail}`,
          severity: 'high', // Assuming errors are always high
          title: t`Invoice Error`,
        })
      })
    }

    // 2. Back Orders
    if (data?.back_order?.missing_qty_by_item) {
      data.back_order.missing_qty_by_item.forEach((item: any) => {
        list.push({
          description: t`Line ${item.po_line_id}: Invoice Qty ${item.invoice_qty} vs PO Qty ${item.po_qty}. Remaining: ${item.remaining}`,
          severity: 'medium',
          title: t`Back Order Detected`,
        })
      })
    }

    // 3. Supplier Validation
    if (data?.supplier_validation?.mismatch) {
      data.supplier_validation.mismatch.forEach((mismatch: any) => {
        list.push({
          description: t`${mismatch.field}: ${mismatch.detail}`,
          severity: 'high',
          title: t`Supplier Mismatch`,
        })
      })
    }

    return list
  }, [data])

  if (discrepancies.length === 0) return null

  return (
    <div>
      <Title className='mb-4' level={3} title={t`Discrepancies`} />

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
