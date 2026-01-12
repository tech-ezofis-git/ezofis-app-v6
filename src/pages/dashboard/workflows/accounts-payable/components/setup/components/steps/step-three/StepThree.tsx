import { motion } from 'motion/react'
import Alert from '@/components/base/Alert'
import Button from '@/components/base/button/Button'
import Divider from '@/components/base/Divider'
import Title from '@/components/base/Title'
import { AnimateFadeIn, AnimateSlideUp } from '@/components/common/animations'
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
    <div className='flex min-h-full w-full flex-col gap-4 px-6 py-4 md:px-8'>
      <AnimateSlideUp delay={0.1}>
        <Title
          className='items-start text-left'
          description='Select where to store your invoice documents. Use included storage or connect a cloud provider.'
          title='Select Storage'
        />
      </AnimateSlideUp>

      <AnimateFadeIn delay={0.2}>
        <Divider />
      </AnimateFadeIn>
      <AnimateFadeIn delay={0.3}>
        <StorageSystem />
      </AnimateFadeIn>

      {storageSettings.system && storageSettings.system !== 'Included storage' && (
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

      {storageSettings.isConnected && storageSettings.system && storageSettings.system !== 'Included storage' && (
        <AnimateSlideUp delay={0.4}>
          <Alert
            text={`Your ${storageSettings.system} account has been connected successfully.`}
            variant='green'
          />
        </AnimateSlideUp>
      )}

      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className='flex flex-wrap items-center justify-between gap-2 border-t border-gray-3 pt-4'
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.5, duration: 0.4 }}
      >
        <Button
          color='gray'
          icon='lucide:arrow-left'
          label='Back'
          variant='outline'
          onClick={() => setStep(1)}
        />
        {storageSettings.system === 'Included storage' || storageSettings.isConnected ? (
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
      </motion.div>
    </div>
  )
}

StepThree.displayName = 'StepThree'
export default StepThree