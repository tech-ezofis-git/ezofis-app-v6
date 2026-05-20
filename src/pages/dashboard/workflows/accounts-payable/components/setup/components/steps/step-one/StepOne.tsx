import { motion } from 'motion/react'
import { useEffect } from 'react'
import Alert from '@/components/base/Alert'
import Button from '@/components/base/button/Button'
import Divider from '@/components/base/Divider'
import Title from '@/components/base/Title'
import { AnimateFadeIn, AnimateSlideUp } from '@/components/common/animations'
import authUserStore from '@/stores/authUserStore'
import setupStore from '../../../../../stores/useSetupStore'
import ImapSettings from './components/ImapSettings'
import ProviderSettings from './components/ProviderSettings'

const StepOne = () => {
  const setStep = setupStore((state) => state.setStep)
  const emailSettings = setupStore((state) => state.emailSettings)
  const setEmailSettings = setupStore((state) => state.setEmailSettings)
  const session = authUserStore((state) => state.session)

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (event.data.type === 'CONNECTION_SUCCESS') {
        setEmailSettings({
          ...emailSettings,
          isConnected: true,
          isConnecting: false,
          // You might want to store the connector name or other details if needed
          // provider: provider // active provider is already set
        })
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [emailSettings, setEmailSettings])

  const handleConnect = () => {
    if (!session?.tenantId) {
      console.error('Tenant ID missing')
      return
    }

    setEmailSettings({
      ...emailSettings,
      isConnecting: true,
    })

    const now = new Date()
    // 19/Feb/2026 -> 19Feb2026
    const day = now.getDate().toString().padStart(2, '0')
    const month = now.toLocaleString('default', { month: 'short' })
    const year = now.getFullYear()
    const hours = now.getHours().toString().padStart(2, '0')
    const minutes = now.getMinutes().toString().padStart(2, '0')

    const tenantId = session.tenantId
    const provider = emailSettings.provider
    // Format: gmail-19Feb2026-1430
    const connectionName = `${provider}-${day}${month}${year}-${hours}${minutes}`
    const location = window.location
    const url = `https://ezcloudauth.azurewebsites.net/api/authorize?tenantid=${tenantId}&envtype=trial&connectorname=${encodeURIComponent(connectionName)}&provider=${provider.toLowerCase()}&resulturl=${location.origin}/auth/`

    window.open(url, '_blank')
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

      {emailSettings.isConnected &&
        emailSettings.provider !== 'DIRECT_UPLOAD' && (
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
        {emailSettings.isConnected ? (
          <Button
            key='continue-button'
            label='Continue'
            suffixIcon='tabler:arrow-right'
            onClick={() => setStep(1)}
          />
        ) : (
          <Button
            disabled={!emailSettings.provider}
            icon='lucide:plug'
            key='connect-button'
            loading={emailSettings.isConnecting}
            label={
              emailSettings.provider
                ? `Connect ${emailSettings.provider.charAt(0).toUpperCase() + emailSettings.provider.slice(1)}`
                : 'Select an integration'
            }
            onClick={handleConnect}
          />
        )}
      </motion.div>
    </div>
  )
}

StepOne.displayName = 'StepOne'
export default StepOne
