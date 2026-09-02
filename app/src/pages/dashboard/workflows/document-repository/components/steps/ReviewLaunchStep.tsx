import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { createRepository } from '@/api/createFolder'
import apiRouter from '@/api/apiRouter'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import showToast from '@/components/base/toast/showToast'
import {
  StepFooter,
  StepLayout,
} from '@/pages/dashboard/workflows/accounts-payable/components/setup/components/steps/components/StepLayout'
import apSetupPayloads from '@/pages/dashboard/workflows/accounts-payable/constants/apSetupPayloads.json'
import SuccessCelebration from '@/pages/dashboard/workflows/accounts-payable/components/setup/components/steps/step-four/components/SuccessCelebration'
import authUserStore from '@/stores/authUserStore'
import cn from '@/utils/cn'
import {
  dmsStorageOptions,
  isCloudStorageOption,
} from '../../folderSetupShared'
import useDmsSetupStore from '../../stores/useDmsSetupStore'

const buildCreateRepositoryPayload = ({
  description,
  fields,
  folderName,
  storageConnectorId,
  storageProviderCode,
}: {
  description: string
  fields: Array<{
    dataType: string
    fieldName: string
    includeInFolderStructure: boolean
    isMandatory: boolean
    level: number
    orderId: number
  }>
  folderName: string
  storageConnectorId: string | null
  storageProviderCode: string
}) => {
  const payload = JSON.parse(JSON.stringify(apSetupPayloads.folderPayload))
  const isEzofis = storageProviderCode === 'EZOFIS'

  payload.name = folderName
  payload.description = description
  payload.storageProviderCode = storageProviderCode
  payload.storageDrive = isEzofis ? null : storageConnectorId
  payload.isDefaultRepository = false
  payload.fields = fields.map((field, index) => ({
    dataType: field.dataType,
    includeInFolderStructure: field.includeInFolderStructure,
    isMandatory: field.isMandatory,
    level:
      field.level ||
      (field.includeInFolderStructure ? index + 1 : 0),
    name: field.fieldName,
    orderId: field.orderId ?? index + 1,
  }))

  return payload
}

