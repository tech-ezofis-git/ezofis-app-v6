import AmazonLogo from '@/assets/brands/amazon.svg'
import DropboxLogo from '@/assets/brands/dropbox.svg'
import GoogleDriveLogo from '@/assets/brands/googledrive.svg'
import OneDriveLogo from '@/assets/brands/onedrive.svg'
import Title from '@/components/base/Title'
import setupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import BrandCard from '../../components/BrandCard'

const items = [
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

  return (
    <div>
      <Title
        className='mb-6'
        description='Select your preferred storage provider to securely store and manage invoice documents.'
        level={3}
        title='Choose Your Storage System'
      />

      <div className='grid grid-cols-1 gap-2 md:grid-cols-2'>
        {items.map((item) => (
          <BrandCard
            checked={storageSettings.system === item.value}
            key={item.value}
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
        ))}
      </div>
    </div>
  )
}

StorageSystem.displayName = 'StorageSystem'
export default StorageSystem
