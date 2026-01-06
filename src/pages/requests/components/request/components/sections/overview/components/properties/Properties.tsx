import Badge from '@/components/base/Badge'
import Title from '@/components/base/Title'
import RequestStatusBadge from '@/components/common/RequestStatusBadge'
import Property from './Property'

const Properties = () => {
  return (
    <div>
      <Title className='mb-4' level={3} title='Properties' />

      <div className='grid grid-cols-2 overflow-hidden rounded border border-gray-3'>
        <Property title='Invoice Number'>INV-2024-5847</Property>
        <Property title='Amount'>$5,789.00</Property>
        <Property title='Vendor'>Acme Office Supplies Inc.</Property>
        <Property title='Status'>
          <RequestStatusBadge status='Pending' />
        </Property>
        <Property title='Due Date'>14-Jan-2025</Property>
        <Property title='AI Extraction Accuracy'>
          <Badge color='green' label='92%' />
        </Property>
        <Property className='border-b-0' title='PO Number'>
          PO-2024-1234
        </Property>
        <Property title='AI Recommendation'>
          <Badge color='orange' label='Review Required' />
        </Property>
      </div>
    </div>
  )
}

Properties.displayName = 'Properties'
export default Properties
