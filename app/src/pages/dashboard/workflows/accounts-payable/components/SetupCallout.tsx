import { Trans } from '@lingui/react/macro'
import Icon from '@/components/base/icon/Icon'
import { AnimateFadeIn } from '@/components/common/animations'
import setupStore from '../stores/useSetupStore'

const SetupCallout = () => {
  const isSetupStarted = setupStore((state) => state.isSetupStarted)
  const isSetupCalloutDismissed = setupStore(
    (state) => state.isSetupCalloutDismissed,
  )
  const setIsSetupStarted = setupStore((state) => state.setIsSetupStarted)

  const handleStartSetup = () => {
    setupStore.setState({ isSetupOpen: false })
    setIsSetupStarted(true)
  }

  if (isSetupStarted || isSetupCalloutDismissed) {
    return null
  }

  return (
    <AnimateFadeIn delay={0.15}>
      <div className='mb-6 flex flex-wrap items-center gap-2 border-b border-gray-3 px-6 py-3 md:px-8'>
        <div className='font-medium'>
          <Trans>Complete setup to start your AP automation.</Trans>
        </div>
        <button
          className='flex cursor-pointer items-center gap-1 text-primary-11 transition-colors hover:text-primary-10'
          type='button'
          onClick={handleStartSetup}
        >
          <span className='font-medium'>
            <Trans>Get Started</Trans>
          </span>
          <Icon name='tabler:arrow-right' />
        </button>
      </div>
    </AnimateFadeIn>
  )
}

SetupCallout.displayName = 'SetupCallout'
export default SetupCallout
