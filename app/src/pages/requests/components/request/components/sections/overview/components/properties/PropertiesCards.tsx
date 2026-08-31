import { useLingui } from '@lingui/react/macro'
import Badge from '@/components/base/Badge'
import Title from '@/components/base/Title'
import { formatDatetime } from '@/utils/dayjs'

interface Props {
  data: any
}

const PropertiesCards = ({ data }: Props) => {
  const { t } = useLingui()
  const score = Number(data?.score || 0)
  const paymentTerms = data?.payment_terms || {}

  const scoreColor = score >= 90 ? 'green' : score >= 70 ? 'orange' : 'red'
  const decision =
    data?.decision ||
    (score >= 90
      ? t`APPROVED`
      : score >= 70
        ? t`PARTIALLY APPROVED`
        : t`REVIEW REQUIRED`)

  const fields = [
    { label: t`Vendor`, value: data?.vendor_name || '-' },
    { label: t`Invoice #`, value: data?.invoice_number || data?.reqNo || '-' },
    { label: t`PO #`, value: data?.po_number || '-' },
    {
      label: t`Invoice Date`,
      value: paymentTerms.invoice_date
        ? formatDatetime(paymentTerms.invoice_date)
        : '-',
    },
    {
      label: t`Due Date`,
      value: paymentTerms.due_date
        ? formatDatetime(paymentTerms.due_date)
        : '-',
    },
    {
      label: t`Total Amount`,
      value: data?.total_amount
        ? `$${Number(data.total_amount).toLocaleString()}`
        : '-',
    },
  ]

  return (
    <div>
      <Title className='mb-3' level={3} title={t`Invoice Summary`} />

      {/* REAL CARD */}
      <div className='rounded-xl border border-gray-3 bg-surface p-4 shadow-sm'>
        {/* top strip */}
        <div className='mb-3 flex items-center justify-between'>
          <Badge color={scoreColor} label={`${score.toFixed(0)}%`} />
          <Badge className='uppercase' color={scoreColor} label={decision} />
        </div>

        {/* dense grid */}
        <div className='grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-3'>
          {fields.map((f) => (
            <div key={f.label}>
              <div className='text-[11px] text-gray-11'>{f.label}</div>
              <div className='truncate text-sm font-semibold text-gray-13'>
                {f.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default PropertiesCards
