import { useLingui } from '@lingui/react/macro'
import { useEffect, useState } from 'react'
// import AmazonLogo from '@/assets/brands/amazon.svg'
// import DropboxLogo from '@/assets/brands/dropbox.svg'
import GoogleDriveLogo from '@/assets/brands/googledrive.svg'
import OneDriveLogo from '@/assets/brands/onedrive.svg'
import StorageLogo from '@/assets/brands/storage.svg'
import {
  AnimateBounce,
  AnimateFadeIn,
  AnimateRotate,
  AnimateScale,
  AnimateSlideUp,
} from '@/components/common/animations'
import setupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import BrandCard from '../../components/BrandCard'
import SectionHeader from '../../components/SectionHeader'
import { OrDivider } from '../../components/StepLayout'
import SwitchIntegrationConfirm from '../../components/SwitchIntegrationConfirm'

const includedStorageItem = {
  description:
    'Default storage option provided with your account for immediate access.',
  logo: StorageLogo,
  name: 'Use secure cloud storage',
  value: 'Included storage',
}

const cloudStorageProviders: Array<{
  description: string
  icon?: string
  logo?: string
  name: string
  value: string
}> = [
  {
    description: 'Store invoice documents in OneDrive.',
    logo: OneDriveLogo,
    name: 'OneDrive',
    value: 'OneDrive',
  },
  {
    description: 'Store invoice documents in Google Drive.',
    logo: GoogleDriveLogo,
    name: 'Google Drive',
    value: 'Google Drive',
  },
  {
    description: 'Store invoice documents in Google Cloud Storage.',
    icon: 'logos:google-cloud',
    name: 'GCP',
    value: 'GCP',
  },
]

const getStorageLabel = (value: string) => {
  if (value === includedStorageItem.value) return includedStorageItem.name
  return cloudStorageProviders.find((p) => p.value === value)?.name || value
}

const StorageSystem = () => {
  const { t } = useLingui()
  const storageSettings = setupStore((state) => state.storageSettings)
  const setStorageSettings = setupStore((state) => state.setStorageSettings)
  const [pendingSwitch, setPendingSwitch] = useState<{
    name: string
    apply: () => void
  } | null>(null)

  const animationVariants = [
    AnimateSlideUp,
    AnimateScale,
    AnimateBounce,
    AnimateRotate,
    AnimateFadeIn,
  ]

  useEffect(() => {
    if (
      !storageSettings.system ||
      storageSettings.system === 'Default Storage' ||
      storageSettings.system === 'Available Storage'
    ) {
      setStorageSettings({
        ...storageSettings,
        isConnected: true,
        system: 'Included storage',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const requestSwitch = (
    nextValue: string,
    nextName: string,
    apply: () => void,
  ) => {
    if (storageSettings.system === nextValue) return

    const needsConfirm =
      storageSettings.isConnected &&
      storageSettings.system !== 'Included storage' &&
      storageSettings.system !== nextValue

    if (needsConfirm) {
      setPendingSwitch({ apply, name: nextName })
      return
    }

    apply()
  }

  return (
    <div className='space-y-6'>
      <SwitchIntegrationConfirm
        currentName={getStorageLabel(storageSettings.system)}
        nextName={pendingSwitch?.name}
        opened={Boolean(pendingSwitch)}
        onCancel={() => setPendingSwitch(null)}
        onConfirm={() => {
          pendingSwitch?.apply()
          setPendingSwitch(null)
        }}
      />

      {/* Default Storage Section */}
      <div>
        <AnimateSlideUp delay={0.1}>
          <SectionHeader
            description={t`Use built-in secure storage for invoice documents.`}
            title={t`Default Storage`}
          />
        </AnimateSlideUp>
        <AnimateSlideUp delay={0.15}>
          <BrandCard
            checked={storageSettings.system === includedStorageItem.value}
            description={includedStorageItem.description}
            logo={includedStorageItem.logo}
            name={includedStorageItem.name}
            value={includedStorageItem.value}
            connected={
              storageSettings.system === includedStorageItem.value &&
              storageSettings.isConnected
            }
            onClick={() =>
              requestSwitch(
                includedStorageItem.value,
                includedStorageItem.name,
                () => {
                  const current = setupStore.getState().storageSettings
                  setStorageSettings({
                    ...current,
                    account: '',
                    connectorId: '',
                    isConnected: true,
                    isConnecting: false,
                    system: includedStorageItem.value,
                  })
                },
              )
            }
          />
        </AnimateSlideUp>
      </div>

      <OrDivider />

      {/* Cloud Storage Section */}
      <div>
        <AnimateSlideUp delay={0.2}>
          <SectionHeader
            description={t`Connect your provider to securely store and manage invoice documents.`}
            title={t`Cloud Integrations`}
          />
        </AnimateSlideUp>
        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
          {cloudStorageProviders.map((item, index) => {
            const AnimationComponent =
              animationVariants[index % animationVariants.length]
            const isSelected = storageSettings.system === item.value
            return (
              <AnimationComponent delay={0.25 + index * 0.08} key={item.value}>
                <BrandCard
                  checked={isSelected}
                  connected={isSelected && storageSettings.isConnected}
                  icon={item.icon}
                  logo={item.logo}
                  name={item.name}
                  value={item.value}
                  description={
                    isSelected && storageSettings.isConnected
                      ? storageSettings.account || 'Connected'
                      : item.description
                  }
                  onClick={() =>
                    requestSwitch(item.value, item.name, () => {
                      const current = setupStore.getState().storageSettings
                      setStorageSettings({
                        ...current,
                        account: '',
                        connectorId: '',
                        isConnected: false,
                        isConnecting: false,
                        system: item.value,
                      })
                    })
                  }
                />
              </AnimationComponent>
            )
          })}
        </div>
      </div>
    </div>
  )
}

StorageSystem.displayName = 'StorageSystem'
export default StorageSystem
