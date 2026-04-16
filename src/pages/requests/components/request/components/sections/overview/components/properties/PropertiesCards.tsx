import Badge from '@/components/base/Badge'
import Title from '@/components/base/Title'
import { formatDatetime } from '@/utils/dayjs'

interface Props {
    data: any
}

const PropertiesCards = ({ data }: Props) => {
    const score = Number(data?.score || 0)
    const paymentTerms = data?.payment_terms || {}

    const scoreColor = score >= 90 ? 'green' : score >= 70 ? 'orange' : 'red'
    const decision =
        data?.decision ||
        (score >= 90 ? 'APPROVED' : score >= 70 ? 'PARTIALLY APPROVED' : 'REVIEW REQUIRED')

    const fields = [
        { label: 'Vendor', value: data?.vendor_name || '-' },
        { label: 'Invoice #', value: data?.invoice_number || data?.reqNo || '-' },
        { label: 'PO #', value: data?.po_number || '-' },
        {
            label: 'Invoice Date',
            value: paymentTerms.invoice_date ? formatDatetime(paymentTerms.invoice_date) : '-',
        },
        {
            label: 'Due Date',
            value: paymentTerms.due_date ? formatDatetime(paymentTerms.due_date) : '-',
        },
        {
            label: 'Total Amount',
            value: data?.total_amount
                ? `$${Number(data.total_amount).toLocaleString()}`
                : '-',
        },
    ]

    return (
        <div>
            <Title level={3} title="Invoice Summary" className="mb-3" />

            {/* REAL CARD */}
            <div className="rounded-xl border border-gray-3 bg-white p-4 shadow-sm">
                {/* top strip */}
                <div className="mb-3 flex items-center justify-between">
                    <Badge color={scoreColor} label={`${score.toFixed(0)}%`} />
                    <Badge color={scoreColor} label={decision} className="uppercase" />
                </div>

                {/* dense grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-3">
                    {fields.map((f) => (
                        <div key={f.label}>
                            <div className="text-[11px] text-gray-11">{f.label}</div>
                            <div className="truncate text-sm font-semibold text-gray-13">
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
