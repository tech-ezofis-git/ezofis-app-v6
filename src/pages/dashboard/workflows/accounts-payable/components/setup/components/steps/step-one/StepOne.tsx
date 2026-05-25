import { useEffect } from 'react'
import Alert from '@/components/base/Alert'
import Button from '@/components/base/button/Button'
import Divider from '@/components/base/Divider'
import { AnimateFadeIn, AnimateSlideUp } from '@/components/common/animations'
import authUserStore from '@/stores/authUserStore'
import setupStore from '../../../../../stores/useSetupStore'
import { StepFooter, StepLayout } from '../components/StepLayout'
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
    const day = now.getDate().toString().padStart(2, '0')
    const month = now.toLocaleString('default', { month: 'short' })
    const year = now.getFullYear()
    const hours = now.getHours().toString().padStart(2, '0')
    const minutes = now.getMinutes().toString().padStart(2, '0')

    const tenantId = session.tenantId
    const provider = emailSettings.provider
    const connectionName = `${provider}-${day}${month}${year}-${hours}${minutes}`
    const location = window.location
    const url = `https://ezcloudauth.azurewebsites.net/api/authorize?tenantid=${tenantId}&envtype=trial&connectorname=${encodeURIComponent(connectionName)}&provider=${provider.toLowerCase()}&resulturl=${location.origin}/auth/`

    window.open(url, '_blank')
  }

  return (
    <StepLayout
      description='Choose how you want to capture invoices. Upload files manually or connect an email account for automatic processing.'
      title='Select the primary source for invoice processing'
      footer={
        <StepFooter align='end'>
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
        </StepFooter>
      }
    >
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
            text='Quick Drop selected. You can upload files directly in the next step.'
            variant='green'
          />
        </AnimateSlideUp>
      )}

      {emailSettings.provider === 'gmail' && !emailSettings.isConnected && (
        <AnimateSlideUp delay={0.4}>
          <Alert
            text='Gmail selected. Click Connect Gmail to link your account.'
            variant='primary'
          />
        </AnimateSlideUp>
      )}

      {emailSettings.provider === 'outlook' && !emailSettings.isConnected && (
        <AnimateSlideUp delay={0.4}>
          <Alert
            text='Outlook selected. Click Connect Outlook to link your account.'
            variant='primary'
          />
        </AnimateSlideUp>
      )}

      {emailSettings.isConnected &&
        emailSettings.provider !== 'DIRECT_UPLOAD' && (
          <AnimateSlideUp delay={0.4}>
            <Alert
              text={`Your ${emailSettings.provider.charAt(0).toUpperCase() + emailSettings.provider.slice(1)} account has been connected successfully.`}
              variant='green'
            />
          </AnimateSlideUp>
        )}
    </StepLayout>
  )
}

StepOne.displayName = 'StepOne'
export default StepOne
