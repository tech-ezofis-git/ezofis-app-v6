import { useEffect } from 'react'
import Alert from '@/components/base/Alert'
import Button from '@/components/base/button/Button'
import { AnimateFadeIn, AnimateSlideUp } from '@/components/common/animations'
import setupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import { openApOAuthAuthorize } from '@/pages/dashboard/workflows/accounts-payable/utils/oauthAuthorize'
import authUserStore from '@/stores/authUserStore'
import { StepFooter, StepLayout } from '../components/StepLayout'
import StorageSystem from './components/StorageSystem'

const StepThree = () => {
  const setStep = setupStore((state) => state.setStep)
  const storageSettings = setupStore((state) => state.storageSettings)
  const setStorageSettings = setupStore((state) => state.setStorageSettings)
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
      const current = setupStore.getState().storageSettings

      // Ignore late OAuth success after the user switched away from cloud storage
      if (
        !current.system ||
        current.system === 'Included storage' ||
        current.system === 'Default Storage' ||
        current.system === 'Available Storage'
      ) {
        return
      }

      setStorageSettings({
        ...current,
        account:
          externalAccountEmail ||
          connector ||
          session?.email ||
          current.account ||
          '',
        connectorId,
        isConnected: true,
        isConnecting: false,
      })
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [session?.email, setStorageSettings])

  const handleConnect = async () => {
    setStorageSettings({
      ...storageSettings,
      isConnecting: true,
    })

    const { error } = await openApOAuthAuthorize(storageSettings.system)
    if (error) {
      console.error(error)
      setStorageSettings({
        ...storageSettings,
        isConnecting: false,
      })
    }
  }

  return (
    <StepLayout
      description='Choose where to store your invoice documents. Data is securely encrypted and accessible 24/7.'
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
          {storageSettings.system &&
          storageSettings.system !== 'Included storage' &&
          !storageSettings.isConnected ? (
            <div className='flex items-center gap-3'>
              {storageSettings.isConnecting && (
                <Button
                  color='gray'
                  label='Cancel'
                  variant='outline'
                  onClick={() =>
                    setStorageSettings({
                      ...storageSettings,
                      isConnecting: false,
                    })
                  }
                />
              )}
              <Button
                icon='lucide:plug'
                label={`Connect ${storageSettings.system}`}
                loading={storageSettings.isConnecting}
                onClick={handleConnect}
              />
            </div>
          ) : (
            <Button
              label='Continue'
              suffixIcon='tabler:arrow-right'
              disabled={
                !(
                  storageSettings.system === 'Included storage' ||
                  storageSettings.isConnected
                )
              }
              onClick={() => setStep(3)}
            />
          )}
        </StepFooter>
      }
    >
      <AnimateFadeIn delay={0.3}>
        <StorageSystem />
      </AnimateFadeIn>

      {storageSettings.system === 'Included storage' && (
        <AnimateSlideUp delay={0.4}>
          <Alert
            text='Storage selected. Documents will be saved here once you begin processing.'
            variant='green'
          />
        </AnimateSlideUp>
      )}

      {storageSettings.isConnected &&
        storageSettings.system &&
        storageSettings.system !== 'Included storage' && (
          <AnimateSlideUp delay={0.4}>
            <Alert
              text={
                storageSettings.account
                  ? `Connected as ${storageSettings.account}`
                  : `Your ${storageSettings.system} account has been connected successfully.`
              }
              variant='green'
            />
          </AnimateSlideUp>
        )}
    </StepLayout>
  )
}

StepThree.displayName = 'StepThree'
export default StepThree
