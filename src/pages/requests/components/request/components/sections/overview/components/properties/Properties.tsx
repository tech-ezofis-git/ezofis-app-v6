import Badge from '@/components/base/Badge'
// import Title from '@/components/base/Title'
// import RequestStatusBadge from '@/components/common/RequestStatusBadge'
import Property from './Property'
import { formatDatetime } from '@/utils/dayjs' // Assuming you have this

interface Props {
  data: any
}

const Properties = ({ data }: Props) => {

  console.log(data, "this is overview")
  const score = Number(data?.score || 0)
  const paymentTerms = data?.payment_terms || {}

  const scoreColor = score >= 90 ? 'green' : score >= 70 ? 'orange' : 'red'
  const decision = data?.decision || (score >= 90 ? 'APPROVED' : 'REVIEW REQUIRED')

  return (
    <div>
      <div className='mb-4 text-sm font-medium text-gray-13'>Properties</div>

      <div className='grid grid-cols-2 overflow-hidden rounded border border-gray-3'>
        {/* These would ideally come from the parent process object, using placeholders if missing in agentData */}
        <Property title='Request No'>{data.reqNo || '-'}</Property>

        {/* Payment Terms Section */}
        <Property title='Invoice Date'>
          {paymentTerms.invoice_date ? formatDatetime(paymentTerms.invoice_date) : '-'}
        </Property>
        <Property title='Due Date'>
          {paymentTerms.due_date ? formatDatetime(paymentTerms.due_date) : '-'}
        </Property>
        <Property title='Payment Terms'>
          {paymentTerms.raw || '-'}
        </Property>

        {/* AI Stats */}
        <Property title='AI Confidence Score'>
          <Badge color={scoreColor} label={`${score.toFixed(2)}%`} />
        </Property>

        <Property className='border-b-0' title='AI Recommendation'>
          <Badge
            color={scoreColor}
            label={decision}
            className="uppercase"
          />
        </Property>
      </div>
    </div>
  )
}

Properties.displayName = 'Properties'
export default Properties