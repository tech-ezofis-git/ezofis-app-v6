import Alert from '@/components/base/Alert'
import Button from '@/components/base/button/Button'
import Divider from '@/components/base/Divider'
import Title from '@/components/base/Title'
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
    <div className='flex h-full max-w-max flex-col gap-6 p-6 xl:px-8'>
      <Title
        description='Link your email account so invoices can be automatically captured and processed.'
        level={1}
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

      {emailSettings.isConnected && (
        <Alert
          text={`Your ${emailSettings.provider} account has been connected successfully.`}
          variant='green'
        />
      )}

      <div className='flex flex-wrap items-center justify-between gap-2'>
        <Button
          color='gray'
          icon='lucide:arrow-left'
          label='Back'
          variant='outline'
          onClick={() => setStep(0)}
        />
        {emailSettings.isConnected ? (
          <Button
            label='Continue'
            suffixIcon='lucide:arrow-right'
            onClick={() => setStep(2)}
          />
        ) : (
          <Button
            icon='lucide:plug'
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
