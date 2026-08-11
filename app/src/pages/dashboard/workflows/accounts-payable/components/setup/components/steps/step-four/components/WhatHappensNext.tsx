import { useLingui } from '@lingui/react/macro'
import Icon from '@/components/base/icon/Icon'
import Title from '@/components/base/Title'

const WhatHappensNext = () => {
  const { t } = useLingui()

  const items = [
    {
      description: t`Your AI agent will start monitoring your email and processing incoming invoices automatically.`,
      title: t`Immediate Invoice Processing`,
    },
    {
      description: t`Invoices are automatically matched with purchase orders and goods receipt notes for accuracy.`,
      title: t`Three-Way Matching`,
    },
    {
      description: t`Track processing status, approvals, and analytics from a unified dashboard.`,
      title: t`Real-Time Dashboard`,
    },
  ]

  return (
    <div className='max-w-2xl'>
      <Title
        className='mb-6'
        description={t`Here's what you can expect:`}
        level={3}
        title={t`What Happens Next?`}
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
