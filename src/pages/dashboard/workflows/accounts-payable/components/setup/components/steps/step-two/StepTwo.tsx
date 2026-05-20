import { motion } from 'motion/react'
import Alert from '@/components/base/Alert'
import Button from '@/components/base/button/Button'
import Divider from '@/components/base/Divider'
import Title from '@/components/base/Title'
// import HeroText from '@/components/common/HeroText'
import { AnimateFadeIn, AnimateSlideUp } from '@/components/common/animations'
import setupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import ErpSettings from './components/ErpSettings'
import ErpSystem from './components/ErpSystem'

const StepTwo = () => {
  const setStep = setupStore((state) => state.setStep)
  const erpSettings = setupStore((state) => state.erpSettings)
  const setErpSettings = setupStore((state) => state.setErpSettings)

  const handleConnect = () => {
    setErpSettings({
      ...erpSettings,
      isConnecting: true,
    })
    setTimeout(() => {
      setErpSettings({
        ...erpSettings,
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
          description='Import your PO Master Data to ensure accurate matching. Upload a spreadsheet or connect your ERP system to synchronize records automatically.'
          title='Configure PO Master Data'
        />
      </AnimateSlideUp>

      <AnimateFadeIn delay={0.2}>
        <Divider />
      </AnimateFadeIn>
      <AnimateFadeIn delay={0.3}>
        <ErpSystem />
      </AnimateFadeIn>

      {erpSettings.system &&
        erpSettings.system !== 'FILE_BASED_IMPORT' &&
        !erpSettings.wantsFileBasedImport && (
          <AnimateFadeIn delay={0.4}>
            <>
              <Divider />
              <ErpSettings />
            </>
          </AnimateFadeIn>
        )}

      {erpSettings.templateUploaded && (
        <AnimateSlideUp delay={0.4}>
          <Alert
            text='Template uploaded successfully. You can proceed to the next step.'
            variant='green'
          />
        </AnimateSlideUp>
      )}

      {erpSettings.isConnected &&
        erpSettings.system &&
        erpSettings.system !== 'FILE_BASED_IMPORT' && (
          <AnimateSlideUp delay={0.4}>
            <Alert
              text={`Your ${erpSettings.system} account has been connected successfully.`}
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
          onClick={() => setStep(0)}
        />
        {erpSettings.isConnected ||
        erpSettings.templateUploaded ||
        (erpSettings.system && erpSettings.system === 'FILE_BASED_IMPORT') ? (
          <Button
            label='Continue'
            suffixIcon='tabler:arrow-right'
            onClick={() => setStep(2)}
          />
        ) : erpSettings.system && erpSettings.system !== 'FILE_BASED_IMPORT' ? (
          <Button
            icon='lucide:plug'
            label={`Connect ${erpSettings.system}`}
            loading={erpSettings.isConnecting}
            onClick={handleConnect}
          />
        ) : null}
      </motion.div>
    </div>
  )
}

StepTwo.displayName = 'StepTwo'
export default StepTwo
