import Icon from '@/components/base/icon/Icon'
import SectionHeader from '../../components/SectionHeader'

const items = [
  {
    description:
      'Your AI agent will start monitoring your email and processing incoming invoices automatically.',
    title: 'Immediate Invoice Processing',
  },
  {
    description:
      'Invoices are automatically matched with purchase orders and goods receipt notes for accuracy.',
    title: 'Three-Way Matching',
  },
  {
    description:
      'Track processing status, approvals, and analytics from a unified dashboard.',
    title: 'Real-Time Dashboard',
  },
]

const WhatHappensNext = () => {
  return (
    <div className='max-w-2xl'>
      <SectionHeader
        description="Here's what you can expect:"
        title='What Happens Next?'
      />

      <div className='space-y-3'>
        {items.map((item) => (
          <div
            className='flex flex-wrap gap-4 rounded-md border border-gray-3 p-5'
            key={item.title}
          >
            <Icon className='size-6 text-green-9' name='tabler:circle-check' />

            <div className='flex-1 space-y-1'>
              <div className='text-base font-medium text-gray-12'>
                {item.title}
              </div>
              <div className='text-gray-10'>{item.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

WhatHappensNext.displayName = 'WhatHappensNext'
export default WhatHappensNext
