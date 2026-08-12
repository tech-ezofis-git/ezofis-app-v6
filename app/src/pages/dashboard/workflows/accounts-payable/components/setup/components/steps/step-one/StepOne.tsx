import { useLingui } from '@lingui/react/macro'
import { useEffect } from 'react'
import Alert from '@/components/base/Alert'
import Button from '@/components/base/button/Button'
import Divider from '@/components/base/Divider'
import { AnimateFadeIn, AnimateSlideUp } from '@/components/common/animations'
import { openApOAuthAuthorize } from '@/pages/dashboard/workflows/accounts-payable/utils/oauthAuthorize'
import authUserStore from '@/stores/authUserStore'
import setupStore from '../../../../../stores/useSetupStore'
import { StepFooter, StepLayout } from '../components/StepLayout'
import ImapSettings from './components/ImapSettings'
import ProviderSettings from './components/ProviderSettings'

const StepOne = () => {
  const { t } = useLingui()
  const setStep = setupStore((state) => state.setStep)
  const emailSettings = setupStore((state) => state.emailSettings)
  const setEmailSettings = setupStore((state) => state.setEmailSettings)
  const session = authUserStore((state) => state.session)

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (event.data.type !== 'CONNECTION_SUCCESS') return

      const externalAccountEmail =
        typeof event.data.externalAccountEmail === 'string'
          ? event.data.externalAccountEmail
          : typeof event.data.email === 'string'
            ? event.data.email
            : ''
      const connectorId =
        typeof event.data.connectorId === 'string'
          ? event.data.connectorId
          : ''
      const connector =
        typeof event.data.connector === 'string' ? event.data.connector : ''
      const current = setupStore.getState().emailSettings
      const connectedEmail =
        externalAccountEmail || session?.email || current.email || ''

      if (
        !current.provider ||
        current.provider === 'DIRECT_UPLOAD' ||
        current.provider === 'Custom'
      ) {
        return
      }

      setEmailSettings({
        ...current,
        account: connectedEmail || connector,
        connectorId,
        email: connectedEmail,
        isConnected: true,
        isConnecting: false,
      })
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [session?.email, setEmailSettings])

  const handleConnect = async () => {
    setEmailSettings({
      ...emailSettings,
      isConnecting: true,
    })

    const { error } = await openApOAuthAuthorize(emailSettings.provider)
    if (error) {
      console.error(error)
      setEmailSettings({
        ...emailSettings,
        isConnecting: false,
      })
    }
  }

  const providerLabel = emailSettings.provider
    ? emailSettings.provider.charAt(0).toUpperCase() +
      emailSettings.provider.slice(1)
    : ''

  return (
    <StepLayout
      description={t`Pick how you'll import invoices to get started. You can change this later in settings.`}
      title={t`Let's set up your AP workflow`}
      footer={
        <StepFooter align='end'>
          {emailSettings.isConnected ? (
            <Button
              key='continue-button'
              label={t`Continue`}
              suffixIcon='tabler:arrow-right'
              onClick={() => setStep(1)}
            />
          ) : (
            <div className='flex items-center gap-3'>
              {emailSettings.isConnecting && (
                <Button
                  color='gray'
                  label={t`Cancel`}
                  variant='outline'
                  onClick={() =>
                    setEmailSettings({ ...emailSettings, isConnecting: false })
                  }
                />
              )}
              <Button
                disabled={!emailSettings.provider}
                icon='lucide:plug'
                key='connect-button'
                loading={emailSettings.isConnecting}
                label={
                  emailSettings.provider
                    ? t`Connect ${providerLabel}`
                    : t`Select an integration`
                }
                onClick={handleConnect}
              />
            </div>
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
            text={t`Quick Drop selected. You'll be able to upload your first invoices once your setup is complete.`}
            variant='green'
          />
        </AnimateSlideUp>
      )}

      {emailSettings.provider === 'gmail' && !emailSettings.isConnected && (
        <AnimateSlideUp delay={0.4}>
          <Alert
            text={t`Gmail selected. Click Connect Gmail to link your account.`}
            variant='primary'
          />
        </AnimateSlideUp>
      )}

      {emailSettings.provider === 'outlook' && !emailSettings.isConnected && (
        <AnimateSlideUp delay={0.4}>
          <Alert
            text={t`Outlook selected. Click Connect Outlook to link your account.`}
            variant='primary'
          />
        </AnimateSlideUp>
      )}

      {emailSettings.isConnected &&
        emailSettings.provider !== 'DIRECT_UPLOAD' && (
          <AnimateSlideUp delay={0.4}>
            <Alert
              text={t`Invoice emails will be read from this inbox and sent for processing automatically.`}
              variant='green'
            />
          </AnimateSlideUp>
        )}
    </StepLayout>
  )
}

StepOne.displayName = 'StepOne'
export default StepOne
