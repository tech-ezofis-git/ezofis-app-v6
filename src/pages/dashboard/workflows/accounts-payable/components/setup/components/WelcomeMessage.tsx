import Button from '@/components/base/button/Button'
import IconIllustrated from '@/components/base/icon/IconIllustrated'
import Title from '@/components/base/Title'
import setupStore from '../../../stores/useSetupStore'

const WelcomeMessage = () => {
  const isSetupStarted = setupStore((state) => state.isSetupStarted)
  const setIsSetupStarted = setupStore((state) => state.setIsSetupStarted)

  if (!isSetupStarted) {
    return (
      <div className='mx-auto flex h-full max-w-xl flex-col items-center justify-center gap-6 p-10'>
        <IconIllustrated icon='lucide:cog' />
        <Title
          className='text-center'
          description='Connect your email, ERP, and document storage to enable AI-powered invoice processing—streamline approvals, reduce errors, and save time.'
          level={1}
          title='Set Up Your AP Automation'
        />
        <div className='flex justify-center'>
          <Button
            label='Get Started'
            suffixIcon='lucide:arrow-right'
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
