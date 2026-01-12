import { motion } from 'motion/react'
import Alert from '@/components/base/Alert'
import Button from '@/components/base/button/Button'
import Divider from '@/components/base/Divider'
import Title from '@/components/base/Title'
import { AnimateFadeIn, AnimateSlideUp } from '@/components/common/animations'
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
    <div className='flex min-h-full w-full flex-col gap-4 px-6 py-4 md:px-8'>
      <AnimateSlideUp delay={0.1}>
        <Title
          className='items-start text-left'
          description='Choose how you want to capture invoices. Upload files manually or connect an email account for automatic processing.'
          title='Select the primary source for invoice processing'
        />
      </AnimateSlideUp>
      <AnimateFadeIn delay={0.2}>
        <Divider />
      </AnimateFadeIn>
      <AnimateFadeIn delay={0.3}>
        <ProviderSettings />
      </AnimateFadeIn>

      {emailSettings.provider === 'Custom' && (
        <AnimateFadeIn delay={0.4}>
          <>
            <Divider />
            <ImapSettings />
          </>
        </AnimateFadeIn>
      )}

      {emailSettings.provider === 'DIRECT_UPLOAD' && (
        <AnimateSlideUp delay={0.4}>
          <Alert
            text='You can upload files directly in the next step.'
            variant='green'
          />
        </AnimateSlideUp>
      )}

      {emailSettings.isConnected && emailSettings.provider !== 'DIRECT_UPLOAD' && (
        <AnimateSlideUp delay={0.4}>
          <Alert
            text={`Your ${emailSettings.provider} account has been connected successfully.`}
            variant='green'
          />
        </AnimateSlideUp>
      )}

      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className='flex flex-wrap items-center justify-end gap-2 border-t border-gray-3 pt-4'
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.5, duration: 0.4 }}
      >
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
      </motion.div>
    </div>
  )
}

StepOne.displayName = 'StepOne'
export default StepOne