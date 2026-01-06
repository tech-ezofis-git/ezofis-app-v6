import type { IDiscrepancy } from '@/pages/requests/types'
import Title from '@/components/base/Title'
import Discrepancy from './Discrepancy'

const discrepancies: IDiscrepancy[] = [
  {
    description: 'Line 3 unit price mismatch',
    severity: 'high',
    title: 'Price Variance',
  },
  {
    description: 'Line 1 quantity discrepancy',
    severity: 'medium',
    title: 'Quantity Mismatch',
  },
  {
    description: 'Good Receipt Note (GRN) not found',
    severity: 'high',
    title: 'Missing GRN',
  },
]

const Discrepancies = () => {
  return (
    <div>
      <Title className='mb-4' level={3} title='Discrepancies' />

      <div className='divide-y divide-gray-3 rounded border border-gray-3'>
        {discrepancies.map((discrepancy) => (
          <Discrepancy key={discrepancy.title} {...discrepancy} />
        ))}
      </div>
    </div>
  )
}

Discrepancies.displayName = 'Discrepancies'
export default Discrepancies
