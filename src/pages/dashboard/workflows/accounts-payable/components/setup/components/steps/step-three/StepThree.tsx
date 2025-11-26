import Alert from '@/components/base/Alert'
import Button from '@/components/base/button/Button'
import Divider from '@/components/base/Divider'
import HeroText from '@/components/common/HeroText'
import setupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import StorageSettings from './components/StorageSettings'
import StorageSystem from './components/StorageSystem'

const StepThree = () => {
  const setStep = setupStore((state) => state.setStep)
  const storageSettings = setupStore((state) => state.storageSettings)
  const setStorageSettings = setupStore((state) => state.setStorageSettings)

  const handleConnect = () => {
    setStorageSettings({
      ...storageSettings,
      isConnecting: true,
    })
    setTimeout(() => {
      setStorageSettings({
        ...storageSettings,
        isConnected: true,
        isConnecting: false,
      })
    }, 1000)
  }

  return (
    <div className='flex h-full max-w-max flex-col gap-6 p-6 xl:px-8'>
      <HeroText
        className='items-start text-left'
        description='Choose your storage provider to securely store and access invoice documents.'
        title='Link Your Document Storage'
      />

      <Divider />
      <StorageSystem />

      {storageSettings.system !== '' && (
        <>
          <Divider />
          <StorageSettings />
        </>
      )}

      {storageSettings.isConnected && (
        <Alert
          text={`Your ${storageSettings.system} account has been connected successfully.`}
          variant='green'
        />
      )}

      <div className='flex flex-wrap items-center justify-between gap-2'>
        <Button
          color='gray'
          icon='tabler:arrow-left'
          label='Back'
          variant='outline'
          onClick={() => setStep(2)}
        />
        {storageSettings.isConnected ? (
          <Button
            label='Continue'
            suffixIcon='tabler:arrow-right'
            onClick={() => setStep(4)}
          />
        ) : (
          <Button
            icon='tabler:plug'
            label={`Connect ${storageSettings.system}`}
            loading={storageSettings.isConnecting}
            onClick={handleConnect}
          />
        )}
      </div>
    </div>
  )
}

StepThree.displayName = 'StepThree'
export default StepThree
