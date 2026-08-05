import { useLingui } from '@lingui/react/macro'
import Badge from '@/components/base/Badge'
import Title from '@/components/base/Title'
import { formatDatetime } from '@/utils/dayjs' // Assuming you have this
// import RequestStatusBadge from '@/components/common/RequestStatusBadge'
import Property from './Property'

interface Props {
  data: any
}

const Properties = ({ data }: Props) => {
  console.log(data, 'this is overview')
  const score = Number(data?.score || 0)
  const paymentTerms = data?.payment_terms || {}

  const scoreColor = score >= 90 ? 'green' : score >= 70 ? 'orange' : 'red'
  const decision =
    data?.decision || (score >= 90 ? 'APPROVED' : 'REVIEW REQUIRED')

  return (
    <div>
      <Title className='mb-4' level={3} title={t`Properties`} />

      <div className='grid grid-cols-2 overflow-hidden rounded border border-gray-3'>
        {/* These would ideally come from the parent process object, using placeholders if missing in agentData */}
        <Property title={t`Request No`}>{data.reqNo || '-'}</Property>

        {/* Payment Terms Section */}
        <Property title={t`Invoice Date`}>
          {paymentTerms.invoice_date
            ? formatDatetime(paymentTerms.invoice_date)
            : '-'}
        </Property>
        <Property title={t`Due Date`}>
          {paymentTerms.due_date ? formatDatetime(paymentTerms.due_date) : '-'}
        </Property>
        <Property title={t`Payment Terms`}>{paymentTerms.raw || '-'}</Property>

        {/* AI Stats */}
        <Property title={t`AI Confidence Score`}>
          <Badge color={scoreColor} label={`${score.toFixed(2)}%`} />
        </Property>

        <Property className='border-b-0' title={t`AI Recommendation`}>
          <Badge className='uppercase' color={scoreColor} label={decision} />
        </Property>
      </div>
    </div>
  )
}

Properties.displayName = 'Properties'
export default Properties
