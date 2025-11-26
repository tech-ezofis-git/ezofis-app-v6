import type { IDiscrepancy } from '@/pages/requests/types'
import Badge, { type BadgeColor } from '@/components/base/Badge'

const severityMap = new Map<string, BadgeColor>([
  ['low', 'gold'],
  ['medium', 'orange'],
  ['high', 'red'],
])

const Discrepancy = ({
  description,
  severity = 'low',
  title,
}: IDiscrepancy) => {
  return (
    <div className='flex flex-wrap items-center gap-4 p-4'>
      <div className='flex-1'>
        <div className='mb-1 font-medium text-gray-13'>{title}</div>
        <div className='text-12'>{description}</div>
      </div>

      <Badge
        className='capitalize'
        color={severityMap.get(severity)}
        label={severity}
      />
    </div>
  )
}

Discrepancy.displayName = 'Discrepancy'
export default Discrepancy
