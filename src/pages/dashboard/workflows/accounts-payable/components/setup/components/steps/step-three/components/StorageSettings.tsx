import InputText from '@/components/base/inputs/InputText'
import Title from '@/components/base/Title'
import setupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'

const StorageSettings = () => {
  const storageSettings = setupStore((state) => state.storageSettings)
  const setStorageSettings = setupStore((state) => state.setStorageSettings)

  return (
    <div>
      <Title
        className='mb-6'
        description='Configure authentication and connection details to enable secure document access and syncing.'
        level={3}
        title='Storage Settings'
      />

      <div className='grid grid-cols-1 gap-2 md:grid-cols-2'>
        <InputText
          label='API URL'
          value={storageSettings.apiUrl}
          required
          onChange={(value) =>
            setStorageSettings({ ...storageSettings, apiUrl: value })
          }
        />

        <InputText
          label='API Key'
          value={storageSettings.apiKey}
          required
          onChange={(value) =>
            setStorageSettings({ ...storageSettings, apiKey: value })
          }
        />
      </div>
    </div>
  )
}

StorageSettings.displayName = 'StorageSettings'
export default StorageSettings