import { Trans } from '@lingui/react/macro'
import Icon from '@/components/base/icon/Icon'
import { AnimateFadeIn } from '@/components/common/animations'
import setupStore from '../stores/useSetupStore'

const SetupCallout = () => {
  const isApSetUpCompleted = setupStore((state) => state.isApSetUpCompleted)
  const isSetupStarted = setupStore((state) => state.isSetupStarted)
  const isSetupCalloutDismissed = setupStore(
    (state) => state.isSetupCalloutDismissed,
  )
  const setIsSetupStarted = setupStore((state) => state.setIsSetupStarted)
  const openSetup = setupStore((state) => state.openSetup)

  const handleStartSetup = () => {
    setIsSetupStarted(true)
    openSetup()
  }

  // Hide SetupCallout when setup is started (Steps will be shown instead)
  if (isSetupStarted) {
    return null
  }

  // Hide SetupCallout if dismissed
  if (isSetupCalloutDismissed) {
    return null
  }

  return (
    <AnimateFadeIn delay={0.15}>
      <div className='mb-6 flex flex-wrap items-center gap-2 border-b border-gray-3 px-6 py-3 md:px-8'>
        {isApSetUpCompleted ? (
          <>
            <div className='font-medium text-gray-12'>
              <>
                Your AP automation is configured. You can edit your settings and
                manage integrations here.
              </>
            </div>
            <div
              className='flex cursor-pointer items-center gap-1 text-primary-11 transition-colors hover:text-primary-10'
              onClick={handleStartSetup}
            >
              <div className='font-medium'>
                <>Edit Configuration</>
              </div>
              <Icon name='tabler:edit' />
            </div>
          </>
        ) : (
          <>
            <div className='font-medium'>
              <Trans>Complete setup to start your AP automation.</Trans>
            </div>
            <div
              className='flex cursor-pointer items-center gap-1 text-primary-11 transition-colors hover:text-primary-10'
              onClick={handleStartSetup}
            >
              <div className='font-medium'>
                <Trans>Get Started</Trans>
              </div>
              <Icon name='tabler:arrow-right' />
            </div>
          </>
        )}
      </div>
    </AnimateFadeIn>
  )
}

SetupCallout.displayName = 'SetupCallout'
export default SetupCallout
