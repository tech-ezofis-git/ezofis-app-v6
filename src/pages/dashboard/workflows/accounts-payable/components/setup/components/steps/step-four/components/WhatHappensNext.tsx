import Icon from '@/components/base/icon/Icon'
import Title from '@/components/base/Title'

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
      <Title
        className='mb-6'
        description="Here's what you can expect:"
        level={3}
        title='What Happens Next?'
      />

      <div className='space-y-4'>
        {items.map((item) => (
          <div
            className='flex flex-wrap gap-4 rounded border border-gray-3 p-4'
            key={item.title}
          >
            <Icon className='text-green-11' name='lucide:circle-check' />

            <Title
              className='flex-1'
              description={item.description}
              level={4}
              title={item.title}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

WhatHappensNext.displayName = 'WhatHappensNext'
export default WhatHappensNext