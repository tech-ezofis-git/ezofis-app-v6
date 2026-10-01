import Button from '@/components/base/button/Button'
import BrandCard from '@/pages/dashboard/workflows/accounts-payable/components/setup/components/steps/components/BrandCard'
import SectionHeader from '@/pages/dashboard/workflows/accounts-payable/components/setup/components/steps/components/SectionHeader'
import {
  OrDivider,
  StepFooter,
  StepLayout,
} from '@/pages/dashboard/workflows/accounts-payable/components/setup/components/steps/components/StepLayout'
import FolderStorageConnectorPanel from '@/pages/settings/components/Folders/FolderStorageConnectorPanel'
import cn from '@/utils/cn'
import {
  dmsStorageOptions,
  isCloudStorageOption,
} from '../../folderSetupShared'
import useDmsSetupStore from '../../stores/useDmsSetupStore'

const StorageStep = () => {
  const storageId = useDmsSetupStore((state) => state.storageId)
  const storageConnectorId = useDmsSetupStore(
    (state) => state.storageConnectorId,
  )
  const storageConnectorLabel = useDmsSetupStore(
    (state) => state.storageConnectorLabel,
  )
  const showConnectorError = useDmsSetupStore(
    (state) => state.showConnectorError,
  )
  const setStorageSelection = useDmsSetupStore(
    (state) => state.setStorageSelection,
  )
  const setStorageConnector = useDmsSetupStore(
    (state) => state.setStorageConnector,
  )
  const setShowConnectorError = useDmsSetupStore(
    (state) => state.setShowConnectorError,
  )
  const setStep = useDmsSetupStore((state) => state.setStep)

  const defaultStorage = dmsStorageOptions[0]
  const cloudStorageOptions = dmsStorageOptions.filter(
    (item) => item.id !== defaultStorage.id,
  )
  const selectedStorage =
    dmsStorageOptions.find((item) => item.id === storageId) ?? defaultStorage
  const isCloudSelected = isCloudStorageOption(selectedStorage)

  const handleContinue = () => {
    if (isCloudSelected && !storageConnectorId) {
      setShowConnectorError(true)
      return
    }
    setStep(3)
  }

  return (
    <StepLayout
      description='Pick where your documents will be saved. You can use our built-in storage or connect a cloud account.'
      title='Where should files be stored?'
      footer={
        <StepFooter>
          <Button
            color='gray'
            icon='lucide:arrow-left'
            label='Back'
            variant='outline'
            onClick={() => setStep(1)}
          />
          <Button
            label='Continue'
            suffixIcon='lucide:arrow-right'
            onClick={handleContinue}
          />
        </StepFooter>
      }
    >
      <div className='space-y-6'>
        <div>
          <SectionHeader
            description='Ready to use — no extra setup needed.'
            title='Built-in storage'
          />
          <BrandCard
            checked={storageId === defaultStorage.id}
            connected={storageId === defaultStorage.id}
            description={defaultStorage.description}
            logo={defaultStorage.logo}
            name={defaultStorage.title}
            value={defaultStorage.id}
            onClick={() =>
              setStorageSelection(
                defaultStorage.id,
                defaultStorage.storageProviderCode,
              )
            }
          />
        </div>

        <OrDivider />

        <div>
          <SectionHeader
            description='Save documents in OneDrive, Google Drive, or another cloud service.'
            title='Connect cloud storage'
          />
          <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
            {cloudStorageOptions.map((item) => {
              const isSelected = storageId === item.id
              const isDisabled = item.comingSoon

              return (
                <div
                  className={cn(isDisabled && 'pointer-events-none opacity-60')}
                  key={item.id}
                >
                  <BrandCard
                    checked={isSelected}
                    icon={item.icon}
                    logo={item.logo}
                    name={item.title}
                    value={item.id}
                    connected={
                      isSelected && Boolean(storageConnectorId) && !isDisabled
                    }
                    description={
                      isDisabled
                        ? 'Coming soon'
                        : isSelected && storageConnectorId
                          ? storageConnectorLabel || 'Connected'
                          : item.description
                    }
                    onClick={() => {
                      if (!isDisabled) {
                        setStorageSelection(item.id, item.storageProviderCode)
                      }
                    }}
                  />
                </div>
              )
            })}
          </div>
        </div>

        {isCloudSelected ? (
          <FolderStorageConnectorPanel
            connectorId={storageConnectorId}
            connectorLabel={storageConnectorLabel}
            option={selectedStorage}
            required
            error={
              showConnectorError
                ? 'Please fill the required field: Connector'
                : undefined
            }
            onConnectorChange={setStorageConnector}
          />
        ) : null}
      </div>
    </StepLayout>
  )
}

StorageStep.displayName = 'StorageStep'
export default StorageStep
