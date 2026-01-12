import type { MouseEvent } from 'react'
import Layout from './Layout'

interface Props {
  selected: boolean
  onClick: (e: MouseEvent) => void
}

const ClassicLayout = ({ selected, onClick }: Props) => {
  return (
    <Layout
      description='All sections on one page.'
      selected={selected}
      title='Classic Form'
      onClick={onClick}
    >
      <div className='w-full space-y-4'>
        <div className='mb-1 h-1 w-12 rounded bg-gray-6' />
        <div className='h-6 rounded border border-gray-6' />

        <div className='mb-1 h-1 w-12 rounded bg-gray-6' />
        <div className='h-6 rounded border border-gray-6' />

        <div className='flex justify-end'>
          <div className='h-5 w-12 rounded bg-gray-6'></div>
        </div>
      </div>
    </Layout>
  )
}

ClassicLayout.displayName = 'ClassicLayout'
export default ClassicLayout
