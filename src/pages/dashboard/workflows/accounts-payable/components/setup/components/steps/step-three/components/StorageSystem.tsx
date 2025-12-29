import { useEffect } from 'react'
import AmazonLogo from '@/assets/brands/amazon.svg'
import DropboxLogo from '@/assets/brands/dropbox.svg'
import GoogleDriveLogo from '@/assets/brands/googledrive.svg'
import OneDriveLogo from '@/assets/brands/onedrive.svg'
import StorageLogo from '@/assets/brands/storage.svg'
// import Icon from '@/components/base/icon/Icon'
import setupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import BrandCard from '../../components/BrandCard'
import SectionHeader from '../../components/SectionHeader'

const items = [
  {
    logo: StorageLogo,
    name: 'Available storage (Free)',
    value: 'Included storage',
    description: '512 MB',
  },
  { logo: GoogleDriveLogo, name: 'Google Drive', value: 'Google Drive' },
  { logo: OneDriveLogo, name: 'OneDrive', value: 'OneDrive' },
  {
    logo: DropboxLogo,
    name: 'Dropbox',
    value: 'Dropbox',
  },
  { logo: AmazonLogo, name: 'Amazon S3', value: 'Amazon S3' },
]

const StorageSystem = () => {
  const storageSettings = setupStore((state) => state.storageSettings)
  const setStorageSettings = setupStore((state) => state.setStorageSettings)

  // Set default to "Included storage" if no system is selected
  useEffect(() => {
    if (!storageSettings.system) {
      setStorageSettings({
        ...storageSettings,
        system: 'Included storage',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div>
      <SectionHeader
        description='Select your preferred storage provider to securely store and manage invoice documents.'
        title='Choose Your Storage System'
      />

      <div className='grid grid-cols-1 gap-2.5 sm:grid-cols-2'>
        {items.map((item) => (
          <BrandCard
            checked={storageSettings.system === item.value}
            description={item.description}
            //icon={item.icon}
            key={item.value}
            logo={item.logo}
            name={item.name}
            value={item.value}
            onClick={() =>
              setStorageSettings({
                ...storageSettings,
                isConnected: item.value === 'Included storage',
                system: item.value,
              })
            }
          />
        ))}
      </div>
    </div>
  )
}

StorageSystem.displayName = 'StorageSystem'
export default StorageSystem
