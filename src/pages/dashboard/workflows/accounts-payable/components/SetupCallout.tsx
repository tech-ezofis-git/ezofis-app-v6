import Icon from '@/components/base/icon/Icon'
import setupStore from '../stores/useSetupStore'

const SetupCallout = () => {
  const openSetup = setupStore((state) => state.openSetup)

  return (
    <div className='mb-8 flex flex-wrap items-center gap-2 border-b border-gray-3 px-6 py-3 md:px-10'>
      <div className='font-medium'>
        Complete setup to start your AP automation.{' '}
      </div>

      <div
        className='flex cursor-pointer items-center gap-1 text-primary-11'
        onClick={openSetup}
      >
        <div className='font-medium'>Get Started</div>
        <Icon name='tabler:arrow-right' />
      </div>
    </div>
  )
}

SetupCallout.displayName = 'SetupCallout'
export default SetupCallout
