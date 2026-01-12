import Button from '@/components/base/button/Button'
import IconIllustrated from '@/components/base/icon/IconIllustrated'
import HeroText from '@/components/common/HeroText'
import setupStore from '../../../stores/useSetupStore'

const WelcomeMessage = () => {
  const isSetupStarted = setupStore((state) => state.isSetupStarted)
  const setIsSetupStarted = setupStore((state) => state.setIsSetupStarted)

  if (!isSetupStarted) {
    return (
      <div className='mx-auto flex h-full max-w-xl flex-col items-center justify-center gap-4 p-10'>
        <IconIllustrated icon='tabler:replace' />
        <HeroText
          description='Connect your email, ERP, and document storage to enable AI-powered invoice processing—streamline approvals, reduce errors, and save time.'
          title='Set Up Your AP Automation'
        />
        <div className='mt-2 flex justify-center'>
          <Button
            label='Get Started'
            suffixIcon='tabler:arrow-right'
            onClick={() => setIsSetupStarted(true)}
          />
        </div>
      </div>
    )
  }

  return null
}

WelcomeMessage.displayName = 'WelcomeMessage'
export default WelcomeMessage