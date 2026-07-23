import { useEffect } from 'react'
// import AmazonLogo from '@/assets/brands/amazon.svg'
// import DropboxLogo from '@/assets/brands/dropbox.svg'
import GoogleDriveLogo from '@/assets/brands/googledrive.svg'
// import OneDriveLogo from '@/assets/brands/onedrive.svg'
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

const includedStorageItem = {
  description:
    'Default storage option provided with your account for immediate access.',
  logo: StorageLogo,
  name: 'Use secure cloud storage',
  value: 'Included storage',
}

const cloudStorageProviders: Array<{
  description: string
  name: string
  value: string
  icon?: string
  logo?: string
}> = [
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
  // { logo: OneDriveLogo, name: 'OneDrive', value: 'OneDrive' },
  // {
  //   logo: DropboxLogo,
  //   name: 'Dropbox',
  //   value: 'Dropbox',
  // },
  // { logo: AmazonLogo, name: 'Amazon S3', value: 'Amazon S3' },
]

const StorageSystem = () => {
  const storageSettings = setupStore((state) => state.storageSettings)
  const setStorageSettings = setupStore((state) => state.setStorageSettings)

  // Set default to "Included storage" if no system is selected
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

  const animationVariants = [
    AnimateSlideUp,
    AnimateScale,
    AnimateBounce,
    AnimateRotate,
    AnimateFadeIn,
  ]

  return (
    <div className='space-y-6'>
      {/* Default Storage Section */}
      <div>
        <AnimateSlideUp delay={0.1}>
          <SectionHeader
            description='Use the default storage option provided with your account.'
            title='Default Storage'
          />
        </AnimateSlideUp>
        <AnimateSlideUp delay={0.15}>
          <BrandCard
            checked={storageSettings.system === includedStorageItem.value}
            description={includedStorageItem.description}
            logo={includedStorageItem.logo}
            name={includedStorageItem.name}
            value={includedStorageItem.value}
            onClick={() =>
              setStorageSettings({
                ...storageSettings,
                account: '',
                connectorId: '',
                isConnected: true,
                isConnecting: false,
                system: includedStorageItem.value,
              })
            }
          />
        </AnimateSlideUp>
      </div>

      <OrDivider />

      {/* Cloud Storage Section */}
      <div>
        <AnimateSlideUp delay={0.2}>
          <SectionHeader
            description='Connect your provider to securely store and manage invoice documents.'
            title='Cloud Integrations'
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
                    setStorageSettings({
                      ...storageSettings,
                      account: '',
                      connectorId: '',
                      isConnected: false,
                      isConnecting: false,
                      system: item.value,
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
