import { useLingui } from '@lingui/react/macro'
import InputText from '@/components/base/inputs/InputText'
import setupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import SectionHeader from '../../components/SectionHeader'

const StorageSettings = () => {
  const storageSettings = setupStore((state) => state.storageSettings)
  const setStorageSettings = setupStore((state) => state.setStorageSettings)

  return (
    <div>
      <SectionHeader
        description='Configure authentication and connection details to enable secure document access and syncing.'
        title={t`Storage Settings`}
      />

      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        <InputText
          label={t`API URL`}
          value={storageSettings.apiUrl}
          required
          onChange={(value) =>
            setStorageSettings({ ...storageSettings, apiUrl: value })
          }
        />

        <InputText
          label={t`API Key`}
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
