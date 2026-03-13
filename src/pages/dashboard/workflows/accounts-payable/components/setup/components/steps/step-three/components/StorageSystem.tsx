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
// import Icon from '@/components/base/icon/Icon'
import setupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import BrandCard from '../../components/BrandCard'
import SectionHeader from '../../components/SectionHeader'

const includedStorageItem = {
  logo: StorageLogo,
  name: 'Default Storage',
  value: 'Included storage',
}

const cloudStorageProviders = [
  { logo: GoogleDriveLogo, name: 'Google Drive', value: 'Google Drive' },
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
    <div className='space-y-4'>
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
            logo={includedStorageItem.logo}
            name={includedStorageItem.name}
            value={includedStorageItem.value}
            onClick={() =>
              setStorageSettings({
                ...storageSettings,
                isConnected: true,
                system: includedStorageItem.value,
              })
            }
          />
        </AnimateSlideUp>
      </div>

      {/* Divider with (OR) */}
      <div className='flex items-center gap-4'>
        <div className='flex-1 border-t border-gray-3'></div>
        <span className='text-13 font-medium text-gray-10'>(OR)</span>
        <div className='flex-1 border-t border-gray-3'></div>
      </div>

      {/* Cloud Storage Section */}
      <div>
        <AnimateSlideUp delay={0.2}>
          <SectionHeader
            description='Connect your preferred cloud storage provider to securely store and manage invoice documents.'
            title='Cloud Storage'
          />
        </AnimateSlideUp>
        <div className='grid grid-cols-1 gap-2.5 sm:grid-cols-1'>
          {cloudStorageProviders.map((item, index) => {
            const AnimationComponent =
              animationVariants[index % animationVariants.length]
            return (
              <AnimationComponent delay={0.25 + index * 0.08} key={item.value}>
                <BrandCard
                  checked={storageSettings.system === item.value}
                  logo={item.logo}
                  name={item.name}
                  value={item.value}
                  onClick={() =>
                    setStorageSettings({
                      ...storageSettings,
                      isConnected: false,
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
