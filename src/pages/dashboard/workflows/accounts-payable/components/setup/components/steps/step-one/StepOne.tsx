import Alert from '@/components/base/Alert'
import Button from '@/components/base/button/Button'
import Divider from '@/components/base/Divider'
import HeroText from '@/components/common/HeroText'
import setupStore from '../../../../../stores/useSetupStore'
import ImapSettings from './components/ImapSettings'
import ProviderSettings from './components/ProviderSettings'

const StepOne = () => {
  const setStep = setupStore((state) => state.setStep)
  const emailSettings = setupStore((state) => state.emailSettings)
  const setEmailSettings = setupStore((state) => state.setEmailSettings)

  const handleConnect = () => {
    setEmailSettings({
      ...emailSettings,
      isConnecting: true,
    })
    setTimeout(() => {
      setEmailSettings({
        ...emailSettings,
        isConnected: true,
        isConnecting: false,
      })
    }, 1000)
  }

  return (
    <div className='flex min-h-full w-full flex-col gap-6 px-4 py-6 sm:px-6 md:px-8 lg:px-10'>
      <HeroText
        className='items-start text-left'
        description='Link your email account so invoices can be automatically captured and processed.'
        title='Connect Your Email'
      />
      <Divider />
      <ProviderSettings />

      {emailSettings.provider === 'Custom' && (
        <>
          <Divider />
          <ImapSettings />
        </>
      )}

      {emailSettings.provider === 'DIRECT_UPLOAD' && (
        <Alert
          text='You can upload files directly in the next step.'
          variant='green'
        />
      )}

      {emailSettings.isConnected && emailSettings.provider !== 'DIRECT_UPLOAD' && (
        <Alert
          text={`Your ${emailSettings.provider} account has been connected successfully.`}
          variant='green'
        />
      )}

      <div className='flex flex-wrap items-center justify-end gap-2 border-t border-gray-3 pt-4'>
        {emailSettings.provider === 'DIRECT_UPLOAD' || emailSettings.isConnected ? (
          <Button
            label='Continue'
            suffixIcon='tabler:arrow-right'
            onClick={() => setStep(1)}
          />
        ) : (
          <Button
            icon='tabler:plug'
            label={`Connect ${emailSettings.provider}`}
            loading={emailSettings.isConnecting}
            onClick={handleConnect}
          />
        )}
      </div>
    </div>
  )
}

StepOne.displayName = 'StepOne'
export default StepOne