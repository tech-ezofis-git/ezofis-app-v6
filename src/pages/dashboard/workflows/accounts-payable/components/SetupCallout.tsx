import { Trans } from '@lingui/react/macro'
import Icon from '@/components/base/icon/Icon'
import setupStore from '../stores/useSetupStore'

const SetupCallout = () => {
  const openSetup = setupStore((state) => state.openSetup)

  return (
    <div className='mb-6 flex flex-wrap items-center gap-2 border-b border-gray-3 px-6 py-3 md:px-8'>
      <div className='font-medium'>
        <Trans>Complete setup to start your AP automation.</Trans>
      </div>

      <div
        className='flex cursor-pointer items-center gap-1 text-primary-11'
        onClick={openSetup}
      >
        <div className='font-medium'>
          <Trans>Get Started</Trans>
        </div>
        <Icon name='tabler:arrow-right' />
      </div>
    </div>
  )
}

SetupCallout.displayName = 'SetupCallout'
export default SetupCallout
