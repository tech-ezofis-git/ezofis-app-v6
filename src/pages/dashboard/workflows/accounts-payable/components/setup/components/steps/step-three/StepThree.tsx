import Alert from '@/components/base/Alert'
import Button from '@/components/base/button/Button'
import Divider from '@/components/base/Divider'
import { AnimateFadeIn, AnimateSlideUp } from '@/components/common/animations'
import setupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import { StepFooter, StepLayout } from '../components/StepLayout'
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
    <StepLayout
      description='Select where to store your invoice documents. Use included storage or connect a cloud provider.'
      title='Select Storage'
      footer={
        <StepFooter>
          <Button
            color='gray'
            icon='lucide:arrow-left'
            label='Back'
            variant='outline'
            onClick={() => setStep(1)}
          />
          {storageSettings.system === 'Included storage' ||
          storageSettings.isConnected ? (
            <Button
              label='Continue'
              suffixIcon='tabler:arrow-right'
              onClick={() => setStep(3)}
            />
          ) : (
            <Button
              icon='lucide:plug'
              label={`Connect ${storageSettings.system}`}
              loading={storageSettings.isConnecting}
              onClick={handleConnect}
            />
          )}
        </StepFooter>
      }
    >
      <AnimateFadeIn delay={0.3}>
        <StorageSystem />
      </AnimateFadeIn>

      {storageSettings.system &&
        storageSettings.system !== 'Included storage' && (
          <AnimateFadeIn delay={0.4}>
            <>
              <Divider />
              <StorageSettings />
            </>
          </AnimateFadeIn>
        )}

      {storageSettings.system === 'Included storage' && (
        <AnimateSlideUp delay={0.4}>
          <Alert
            text='Your default storage is connected successfully.'
            variant='green'
          />
        </AnimateSlideUp>
      )}

      {storageSettings.isConnected &&
        storageSettings.system &&
        storageSettings.system !== 'Included storage' && (
          <AnimateSlideUp delay={0.4}>
            <Alert
              text={`Your ${storageSettings.system} account has been connected successfully.`}
              variant='green'
            />
          </AnimateSlideUp>
        )}
    </StepLayout>
  )
}

StepThree.displayName = 'StepThree'
export default StepThree
