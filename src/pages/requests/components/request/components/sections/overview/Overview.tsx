import Alert from '@/components/base/Alert'
import AuditTrail from './components/audit-trail/AuditTrail'
import Discrepancies from './components/discrepancies/Discrepancies'
import LineItems from './components/line-items/LineItems'
import Properties from './components/properties/Properties'

const Overview = () => {
  return (
    <div className='space-y-10 p-4 xl:px-6 xl:py-8'>
      <Alert
        text='3 discrepancies found — price variance, quantity mismatch, and missing GRN. Review before approval.'
        variant='red'
      />
      <Properties />
      <Discrepancies />
      <LineItems />
      <AuditTrail />
    </div>
  )
}

Overview.displayName = 'Overview'
export default Overview
