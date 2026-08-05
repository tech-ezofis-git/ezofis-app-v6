import { useLingui } from '@lingui/react/macro'
import Button from '@/components/base/button/Button'
import IconIllustrated from '@/components/base/icon/IconIllustrated'
import Title from '@/components/base/Title'
import setupStore from '../../../stores/useSetupStore'

const WelcomeMessage = () => {
  const { t } = useLingui()
  const isSetupStarted = setupStore((state) => state.isSetupStarted)
  const setIsSetupStarted = setupStore((state) => state.setIsSetupStarted)

  if (!isSetupStarted) {
    return (
      <div className='mx-auto flex h-full max-w-lg flex-col items-center justify-center gap-8 p-10 text-center'>
        <IconIllustrated icon='lucide:cog' />
        <Title
          className='items-center text-center'
          description='Connect your email, ERP, and document storage to enable AI-powered invoice processing—streamline approvals, reduce errors, and save time.'
          descriptionClassName='max-w-md text-pretty'
          level={1}
          title={t`Set Up Your AP Automation`}
          titleClassName='tracking-tight'
        />
        <div className='flex justify-center'>
          <Button
            label={t`Get Started`}
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
