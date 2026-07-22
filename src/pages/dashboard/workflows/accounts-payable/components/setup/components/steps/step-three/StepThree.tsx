import { useEffect } from 'react'
import Alert from '@/components/base/Alert'
import Button from '@/components/base/button/Button'
import { AnimateFadeIn, AnimateSlideUp } from '@/components/common/animations'
import setupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import authUserStore from '@/stores/authUserStore'
import { StepFooter, StepLayout } from '../components/StepLayout'
import StorageSystem from './components/StorageSystem'

const getStorageProvider = (system: string) => {
  if (system === 'Google Drive') return 'gcp'
  return system.toLowerCase()
}

const StepThree = () => {
  const setStep = setupStore((state) => state.setStep)
  const storageSettings = setupStore((state) => state.storageSettings)
  const setStorageSettings = setupStore((state) => state.setStorageSettings)
  const session = authUserStore((state) => state.session)

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (event.data.type === 'CONNECTION_SUCCESS') {
        const connector =
          typeof event.data.connector === 'string' ? event.data.connector : ''
        setStorageSettings({
          ...storageSettings,
          account: connector || session?.email || storageSettings.account || '',
          isConnected: true,
          isConnecting: false,
        })
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [session?.email, setStorageSettings, storageSettings])

  const handleConnect = () => {
    const tenantId = session?.tenantId

    setStorageSettings({
      ...storageSettings,
      isConnecting: true,
    })

    const now = new Date()
    const day = now.getDate().toString().padStart(2, '0')
    const month = now.toLocaleString('default', { month: 'short' })
    const year = now.getFullYear()
    const hours = now.getHours().toString().padStart(2, '0')
    const minutes = now.getMinutes().toString().padStart(2, '0')

    const provider = getStorageProvider(storageSettings.system)
    const connectionName = `${provider}-${day}${month}${year}-${hours}${minutes}`
    const url = `https://ezcloudauth.azurewebsites.net/api/authorize?tenantid=${tenantId}&envtype=trial&connectorname=${encodeURIComponent(connectionName)}&provider=${provider}&resulturl=${window.location.origin}/auth/`

    window.open(url, '_blank')
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