const ReviewLaunchStep = () => {
  const navigate = useNavigate()
  const [showCelebration, setShowCelebration] = useState(false)

  const folderName = useDmsSetupStore((state) => state.folderName)
  const description = useDmsSetupStore((state) => state.description)
  const fields = useDmsSetupStore((state) => state.fields)
  const storageId = useDmsSetupStore((state) => state.storageId)
  const storageConnectorId = useDmsSetupStore(
    (state) => state.storageConnectorId,
  )
  const storageConnectorLabel = useDmsSetupStore(
    (state) => state.storageConnectorLabel,
  )
  const isSaving = useDmsSetupStore((state) => state.isSaving)
  const setIsSaving = useDmsSetupStore((state) => state.setIsSaving)
  const resetSetup = useDmsSetupStore((state) => state.resetSetup)
  const setIsSetupCompleted = useDmsSetupStore(
    (state) => state.setIsSetupCompleted,
  )
  const setIsSetupStarted = useDmsSetupStore((state) => state.setIsSetupStarted)
  const setShowConnectorError = useDmsSetupStore(
    (state) => state.setShowConnectorError,
  )
  const setStep = useDmsSetupStore((state) => state.setStep)

  const handleFinishDmsSetup = () => {
    setIsSetupStarted(false)
    resetSetup()
    navigate({ replace: true, to: '/folders' })
  }

  useEffect(() => {
    if (!showCelebration) return
    const timer = setTimeout(() => {
      handleFinishDmsSetup()
    }, 4500)
    return () => clearTimeout(timer)
  }, [showCelebration])

  const selectedStorage =
    dmsStorageOptions.find((item) => item.id === storageId) ??
    dmsStorageOptions[0]

  const structureFieldCount = fields.filter(
    (field) => field.includeInFolderStructure,
  ).length
  const detailFieldCount = fields.length - structureFieldCount

  const handleLaunch = async () => {
    const trimmedName = folderName.trim()
    if (!trimmedName) {
      showToast({ message: 'Folder name is required.', variant: 'error' })
      setStep(0)
      return
    }

    if (isCloudStorageOption(selectedStorage) && !storageConnectorId) {
      setShowConnectorError(true)
      setStep(2)
      return
    }

    setIsSaving(true)
    try {
      const payload = buildCreateRepositoryPayload({
        description: description.trim(),
        fields,
        folderName: trimmedName,
        storageConnectorId,
        storageProviderCode: selectedStorage.storageProviderCode,
      })

      const response = await createRepository(payload)

      if (response.error) {
        showToast({
          message: `Failed to create folder: ${response.error}`,
          variant: 'error',
        })
        return
      }

      // Save onboarding configuration status via API endpoint for DMS setup completion
      const userId = authUserStore.getState().session?.id || ''
      if (userId) {
        const configRes = await apiRouter.saveUserConfiguration(userId, {
          message: 'configuration:completed',
        })
        if (configRes.error) {
          showToast({
            message: `Failed to save configuration status: ${configRes.error}`,
            variant: 'error',
          })
          return
        }
        const session = authUserStore.getState().session
        if (session) {
          authUserStore.getState().setSession({
            ...session,
            configuration: 1,
          })
        }
      }

      setIsSetupCompleted(true)
      setShowCelebration(true)
    } catch (e: any) {
      console.error(e)
      showToast({
        message: `An unexpected error occurred: ${e.message || e}`,
        variant: 'error',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const isEzofisStorage = selectedStorage.storageProviderCode === 'EZOFIS'
  const storageTitle = isEzofisStorage
    ? 'EZOFIS Storage'
    : selectedStorage.title
  const storageSubtitle = isEzofisStorage
    ? 'Connected to store the documents'
    : storageConnectorLabel || selectedStorage.subtitle

  if (showCelebration) {
    return (
      <SuccessCelebration
        buttonIcon='tabler:folder'
        buttonLabel='Go to Folders'
        description='Your folder is ready. Documents can now be stored and organized with your configured fields and storage.'
        loadingLabel='Opening folders...'
        title='DMS folder setup successful!'
        onCreateRequest={handleFinishDmsSetup}
      />
    )
  }

  return (
    <StepLayout
      description='Take a quick look at your choices. When everything looks right, create the folder.'
      title='Ready to create your folder?'
      footer={
        <StepFooter>
          <Button
            color='gray'
            disabled={isSaving}
            icon='lucide:arrow-left'
            label='Back'
            variant='outline'
            onClick={() => setStep(2)}
          />
          <Button
            disabled={isSaving}
            label={isSaving ? 'Creating…' : 'Create folder'}
            loading={isSaving}
            suffixIcon='lucide:check'
            onClick={() => {
              void handleLaunch()
            }}
          />
        </StepFooter>
      }
    >
      <div className='space-y-4'>
        <div className='rounded-xl border border-gray-3 bg-surface p-5 shadow-sm'>
          <div className='flex items-start gap-3.5'>
            <div className='flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary-2 text-primary-11'>
              <Icon className='size-5' name='tabler:folder' />
            </div>
            <div className='min-w-0 flex-1'>
              <p className='text-11 font-semibold tracking-wide text-gray-10 uppercase'>
                Folder
              </p>
              <h3 className='mt-1 truncate text-16 font-semibold text-gray-13'>
                {folderName.trim() || 'Untitled folder'}
              </h3>
              <p className='mt-1.5 text-13 leading-relaxed text-gray-11'>
                {description.trim() || 'No description added'}
              </p>
            </div>
            <button
              className='shrink-0 rounded-md px-2 py-1 text-12 font-medium text-primary-11 transition hover:bg-primary-2'
              type='button'
              onClick={() => setStep(0)}
            >
              Edit
            </button>
          </div>
        </div>

        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
          <ReviewSummaryCard
            icon='tabler:list-details'
            iconClassName='bg-blue-2 text-blue-11'
            label='Configured fields'
            onEdit={() => setStep(1)}
            subtitle={
              fields.length === 0
                ? 'No fields added yet'
                : [
                    structureFieldCount > 0
                      ? `${structureFieldCount} structure`
                      : null,
                    detailFieldCount > 0 ? `${detailFieldCount} detail` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')
            }
            title={
              fields.length === 0
                ? '0 fields'
                : `${fields.length} field${fields.length === 1 ? '' : 's'}`
            }
          />

          <ReviewSummaryCard
            icon={selectedStorage.logo ? undefined : 'tabler:cloud'}
            iconClassName='bg-green-2 text-green-11'
            label='Storage'
            logo={selectedStorage.logo}
            onEdit={() => setStep(2)}
            subtitle={storageSubtitle}
            title={storageTitle}
          />
        </div>
      </div>
    </StepLayout>
  )
}

function ReviewSummaryCard({
  icon,
  iconClassName,
  label,
  logo,
  onEdit,
  subtitle,
  title,
}: {
  icon?: string
  iconClassName: string
  label: string
  logo?: string
  onEdit: () => void
  subtitle: string
  title: string
}) {
  return (
    <div className='rounded-xl border border-gray-3 bg-surface p-4 shadow-sm'>
      <div className='flex items-start justify-between gap-2'>
        <p className='text-11 font-semibold tracking-wide text-gray-10 uppercase'>
          {label}
        </p>
        <button
          className='shrink-0 rounded-md px-2 py-0.5 text-12 font-medium text-primary-11 transition hover:bg-primary-2'
          type='button'
          onClick={onEdit}
        >
          Edit
        </button>
      </div>

      <div className='mt-3 flex items-center gap-3'>
        <div
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-lg',
            iconClassName,
          )}
        >
          {logo ? (
            <img alt='' className='size-5 object-contain' src={logo} />
          ) : (
            <Icon className='size-5' name={icon || 'tabler:box'} />
          )}
        </div>
        <div className='min-w-0'>
          <p className='truncate text-14 font-semibold text-gray-13'>{title}</p>
          <p className='mt-0.5 truncate text-12 text-gray-10'>{subtitle}</p>
        </div>
      </div>
    </div>
  )
}

ReviewLaunchStep.displayName = 'ReviewLaunchStep'
export default ReviewLaunchStep
