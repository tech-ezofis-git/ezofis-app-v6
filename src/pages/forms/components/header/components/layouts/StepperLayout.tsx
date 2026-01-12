import type { MouseEvent } from 'react'
import Layout from './Layout'

interface Props {
  selected: boolean
  onClick: (e: MouseEvent) => void
}

const StepperLayout = ({ selected, onClick }: Props) => {
  return (
    <Layout
      description='Complete the form step by step.'
      selected={selected}
      title='Stepper Form'
      onClick={onClick}
    >
      <div className='w-full space-y-4'>
        <div className='flex items-center gap-2'>
          <div className='size-6 rounded-full bg-gray-6' />
          <div className='h-px flex-1 rounded bg-gray-6'></div>
          <div className='size-6 rounded-full bg-gray-6' />
          <div className='h-px flex-1 rounded bg-gray-6'></div>
          <div className='size-6 rounded-full bg-gray-6' />
        </div>

        <div className='mb-1 h-1 w-12 rounded bg-gray-6' />
        <div className='h-6 rounded border border-gray-6' />

        <div className='mb-1 h-1 w-12 rounded bg-gray-6' />
        <div className='h-6 rounded border border-gray-6' />
      </div>
    </Layout>
  )
}

StepperLayout.displayName = 'StepperLayout'
export default StepperLayout
