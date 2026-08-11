import type { MouseEvent } from 'react'
import Icon from '@/components/base/icon/Icon'
import Layout from './Layout'

interface Props {
  selected: boolean
  onClick: (e: MouseEvent) => void
}

const AccordionLayout = ({ selected, onClick }: Props) => {
  return (
    <Layout
      description='Expand sections as needed.'
      selected={selected}
      title='Accordion Form'
      onClick={onClick}
    >
      <div className='w-full rounded border border-gray-4'>
        <div className='flex items-center justify-between border-b border-gray-4 px-2 py-1'>
          <div className='h-1 w-20 rounded bg-gray-6' />
          <Icon className='size-4 text-gray-8' name='lucide:chevron-down' />
        </div>

        <div className='w-full px-2'>
          <div className='flex items-center justify-between py-2'>
            <div className='h-1 w-20 rounded bg-gray-6' />
            <Icon className='size-4 text-gray-8' name='lucide:chevron-up' />
          </div>

          <div className='space-y-4 pb-2'>
            <div className='mb-1 h-1 w-12 rounded bg-gray-6' />
            <div className='h-6 rounded border border-gray-6' />

            <div className='mb-1 h-1 w-12 rounded bg-gray-6' />
            <div className='h-6 rounded border border-gray-6' />
          </div>
        </div>
      </div>
    </Layout>
  )
}

AccordionLayout.displayName = 'AccordionLayout'
export default AccordionLayout
