import {
  createColumnHelper,
  useReactTable,
} from '@tanstack/react-table'
import { Combobox as MantineCombobox, useCombobox } from '@mantine/core'
import {
  Check,
  Folder,
  Link2,
} from 'lucide-react'
import {
  useCallback,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import GoogleDriveLogo from '@/assets/brands/googledrive.svg'
import OneDriveLogo from '@/assets/brands/onedrive.svg'
import { getRepositorys } from '@/api/v6/folder/folder'
import { createRepository } from '@/api/createFolder'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import DataTable from '@/components/base/data-table/DataTable'
import InputCheckbox from '@/components/base/inputs/InputCheckbox'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputText from '@/components/base/inputs/InputText'
import InputTextarea from '@/components/base/inputs/InputTextarea'
import showToast from '@/components/base/toast/showToast'
import Menu from '@/components/base/menu/Menu'
import MenuItem from '@/components/base/menu/MenuItem'
import ComboboxOptions from '@/components/base/inputs/select/ComboboxOptions'
import ComboboxSearch from '@/components/base/inputs/select/ComboboxSearch'
import useLocalSearch from '@/components/base/inputs/shared/hooks/useLocalSearch'
import { classNames as inputSharedClassNames } from '@/components/base/inputs/shared/constants'
import type { Option } from '@/types/option'
import { getUsers } from '@/api/v6/user'
import { DynamicIcon } from '@/pages/folders/components/icons'
import cn from '@/utils/cn'
import {
  settingsHeaderMeta,
  settingsTableCoreOptions,
  useSettingsTableSearch,
} from '../../helpers/settingsDataTable'
import SettingsSortableDataTable from '../SettingsSortableDataTable'
import SettingsPageHeader, {
  type SettingsAddAction,
  SettingsHeaderAddButton,
} from '../SettingsPageHeader'
import SettingsFormSection from '../SettingsFormSection'
import SettingsSetupHeader from '../SettingsSetupHeader'
import SettingsSetupContent from '../SettingsSetupContent'
import FolderStorageConnectorPanel, {
  type CloudStorageOption,
} from './FolderStorageConnectorPanel'
import useSettingsTableToolbar from '../useSettingsTableToolbar'
import CustomFilter from '@/components/common/CustomFilter'
import TableSearch from '@/components/base/data-table/actions/TableSearch'
import TableExport from '@/components/base/data-table/actions/TableExport'

type DmsFolderConfigurationProps = {
  onBack?: () => void
}
type FieldRow = {
  dataType: string
  fieldName: string
  iconKey?: string
  id: string
  includeInFolderStructure: boolean
  isMandatory: boolean
  level: number
  orderId: number
  system?: boolean
}

type FieldDisplayRow = FieldRow & {
  ancestorContinues: boolean[]
  depth: number
  isLastAtDepth: boolean
}

type RepositoryRow = {
  documents: number
  id: string
  name: string
  owner: string
  status: RepositoryStatus
  storage: string
}

type RepositoryStatus = 'active' | 'archived'

type SelectOption = {
  description?: string
  disabled?: boolean
  iconKey?: string
  id: string | number
  name: string
  value?: string
}

type WizardStep = 1 | 2 | 3 | 4 | 5

type WizardStepItem = {
  description: string
  id: WizardStep
  title: string
}

const extractRepositories = (payload: unknown): Array<Record<string, unknown>> => {
  if (!payload) return []
  if (Array.isArray(payload)) return payload

  if (typeof payload === 'object') {
    const record = payload as Record<string, unknown>
    for (const key of ['data', 'payload', 'value', 'items', 'repositories']) {
      const inner = record[key]
      if (Array.isArray(inner)) return inner
    }
  }

  return []
}

const formatStorageLabel = (code?: string) => {
  switch (code) {
    case 'EZOFIS':
      return 'Default'
    case 'ONE_DRIVE':
      return 'OneDrive'
    case 'GOOGLE_DRIVE':
      return 'Google Drive'
    case 'AZURE':
      return 'Azure'
    case 'EXTERNAL':
      return 'External'
    default:
      return code ? String(code).replace(/_/g, ' ') : 'Default'
  }
}

const getRepositoryDocumentCount = (repository: Record<string, unknown>) => {
  const value =
    repository.documentCount ??
    repository.itemCount ??
    repository.totalCount ??
    repository.documents ??
    0

  const count = Number(value)
  return Number.isFinite(count) ? count : 0
}

const getRepositoryStatus = (
  repository: Record<string, unknown>,
): RepositoryStatus => {
  const status = String(
    repository.status || repository.repositoryStatus || '',
  ).toLowerCase()

  if (status === 'archived' || repository.isArchived === true) {
    return 'archived'
  }

  return 'active'
}

const mapRepositoryToRow = (
  repository: Record<string, unknown>,
): RepositoryRow | null => {
  const id = String(repository.id || repository.repositoryId || '').trim()
  const name = String(repository.name || repository.title || '').trim()

  if (!id || !name) return null

  const storageCode = repository.storageProviderCode
    ? String(repository.storageProviderCode)
    : repository.storageProviderId
      ? 'EXTERNAL'
      : 'EZOFIS'

  return {
    documents: getRepositoryDocumentCount(repository),
    id,
    name,
    owner: String(repository.createdByName || repository.ownerName || '—'),
    status: getRepositoryStatus(repository),
    storage: formatStorageLabel(storageCode),
  }
}

const defaultFields: FieldRow[] = [
  {
    dataType: 'SHORT_TEXT',
    fieldName: 'Supplier',
    iconKey: 'building',
    id: 'supplier',
    includeInFolderStructure: true,
    isMandatory: true,
    level: 1,
    orderId: 1,
    system: true,
  },
  {
    dataType: 'SINGLE_SELECT',
    fieldName: 'Document Type',
    iconKey: 'document',
    id: 'documentType',
    includeInFolderStructure: true,
    isMandatory: true,
    level: 2,
    orderId: 2,
    system: true,
  },
  {
    dataType: 'SHORT_TEXT',
    fieldName: 'PO Number',
    iconKey: 'folder',
    id: 'poNumber',
    includeInFolderStructure: true,
    isMandatory: true,
    level: 3,
    orderId: 3,
    system: true,
  },
  {
    dataType: 'SHORT_TEXT',
    fieldName: 'Invoice Number',
    id: 'invoiceNumber',
    includeInFolderStructure: false,
    isMandatory: true,
    level: 0,
    orderId: 4,
    system: true,
  },
  {
    dataType: 'SHORT_TEXT',
    fieldName: 'Vendor Name',
    id: 'vendorName',
    includeInFolderStructure: false,
    isMandatory: false,
    level: 0,
    orderId: 5,
    system: true,
  },
  {
    dataType: 'DATE',
    fieldName: 'Invoice Date',
    id: 'invoiceDate',
    includeInFolderStructure: false,
    isMandatory: false,
    level: 0,
    orderId: 6,
    system: true,
  },
  {
    dataType: 'CURRENCY_AMOUNT',
    fieldName: 'Amount',
    id: 'amount',
    includeInFolderStructure: false,
    isMandatory: true,
    level: 0,
    orderId: 7,
    system: true,
  },
]

const wizardSteps: WizardStepItem[] = [
  { description: 'Name, owner and category', id: 1, title: 'Folder Details' },
  { description: 'Select storage provider', id: 2, title: 'Storage' },
  { description: 'Configure metadata fields', id: 3, title: 'Fields' },
  { description: 'File version strategy', id: 4, title: 'Versioning' },
  { description: 'ERP and sync mapping', id: 5, title: 'Integrations' },
]


type StorageOption = {
  comingSoon: boolean
  connectorType?: string
  description: string
  features: string[]
  icon?: string
  id: string
  logo?: string
  oauthProvider?: string
  status: string
  storageProviderCode: string
  subtitle: string
  title: string
  type: string
}

const isCloudStorageOption = (
  option: StorageOption,
): option is StorageOption & CloudStorageOption =>
  Boolean(option.connectorType && option.oauthProvider)

const storageOptions: StorageOption[] = [
  {
    comingSoon: false,
    description:
      'Use EZOFIS-managed storage with built-in encryption, access controls, and no external provider setup.',
    features: [
      'Enterprise-grade encryption at rest',
      'No third-party account required',
      'Automatic backups and versioning support',
    ],
    id: 'EZOFIS Drive',
    logo: '/favicon.svg',
    status: 'Ready to use',
    storageProviderCode: 'EZOFIS',
    subtitle: 'Built-in secure storage',
    title: 'EZOFIS Drive',
    type: 'Built-in provider',
  },
  {
    comingSoon: false,
    connectorType: 'ONE_DRIVE',
    description:
      'Store folder documents in Microsoft OneDrive with Microsoft 365 sign-in and folder sync.',
    features: [
      'Microsoft 365 authentication',
      'Sync with existing OneDrive folders',
      'Enterprise sharing policies supported',
    ],
    id: 'One Drive',
    logo: OneDriveLogo,
    oauthProvider: 'onedrive',
    status: 'Connect required',
    storageProviderCode: 'ONE_DRIVE',
    subtitle: 'Microsoft OneDrive',
    title: 'One Drive',
    type: 'Microsoft cloud',
  },
  {
    comingSoon: false,
    connectorType: 'GOOGLE_DRIVE',
    description:
      'Connect Google Workspace to store files in Google Drive with shared drive support.',
    features: [
      'Google Workspace sign-in',
      'Shared drive compatibility',
      'Automatic file metadata sync',
    ],
    id: 'Google Drive',
    logo: GoogleDriveLogo,
    oauthProvider: 'google',
    status: 'Connect required',
    storageProviderCode: 'GOOGLE_DRIVE',
    subtitle: 'Google Workspace',
    title: 'Google Drive',
    type: 'Google cloud',
  },
  {
    comingSoon: true,
    description:
      'Azure Blob storage integration for organizations using Microsoft Azure infrastructure.',
    features: [
      'Azure AD authentication',
      'Blob container mapping',
      'Regional data residency options',
    ],
    icon: 'logos:microsoft-azure',
    id: 'Azure Drive',
    status: 'Coming soon',
    storageProviderCode: 'AZURE',
    subtitle: 'Coming Soon',
    title: 'Azure Drive',
    type: 'Microsoft Azure',
  },
]

const versionOptions = [
  {
    id: 'Replace Existing',
    sample: 'Invoice.pdf → Invoice.pdf',
    subtitle: 'New uploads replace the existing file',
    title: 'Replace Existing',
  },
  {
    id: 'Timestamp Version',
    sample: 'Invoice.pdf → Invoice_20260101_1000.pdf',
    subtitle: 'Append timestamp to each version',
    title: 'Timestamp Version',
  },
  {
    id: 'Incremental Version',
    sample: 'Invoice.pdf → Invoice_1.pdf → Invoice_2.pdf',
    subtitle: 'Auto-increment version number',
    title: 'Incremental Version',
  },
]

const integrations = [
  'SAP',
  'Oracle ERP',
  'Microsoft Dynamics',
  'QuickBooks',
  'Custom API',
]
const REPOSITORY_FIELD_DATA_TYPES = [
  'SHORT_TEXT',
  'LONG_TEXT',
  'NUMBER',
  'DATE',
  'DATE_TIME',
  'TIME',
  'CURRENCY_AMOUNT',
  'SINGLE_SELECT',
  'MULTI_SELECT',
  'YES_NO_TOGGLE',
  'EMAIL',
  'PHONE_NUMBER',
  'URL',
  'FILE_UPLOAD',
] as const

const FOLDER_FIELD_ICON_KEYS = [
  'building',
  'document',
  'folder',
  'amount',
  'date',
  'card',
  'currency',
  'tax',
  'address',
] as const

const FOLDER_FIELD_ICON_LABELS: Record<(typeof FOLDER_FIELD_ICON_KEYS)[number], string> =
{
  address: 'Address',
  amount: 'Amount',
  building: 'Supplier',
  card: 'Card',
  currency: 'Currency',
  date: 'Date',
  document: 'Document',
  folder: 'Folder',
  tax: 'Tax',
}

const folderIconOptions: SelectOption[] = FOLDER_FIELD_ICON_KEYS.map((key) => ({
  iconKey: key,
  id: key,
  name: FOLDER_FIELD_ICON_LABELS[key],
  value: key,
}))

const formatDataTypeLabel = (value: string) =>
  value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())

const getFieldIconKey = (
  field: Pick<FieldRow, 'iconKey' | 'includeInFolderStructure'>,
) => (field.includeInFolderStructure ? field.iconKey || 'folder' : 'document')

const FIELD_TREE_STEP = 24

const isLastTreeRowAtDepth = (
  rows: Array<{ depth: number }>,
  index: number,
) => {
  const depth = rows[index].depth

  for (let nextIndex = index + 1; nextIndex < rows.length; nextIndex += 1) {
    if (rows[nextIndex].depth < depth) return true
    if (rows[nextIndex].depth === depth) return false
  }

  return true
}

const buildAncestorContinues = (
  rows: Array<{ depth: number }>,
  index: number,
) => {
  const depth = rows[index].depth
  const continues: boolean[] = []

  for (let level = 0; level < depth; level += 1) {
    let hasMore = false

    for (let nextIndex = index + 1; nextIndex < rows.length; nextIndex += 1) {
      if (rows[nextIndex].depth > level) {
        hasMore = true
        break
      }

      if (rows[nextIndex].depth <= level) break
    }

    continues.push(hasMore)
  }

  return continues
}

const buildUnifiedFieldRows = (fields: FieldRow[]): FieldDisplayRow[] => {
  const sorted = [...fields].sort((left, right) => left.orderId - right.orderId)
  const withDepth = sorted.map((field) => ({
    ...field,
    depth: field.includeInFolderStructure ? Math.max(0, field.level - 1) : 0,
  }))

  return withDepth.map((field, index) => ({
    ...field,
    ancestorContinues: buildAncestorContinues(withDepth, index),
    isLastAtDepth: isLastTreeRowAtDepth(withDepth, index),
  }))
}

const recalculateFieldHierarchy = (orderedFields: FieldRow[]): FieldRow[] => {
  const folderFields = orderedFields.filter(
    (field) => field.includeInFolderStructure,
  )
  const metadataFields = orderedFields.filter(
    (field) => !field.includeInFolderStructure,
  )
  const normalized = [...folderFields, ...metadataFields]
  const folderIds = folderFields.map((field) => field.id)

  return normalized.map((field, index) => {
    const orderId = index + 1

    if (!field.includeInFolderStructure) {
      return {
        ...field,
        level: 0,
        orderId,
      }
    }

    const folderIndex = folderIds.indexOf(field.id)

    return {
      ...field,
      level: folderIndex + 1,
      orderId,
    }
  })
}

const toFieldTypeOptions = (types: string[]): SelectOption[] =>
  [...new Set(types.filter(Boolean))]
    .sort((left, right) => left.localeCompare(right))
    .map((type) => ({
      id: type,
      name: formatDataTypeLabel(type),
      value: type,
    }))

const fieldColumnHelper = createColumnHelper<FieldDisplayRow>()

export default function DmsFolderConfiguration({
  onBack,
}: DmsFolderConfigurationProps) {
  const [showWizard, setShowWizard] = useState(false)
  const [step, setStep] = useState<WizardStep>(1)
  const [fields, setFields] = useState<FieldRow[]>(defaultFields)
  const [storage, setStorage] = useState('EZOFIS Drive')
  const [storageConnectorId, setStorageConnectorId] = useState<string | null>(
    null,
  )
  const [storageConnectorLabel, setStorageConnectorLabel] = useState<
    string | null
  >(null)
  const [isSavingRepository, setIsSavingRepository] = useState(false)
  const [versioning, setVersioning] = useState('Incremental Version')
  const [displayMode, setDisplayMode] = useState('Show Latest Version Only')
  const [folderName, setFolderName] = useState('')
  const [description, setDescription] = useState('')

  const [folderOwner, setFolderOwner] = useState<SelectOption | null>(null)
  const [folderCoordinator, setFolderCoordinator] = useState<SelectOption | null>(
    null,
  )
  const [userOptions, setUserOptions] = useState<SelectOption[]>([])
  const [repositories, setRepositories] = useState<RepositoryRow[]>([])
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({})
  const [isLoadingRepositories, setIsLoadingRepositories] = useState(true)

  const filteredRepositories = useMemo(() => {
    return repositories.filter(repo => {
      let matches = true
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (!value) return
        if (key === 'status') {
          if (String(repo.status).toLowerCase() !== value.toLowerCase()) matches = false
        }
      })
      return matches
    })
  }, [repositories, activeFilters])

  const openEditRepository = useCallback((repository: RepositoryRow) => {
    setFolderName(repository.name)
    setShowWizard(true)
    setStep(1)
  }, [])

  const loadRepositories = useCallback(async () => {
    setIsLoadingRepositories(true)

    try {
      const response = await getRepositorys()

      if (response.error) {
        showToast({
          message: 'Failed to load folders.',
          variant: 'error',
        })
        setRepositories([])
        return
      }

      const rows = extractRepositories(response.data)
        .map((repository) => mapRepositoryToRow(repository))
        .filter((repository): repository is RepositoryRow => repository !== null)

      setRepositories(rows)
    } finally {
      setIsLoadingRepositories(false)
    }
  }, [])

  const loadUsers = useCallback(async () => {
    const response = await getUsers()
    if (response.error) return

    setUserOptions(
      response.data.map((user) => ({
        id: user.id,
        name: user.displayName || user.email,
        value: user.id,
      })),
    )
  }, [])

  useEffect(() => {
    void loadUsers()
    void loadRepositories()
  }, [loadRepositories, loadUsers])

  const closeWizard = () => {
    setShowWizard(false)
    setStep(1)
    setStorageConnectorId(null)
    setStorageConnectorLabel(null)
  }

  const handleStorageChange = (nextStorage: string) => {
    setStorage(nextStorage)
    setStorageConnectorId(null)
    setStorageConnectorLabel(null)
  }

  const handleStorageConnectorChange = (
    connectorId: string | null,
    connectorLabel: string | null,
  ) => {
    setStorageConnectorId(connectorId)
    setStorageConnectorLabel(connectorLabel)
  }

  const goNext = () => {
    if (step === 2) {
      const selectedStorageOption =
        storageOptions.find((item) => item.id === storage) ?? storageOptions[0]

      if (
        isCloudStorageOption(selectedStorageOption) &&
        !storageConnectorId
      ) {
        showToast({
          message: `Connect ${selectedStorageOption.title} and select a connector before continuing.`,
          variant: 'error',
        })
        return
      }
    }

    setStep((prev) => Math.min(5, prev + 1) as WizardStep)
  }
  const goBack = () => setStep((prev) => Math.max(1, prev - 1) as WizardStep)

  const handleCreateRepository = async () => {
    const trimmedName = folderName.trim()
    if (!trimmedName) {
      showToast({ message: 'Folder name is required.', variant: 'error' })
      setStep(1)
      return
    }

    const selectedStorageOption =
      storageOptions.find((item) => item.id === storage) ?? storageOptions[0]

    if (isCloudStorageOption(selectedStorageOption) && !storageConnectorId) {
      showToast({
        message: `Connect ${selectedStorageOption.title} before saving the folder.`,
        variant: 'error',
      })
      setStep(2)
      return
    }

    const payload = {
      description,
      fields: fields.map((field, index) => ({
        dataType: field.dataType,
        iconKey: field.iconKey,
        includeInFolderStructure: field.includeInFolderStructure,
        isMandatory: field.isMandatory,
        level: field.level,
        name: field.fieldName,
        orderId: field.orderId ?? index + 1,
      })),
      name: trimmedName,
      storageDrive: null,
      storageProviderCode: selectedStorageOption.storageProviderCode,
      storageProviderId:
        selectedStorageOption.storageProviderCode === 'EZOFIS'
          ? undefined
          : storageConnectorId,
    }

    setIsSavingRepository(true)

    try {
      const response = await createRepository(payload)

      if (response.error) {
        showToast({
          message: `Failed to create folder: ${response.error}`,
          variant: 'error',
        })
        return
      }

      showToast({
        message: 'Folder created successfully.',
        variant: 'success',
      })
      await loadRepositories()
      closeWizard()
    } finally {
      setIsSavingRepository(false)
    }
  }

  const { table: repositoryTable, tableSearchOptions } = useRepositoryTable(filteredRepositories, {
    onEditRepository: openEditRepository,
  })
  const repositoryToolbar = useSettingsTableToolbar({
    isReLoading: isLoadingRepositories,
    table: repositoryTable,
    onReload: () => {
      void loadRepositories()
    },
  })

  const statusOptions = [
    { label: 'Active', value: 'Active' },
    { label: 'Inactive', value: 'Inactive' },
  ]

  return (
    <div className='min-h-[90vh] bg-[var(--surface)]'>
      {!showWizard ? (
        <div className='flex-1 flex flex-col'>
          <SettingsPageHeader
            description='Create and manage folders with custom fields, storage, and versioning.'
            title='Folder Configuration'
          />

          <div className='px-6 py-4 md:px-8 flex-1 flex flex-col overflow-hidden'>
            <CustomFilter
              filters={[
                { id: 'status', label: 'Status', options: statusOptions },
              ]}
              activeFilters={activeFilters}
              onFilterChange={(id, val) => setActiveFilters(prev => ({ ...prev, [id]: val }))}
              onReset={() => {
                setActiveFilters({})
                tableSearchOptions.onGlobalFilterChange({ id: '', value: '' })
              }}
              showReset={Object.keys(activeFilters).some(k => activeFilters[k]) || !!tableSearchOptions.state.globalFilter?.value}
              customSearchComponent={<TableSearch table={repositoryTable as any} />}
              onBack={onBack}
              addButton={{
                onClick: () => setShowWizard(true),
                tooltip: 'New Folder'
              }}
              actionButtons={[
                {
                  id: 'refresh',
                  icon: 'tabler:refresh',
                  tooltip: 'Refresh',
                  onClick: loadRepositories,
                  isIconButton: true,
                  color: 'gray',
                  variant: 'outline',
                  disabled: isLoadingRepositories,
                }
              ]}
              trailingActions={<TableExport table={repositoryTable as any} />}
            />
            <div className='py-4 min-h-0 flex-1 overflow-hidden'>
              <DataTable
                hideActionBar
                isLoading={isLoadingRepositories}
                isReLoading={isLoadingRepositories}
                pageSize={Math.max(5, repositories.length || 5)}
                rowSize={repositoryToolbar.rowSize}
                table={repositoryTable}
                tableBodyMaxHeight='calc(100vh - 320px)'
                stickyHeader
                hideGrouping
                onReload={() => {
                  void loadRepositories()
                }}
                onRowSizeChange={repositoryToolbar.onRowSizeChange}
              />
            </div>
          </div>
        </div>
      ) : (
        <>
          <SettingsSetupHeader
            moduleTitle='Folder Configuration'
            progress={(step / wizardSteps.length) * 100}
            setupTitle='New Folder'
            stepDescription={
              wizardSteps.find((item) => item.id === step)?.description || ''
            }
            stepTitle={wizardSteps.find((item) => item.id === step)?.title || ''}
            onBackToSettings={onBack}
            onCancelSetup={closeWizard}
          />

          <div className='grid min-h-[calc(100vh-96px)] grid-cols-1 lg:grid-cols-[296px_1fr]'>
            <aside className='border-r border-[var(--border-default)] bg-[var(--surface)] px-4 py-9'>
              <StepNav setStep={setStep} step={step} />
            </aside>

            <SettingsSetupContent fullWidth>
              <WizardContent
                description={description}
                displayMode={displayMode}
                fields={fields}
                folderCoordinator={folderCoordinator}
                folderName={folderName}
                folderOwner={folderOwner}
                step={step}
                storage={storage}
                storageConnectorId={storageConnectorId}
                storageConnectorLabel={storageConnectorLabel}
                versioning={versioning}
                setDescription={setDescription}
                setDisplayMode={setDisplayMode}
                setFields={setFields}
                setFolderCoordinator={setFolderCoordinator}
                setFolderName={setFolderName}
                setFolderOwner={setFolderOwner}
                setStorage={handleStorageChange}
                onStorageConnectorChange={handleStorageConnectorChange}
                userOptions={userOptions}
                setVersioning={setVersioning}
              />

              <div className='mt-8 flex items-center justify-between border-t border-[var(--border-default)] pt-6'>
                <button
                  className='inline-flex h-10 items-center rounded-[5px] border border-[var(--border-default)] bg-surface px-5 text-[15px] font-semibold text-[var(--gray-13)] transition hover:bg-[var(--gray-2)] disabled:cursor-not-allowed disabled:opacity-50'
                  disabled={step === 1}
                  type='button'
                  onClick={goBack}
                >
                  Back
                </button>

                <div className='flex items-center gap-3'>
                  {step === 5 ? (
                    <button
                      className='h-10 rounded-[5px] bg-[var(--primary-9)] px-5 text-[15px] font-semibold text-white shadow-[var(--shadow-md)] transition hover:bg-[var(--primary-10)] disabled:cursor-not-allowed disabled:opacity-60'
                      disabled={isSavingRepository}
                      type='button'
                      onClick={() => {
                        void handleCreateRepository()
                      }}
                    >
                      {isSavingRepository ? 'Saving...' : 'Save'}
                    </button>
                  ) : (
                    <button
                      className='h-10 rounded-[5px] bg-[var(--primary-9)] px-5 text-[15px] font-semibold text-white shadow-[var(--shadow-md)] transition hover:bg-[var(--primary-10)]'
                      type='button'
                      onClick={goNext}
                    >
                      Next
                    </button>
                  )}
                </div>
              </div>
            </SettingsSetupContent>
          </div>
        </>
      )}
    </div>
  )
}

function FieldNameWithIconInput({
  autoFocus,
  iconKey = 'folder',
  placeholder,
  showIconPicker,
  size = 'sm',
  value,
  onBlur,
  onChange,
  onIconChange,
}: {
  autoFocus?: boolean
  iconKey?: string
  placeholder?: string
  showIconPicker: boolean
  size?: 'sm' | 'md'
  value: string
  onBlur?: () => void
  onChange: (value: string) => void
  onIconChange?: (iconKey: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const combobox = useCombobox({
    onDropdownClose: () => onSearch(''),
  })
  const { filteredOptions, search, onSearch } = useLocalSearch(
    folderIconOptions as Option[],
  )

  useEffect(() => {
    if (!autoFocus) return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [autoFocus])

  const selectedKey = iconKey || 'folder'
  const selectedOption =
    folderIconOptions.find((option) => option.value === selectedKey) ||
    folderIconOptions.find((option) => option.value === 'folder') ||
    folderIconOptions[0]

  const handleIconSelect = (options: Option[]) => {
    const next = options[0]
    if (!next?.value) return
    onIconChange?.(String(next.value))
    combobox.closeDropdown()
  }

  const heightClass = size === 'md' ? 'h-9 min-h-9' : 'h-8 min-h-8'

  const iconSection = showIconPicker ? (
    <MantineCombobox
      position='bottom-start'
      store={combobox}
      transitionProps={{ transition: 'pop' }}
      width={240}
    >
      <MantineCombobox.Target>
        <button
          aria-label='Select field icon'
          className='flex h-full w-full items-center justify-center gap-0.5 text-gray-11'
          type='button'
          onClick={() => combobox.toggleDropdown()}
        >
          <DynamicIcon className='h-4 w-4' name={selectedKey} />
          <Icon className='h-3 w-3 text-gray-8' name='lucide:chevron-down' />
        </button>
      </MantineCombobox.Target>

      <MantineCombobox.Dropdown
        classNames={{
          dropdown: 'z-[200] border border-gray-3  p-0 shadow-md',
        }}
      >
        <ComboboxSearch
          placeholder='Search icons'
          search={search}
          onSearch={onSearch}
        />
        <ComboboxOptions
          comboboxStore={combobox}
          options={filteredOptions}
          search={search}
          value={selectedOption ? [selectedOption as Option] : []}
          variant='single'
          onChange={handleIconSelect}
        />
      </MantineCombobox.Dropdown>
    </MantineCombobox>
  ) : (
    <DynamicIcon className='h-4 w-4 text-gray-11' name='document' />
  )

  const leftSection = (
    <div
      className={cn(
        'flex h-full w-full items-center justify-center border-r border-[var(--border-default)]',
      )}
    >
      {iconSection}
    </div>
  )

  return (
    <InputText
      ref={inputRef}
      classNames={{ input: heightClass }}
      leftSection={leftSection}
      leftSectionPointerEvents='auto'
      placeholder={placeholder}
      styles={{
        wrapper: {
          '--input-left-section-width': showIconPicker ? '44px' : '36px',
        } as React.CSSProperties,
      }}
      value={value}
      onBlur={onBlur}
      onChange={onChange}
    />
  )
}

function FieldTreeLines({
  depth,
  isLastAtDepth,
}: {
  depth: number
  isLastAtDepth: boolean
}) {
  if (depth === 0) return null

  return (
    <div
      className='relative mr-1 shrink-0 self-stretch'
      style={{
        marginLeft: (depth - 1) * FIELD_TREE_STEP,
        width: FIELD_TREE_STEP,
      }}
    >
      <span
        className='absolute top-0 left-1/2 w-px -translate-x-1/2 bg-gray-5'
        style={{ height: '50%' }}
      />
      <span
        className='absolute top-1/2 left-1/2 h-px bg-gray-5'
        style={{ width: FIELD_TREE_STEP / 2 }}
      />
      {!isLastAtDepth ? (
        <span className='absolute top-1/2 bottom-0 left-1/2 w-px -translate-x-1/2 bg-gray-5' />
      ) : null}
    </div>
  )
}

function FieldTreeIcon({
  iconKey,
  isFolder,
}: {
  iconKey: string
  isFolder: boolean
}) {
  return (
    <span
      className={cn(
        'mr-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-md',
        isFolder ? 'bg-primary-3 text-primary-9' : 'bg-blue-3 text-blue-9',
      )}
    >
      <DynamicIcon className='h-3.5 w-3.5' name={iconKey} />
    </span>
  )
}

function FieldNameTreeCell({
  children,
  depth,
  iconKey,
  isLastAtDepth,
}: {
  children: ReactNode
  depth: number
  iconKey: string
  isLastAtDepth: boolean
}) {
  return (
    <div className='flex min-h-9 min-w-0 items-center'>
      <FieldTreeLines depth={depth} isLastAtDepth={isLastAtDepth} />
      <FieldTreeIcon iconKey={iconKey} isFolder />
      <div className='min-w-0 flex-1'>{children}</div>
    </div>
  )
}

function FieldNameCell({
  children,
  field,
}: {
  children: ReactNode
  field: FieldRow
}) {
  return (
    <div className='flex min-h-9 min-w-0 items-center'>
      <FieldTreeIcon
        iconKey={getFieldIconKey(field)}
        isFolder={field.includeInFolderStructure}
      />
      <div className='min-w-0 flex-1'>{children}</div>
    </div>
  )
}

function FieldsTable({
  fieldTypeOptions,
  fields,
  setFields,
}: {
  fieldTypeOptions: SelectOption[]
  fields: FieldRow[]
  setFields: Dispatch<SetStateAction<FieldRow[]>>
}) {
  const [editingRowId, setEditingRowId] = useState<string | null>(null)

  const displayRows = useMemo(() => buildUnifiedFieldRows(fields), [fields])

  const updateField = (id: string, patch: Partial<FieldRow>) => {
    setFields((prev) => {
      const next = prev.map((field) =>
        field.id === id ? { ...field, ...patch } : field,
      )

      if ('includeInFolderStructure' in patch) {
        return recalculateFieldHierarchy(next)
      }

      return next
    })
  }

  const toggleFolder = (id: string, checked: boolean) => {
    setFields((prev) =>
      recalculateFieldHierarchy(
        prev.map((field) =>
          field.id === id
            ? {
              ...field,
              iconKey: checked ? field.iconKey || 'folder' : undefined,
              includeInFolderStructure: checked,
              isMandatory: checked ? true : field.isMandatory,
            }
            : field,
        ),
      ),
    )
  }

  const toggleRowEdit = (rowId: string) => {
    setEditingRowId((current) => (current === rowId ? null : rowId))
  }

  const columns = useMemo(
    () => [
      fieldColumnHelper.display({
        enableResizing: false,
        enableSorting: false,
        header: '',
        id: 'drag',
        maxSize: 44,
        meta: settingsHeaderMeta.center,
        minSize: 44,
        size: 44,
        cell: () => null,
      }),
      fieldColumnHelper.accessor('fieldName', {
        enableSorting: false,
        header: 'Field Name',
        id: 'fieldName',
        meta: settingsHeaderMeta.start,
        minSize: 280,
        size: 360,
        cell: ({ row }) => {
          const rowId = row.original.id
          const isRowEditing = editingRowId === rowId

          if (isRowEditing) {
            const nameInput = (
              <FieldNameWithIconInput
                iconKey={row.original.iconKey || 'folder'}
                showIconPicker={Boolean(row.original.includeInFolderStructure)}
                value={row.original.fieldName}
                onChange={(value) => updateField(rowId, { fieldName: value })}
                onIconChange={(iconKey) => updateField(rowId, { iconKey })}
              />
            )

            if (row.original.includeInFolderStructure) {
              return (
                <div className='flex min-h-9 min-w-0 items-center'>
                  <FieldTreeLines
                    depth={row.original.depth}
                    isLastAtDepth={row.original.isLastAtDepth}
                  />
                  <div className='min-w-0 flex-1'>{nameInput}</div>
                </div>
              )
            }

            return <div className='min-w-0'>{nameInput}</div>
          }

          const nameLabel = (
            <div className='truncate py-1.5 font-semibold text-gray-13'>
              {row.original.fieldName}
            </div>
          )

          return row.original.includeInFolderStructure ? (
            <FieldNameTreeCell
              depth={row.original.depth}
              iconKey={getFieldIconKey(row.original)}
              isLastAtDepth={row.original.isLastAtDepth}
            >
              {nameLabel}
            </FieldNameTreeCell>
          ) : (
            <FieldNameCell field={row.original}>{nameLabel}</FieldNameCell>
          )
        },
      }),
      fieldColumnHelper.accessor('dataType', {
        enableSorting: false,
        header: 'Type',
        id: 'dataType',
        meta: settingsHeaderMeta.start,
        minSize: 150,
        size: 170,
        cell: ({ row }) => {
          const rowId = row.original.id
          const isRowEditing = editingRowId === rowId

          if (!isRowEditing) {
            return (
              <span className='text-sm text-gray-12'>
                {formatDataTypeLabel(row.original.dataType)}
              </span>
            )
          }

          return (
            <div className='w-full max-w-[170px]'>
              <InputSelect
                classNames={{ input: 'h-8 text-12' }}
                options={fieldTypeOptions}
                value={
                  fieldTypeOptions.find(
                    (option) => option.value === row.original.dataType,
                  ) ||
                  fieldTypeOptions[0] ||
                  null
                }
                width='target'
                onChange={(selected) => {
                  if (!selected?.value) return
                  updateField(rowId, {
                    dataType: String(selected.value),
                  })
                }}
              />
            </div>
          )
        },
      }),
      fieldColumnHelper.display({
        enableResizing: false,
        enableSorting: false,
        header: 'Folder',
        id: 'folder',
        meta: settingsHeaderMeta.center,
        minSize: 90,
        size: 100,
        cell: ({ row }) => {
          const rowId = row.original.id
          const isRowEditing = editingRowId === rowId

          if (!isRowEditing) {
            return (
              <div className='flex justify-center'>
                <span className='text-sm text-gray-11'>
                  {row.original.includeInFolderStructure ? 'Yes' : 'No'}
                </span>
              </div>
            )
          }

          return (
            <div className='flex justify-center'>
              <InputCheckbox
                checked={Boolean(row.original.includeInFolderStructure)}
                onChange={(checked) => toggleFolder(rowId, Boolean(checked))}
              />
            </div>
          )
        },
      }),
      fieldColumnHelper.display({
        enableResizing: false,
        enableSorting: false,
        header: 'Mandatory',
        id: 'isMandatory',
        meta: settingsHeaderMeta.center,
        minSize: 110,
        size: 120,
        cell: ({ row }) => {
          const rowId = row.original.id
          const isRowEditing = editingRowId === rowId
          const isMandatory = Boolean(
            row.original.includeInFolderStructure || row.original.isMandatory,
          )

          if (!isRowEditing) {
            return (
              <div className='flex justify-center'>
                <span className='text-sm text-gray-11'>
                  {isMandatory ? 'Yes' : 'No'}
                </span>
              </div>
            )
          }

          if (row.original.includeInFolderStructure) {
            return (
              <div className='flex justify-center'>
                <InputCheckbox checked disabled />
              </div>
            )
          }

          return (
            <div className='flex justify-center'>
              <InputCheckbox
                checked={Boolean(row.original.isMandatory)}
                onChange={(checked) =>
                  updateField(rowId, { isMandatory: Boolean(checked) })
                }
              />
            </div>
          )
        },
      }),
      fieldColumnHelper.display({
        enableResizing: false,
        enableSorting: false,
        header: '',
        id: 'edit',
        maxSize: 52,
        meta: settingsHeaderMeta.center,
        minSize: 52,
        size: 52,
        cell: ({ row }) => {
          const rowId = row.original.id
          const isRowEditing = editingRowId === rowId

          return (
            <div className='flex justify-center'>
              <IconButton
                ariaLabel={isRowEditing ? 'Done editing' : 'Edit field'}
                color='gray'
                icon={isRowEditing ? 'lucide:check' : 'lucide:pencil'}
                size='sm'
                variant='ghost'
                onClick={() => toggleRowEdit(rowId)}
              />
            </div>
          )
        },
      }),
    ],
    [editingRowId, fieldTypeOptions],
  )

  const table = useReactTable({
    ...settingsTableCoreOptions,
    columns,
    data: displayRows,
    getRowId: (row) => row.id,
  })

  const handleReorder = (reorderedRows: FieldDisplayRow[]) => {
    const orderedFields = reorderedRows
      .map((row) => fields.find((field) => field.id === row.id))
      .filter((field): field is FieldRow => Boolean(field))

    setFields(recalculateFieldHierarchy(orderedFields))
  }

  const handleValidateReorder = (
    activeIndex: number,
    newIndex: number,
    rows: FieldDisplayRow[],
  ) => {
    const activeRow = rows[activeIndex]
    const overRow = rows[newIndex]
    if (!activeRow || !overRow) return false

    const activeIsFolder = activeRow.includeInFolderStructure
    const overIsFolder = overRow.includeInFolderStructure

    if (activeIsFolder !== overIsFolder) return false

    const firstNonFolderIndex = rows.findIndex(
      (row) => !row.includeInFolderStructure,
    )
    const folderBoundary =
      firstNonFolderIndex === -1 ? rows.length : firstNonFolderIndex

    if (activeIsFolder) {
      return newIndex < folderBoundary
    }

    return newIndex >= folderBoundary
  }

  if (!displayRows.length) {
    return (
      <div className='rounded-xl border border-[var(--gray-3)] bg-surface px-4 py-8 text-center text-sm text-gray-11 shadow-sm'>
        No fields configured yet. Use the form above to add your first field.
      </div>
    )
  }

  return (
    <SettingsSortableDataTable
      getRowClassName={(row) =>
        !row.includeInFolderStructure ? 'bg-[var(--gray-1)]/70' : undefined
      }
      rowClassName='group'
      table={table}
      onReorder={handleReorder}
      onValidateReorder={handleValidateReorder}
    />
  )
}
function useRepositoryTable(
  rows: RepositoryRow[],
  {
    onEditRepository,
  }: {
    onEditRepository: (repository: RepositoryRow) => void
  },
) {
  const columnHelper = createColumnHelper<RepositoryRow>()
  const tableSearchOptions = useSettingsTableSearch()

  const columns = useMemo(
    () => [
      columnHelper.display({
        enableResizing: false,
        enableSorting: false,
        header: '',
        id: 'icon',
        maxSize: 48,
        meta: settingsHeaderMeta.center,
        minSize: 48,
        size: 48,
        cell: () => (
          <div className='flex justify-center'>
            <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-primary-3 text-primary-9'>
              <Folder size={16} />
            </div>
          </div>
        ),
      }),
      columnHelper.accessor('name', {
        enableSorting: false,
        header: 'Folder',
        meta: { ...settingsHeaderMeta.start, label: 'Folder' },
        minSize: 220,
        size: 260,
        cell: ({ row }) => (
          <div className='min-w-0'>
            <div className='truncate font-semibold text-gray-13'>
              {row.original.name}
            </div>
            <div className='truncate text-xs text-gray-11'>
              Owner: {row.original.owner}
            </div>
          </div>
        ),
      }),
      columnHelper.accessor('storage', {
        enableSorting: false,
        header: 'Storage',
        meta: { ...settingsHeaderMeta.start, label: 'Storage' },
        minSize: 120,
        size: 140,
        cell: (info) => (
          <span className='rounded-lg border border-gray-3 px-3 py-1 text-xs font-medium'>
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor('documents', {
        enableSorting: false,
        header: 'Documents',
        meta: settingsHeaderMeta.start,
        minSize: 130,
        size: 150,
        cell: (info) => `${info.getValue().toLocaleString()} documents`,
      }),
      columnHelper.accessor('status', {
        enableSorting: false,
        header: 'Status',
        meta: { ...settingsHeaderMeta.start, label: 'Status' },
        minSize: 100,
        size: 110,
        cell: (info) => (
          <span
            className={cn(
              'rounded-lg px-3 py-1 text-xs font-semibold capitalize',
              info.getValue() === 'active'
                ? 'bg-primary-9 text-white'
                : 'bg-gray-2 text-gray-13',
            )}
          >
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.display({
        enableResizing: false,
        enableSorting: false,
        header: 'Actions',
        id: 'actions',
        meta: settingsHeaderMeta.end,
        minSize: 72,
        size: 72,
        cell: ({ row }) => {
          const repository = row.original

          return (
            <div
              className='flex justify-end'
              onClick={(event) => event.stopPropagation()}
            >
              <Menu
                position='bottom-end'
                width={160}
                withinPortal
                target={
                  <IconButton
                    color='gray'
                    icon='lucide:more-horizontal'
                    size='md'
                    variant='ghost'
                  />
                }
              >
                <MenuItem
                  icon='lucide:pencil'
                  label='Edit'
                  onClick={() => onEditRepository(repository)}
                />
                <MenuItem disabled icon='lucide:settings' label='Settings' />
              </Menu>
            </div>
          )
        },
      }),
    ],
    [columnHelper, onEditRepository],
  )

  const table = useReactTable({
    ...settingsTableCoreOptions,
    ...tableSearchOptions,
    columns,
    data: rows,
    getRowId: (row) => row.id,
  })

  return { table, tableSearchOptions }
}

function StorageCornerCheck() {
  return (
    <span className='pointer-events-none absolute top-0 right-0 h-6 w-6 overflow-hidden rounded-tr-[9px]'>
      <span
        className='absolute top-0 right-0 h-full w-full bg-primary-9'
        style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }}
      />
      <Check
        className='absolute top-0.5 right-0.5 h-3 w-3 text-white'
        strokeWidth={3}
      />
    </span>
  )
}

function StepIcon({ step }: { step: WizardStep }) {
  return <span className='text-xs font-bold'>{step}</span>
}

function StepNav({
  step,
  setStep,
}: {
  step: WizardStep
  setStep: (step: WizardStep) => void
}) {
  return (
    <div className='space-y-5'>
      {wizardSteps.map((item, index) => {
        const isCompleted = step > item.id
        const isActive = step === item.id

        return (
          <button
            key={item.id}
            type='button'
            className={cn(
              'group flex w-full items-center gap-4 rounded-[14px] px-3 py-3 text-left transition',
              isActive && '',
            )}
            onClick={() => setStep(item.id)}
          >
            <div className='relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--gray-3)]'>
              {index < wizardSteps.length - 1 && (
                <span className='absolute top-8 left-1/2 h-12 w-[1.5px] -translate-x-1/2 bg-[var(--gray-3)]' />
              )}

              <span
                className={cn(
                  'z-10 flex h-8 w-8 items-center justify-center rounded-full transition',
                  isCompleted
                    ? 'bg-primary-3 text-primary-9'
                    : 'bg-[var(--gray-3)] text-[var(--gray-10)]',
                )}
              >
                {isCompleted ? (
                  <Check size={14} />
                ) : (
                  <StepIcon step={item.id} />
                )}
              </span>
            </div>

            <div className='min-w-0'>
              <div className='text-sm font-semibold text-[var(--indigo-12)]'>
                {item.title}
              </div>
              <div className='mt-0.5 truncate text-xs text-gray-11'>
                {item.description}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

function WizardContent({
  description,
  displayMode,
  fields,
  folderCoordinator,
  folderName,
  folderOwner,
  onStorageConnectorChange,
  step,
  storage,
  storageConnectorId,
  storageConnectorLabel,
  versioning,
  setDescription,
  setDisplayMode,
  setFields,
  setFolderCoordinator,
  setFolderName,
  setFolderOwner,
  setStorage,
  userOptions,
  setVersioning,
}: {
  description: string
  displayMode: string
  fields: FieldRow[]
  folderCoordinator: SelectOption | null
  folderName: string
  folderOwner: SelectOption | null
  onStorageConnectorChange: (
    connectorId: string | null,
    connectorLabel: string | null,
  ) => void
  setDescription: Dispatch<SetStateAction<string>>
  setDisplayMode: Dispatch<SetStateAction<string>>
  setFields: Dispatch<SetStateAction<FieldRow[]>>
  setFolderCoordinator: Dispatch<SetStateAction<SelectOption | null>>
  setFolderName: Dispatch<SetStateAction<string>>
  setFolderOwner: Dispatch<SetStateAction<SelectOption | null>>
  setStorage: (nextStorage: string) => void
  userOptions: SelectOption[]
  setVersioning: Dispatch<SetStateAction<string>>
  step: WizardStep
  storage: string
  storageConnectorId: string | null
  storageConnectorLabel: string | null
  versioning: string
}) {
  const [newFieldName, setNewFieldName] = useState('')
  const [newFieldType, setNewFieldType] = useState('SHORT_TEXT')
  const [newIsFolder, setNewIsFolder] = useState(false)
  const [newIsMandatory, setNewIsMandatory] = useState(false)
  const [newFieldIcon, setNewFieldIcon] = useState<SelectOption | null>(
    folderIconOptions.find((option) => option.value === 'folder') || null,
  )
  const [fieldTypeOptions, setFieldTypeOptions] = useState<SelectOption[]>(() =>
    toFieldTypeOptions([...REPOSITORY_FIELD_DATA_TYPES]),
  )

  const loadFieldTypes = useCallback(async () => {
    const types = new Set<string>(REPOSITORY_FIELD_DATA_TYPES)
    const response = await getRepositorys()

    if (!response.error && Array.isArray(response.data)) {
      response.data.forEach((repository: { fields?: Array<{ dataType?: string }> }) => {
        ; (repository.fields || []).forEach((field) => {
          if (field.dataType) types.add(field.dataType)
        })
      })
    }

    setFieldTypeOptions(toFieldTypeOptions(Array.from(types)))
  }, [])

  useEffect(() => {
    if (step !== 3) return
    void loadFieldTypes()
  }, [loadFieldTypes, step])

  const addField = () => {
    const trimmedName = newFieldName.trim()
    if (!trimmedName) return

    setFields((prev) =>
      recalculateFieldHierarchy([
        ...prev,
        {
          dataType: newFieldType,
          fieldName: trimmedName,
          iconKey: newIsFolder ? String(newFieldIcon?.value || 'folder') : undefined,
          id: `${trimmedName}-${Date.now()}`,
          includeInFolderStructure: newIsFolder,
          isMandatory: newIsFolder || newIsMandatory,
          level: 0,
          orderId: prev.length + 1,
        },
      ]),
    )
    setNewFieldName('')
    setNewFieldType(String(fieldTypeOptions[0]?.value || 'SHORT_TEXT'))
    setNewIsFolder(false)
    setNewIsMandatory(false)
    setNewFieldIcon(
      folderIconOptions.find((option) => option.value === 'folder') || null,
    )
  }

  if (step === 1) {
    return (
      <SettingsFormSection>
        <p className='text-sm text-gray-11'>
          Define the basic information for your folder.
        </p>

        <InputText
          label='Folder Name *'
          placeholder='e.g. AP Invoices 2026'
          value={folderName}
          onChange={(value: string) => setFolderName(value)}
        />

        <InputTextarea
          label='Description'
          minRows={3}
          placeholder='Describe the purpose of this folder...'
          value={description}
          onChange={setDescription}
        />



        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          <InputSelect
            label='Folder Owner'
            options={userOptions}
            value={folderOwner}
            onChange={(item: SelectOption | null) => setFolderOwner(item)}
          />

          <InputSelect
            label='Folder Coordinator'
            options={userOptions}
            value={folderCoordinator}
            onChange={(item: SelectOption | null) => setFolderCoordinator(item)}
          />
        </div>
      </SettingsFormSection>
    )
  }

  if (step === 2) {
    const selectedStorage =
      storageOptions.find((item) => item.id === storage) ?? storageOptions[0]

    return (
      <div>
        <p className='mb-4 text-sm text-gray-11'>
          Choose where documents in this folder will be stored.
        </p>

        <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
          {storageOptions.map((item) => {
            const isSelected = storage === item.id
            const isDisabled = item.comingSoon

            return (
              <button
                key={item.id}
                type='button'
                disabled={isDisabled}
                className={cn(
                  'relative flex min-h-[132px] w-full flex-col items-center justify-center gap-2 rounded-[12px] border p-4 text-center transition',
                  isSelected
                    ? 'border-primary-9 bg-surface shadow-sm'
                    : 'border-gray-3 bg-surface hover:border-gray-4 hover:bg-surface-muted',
                  isDisabled && 'cursor-not-allowed opacity-70',
                )}
                onClick={() => {
                  if (!isDisabled) setStorage(item.id)
                }}
              >
                {isSelected ? <StorageCornerCheck /> : null}

                <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-gray-2 text-gray-11'>
                  {item.logo ? (
                    <img
                      alt={item.title}
                      className='h-5 w-5 object-contain'
                      src={item.logo}
                    />
                  ) : item.icon ? (
                    <Icon className='h-5 w-5' name={item.icon} />
                  ) : null}
                </span>

                <div className='min-w-0 px-1'>
                  <div
                    className={cn(
                      'truncate text-sm font-semibold',
                      isDisabled ? 'text-gray-9' : 'text-gray-13',
                    )}
                  >
                    {item.title}
                  </div>
                  <div className='mt-0.5 truncate text-xs text-gray-11'>
                    {item.subtitle}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {isCloudStorageOption(selectedStorage) ? (
          <FolderStorageConnectorPanel
            connectorId={storageConnectorId}
            connectorLabel={storageConnectorLabel}
            option={selectedStorage}
            onConnectorChange={onStorageConnectorChange}
          />
        ) : null}
      </div>
    )
  }

  if (step === 3) {
    return (
      <div className='space-y-5'>
        <div>
          <h3 className='font-bold text-gray-13'>Folder Fields Configuration</h3>
          <p className='text-sm text-gray-11'>
            Configure metadata fields for documents stored in this folder.
          </p>
        </div>

        <div className='rounded-[12px] border border-gray-3 bg-surface-muted p-4'>
          <div className='mb-3 text-xs font-bold text-gray-11 uppercase'>
            Add New Field
          </div>
          <div className='grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-[88px_minmax(280px,1fr)_200px_108px_auto] lg:items-end'>
            <div>
              <label className='mb-1.5 block h-4 text-xs leading-4 font-semibold text-gray-11'>
                Folder
              </label>
              <div className='flex h-9 items-center'>
                <InputCheckbox
                  checked={newIsFolder}
                  onChange={(checked) => {
                    const isFolder = Boolean(checked)
                    setNewIsFolder(isFolder)
                    if (isFolder) setNewIsMandatory(true)
                  }}
                />
              </div>
            </div>

            <div className='sm:col-span-2 lg:col-span-1'>
              <label className='mb-1.5 block h-4 text-xs leading-4 font-semibold text-gray-11'>
                Field Name
              </label>
              <FieldNameWithIconInput
                iconKey={String(newFieldIcon?.value || 'folder')}
                placeholder='e.g. Cost Center'
                showIconPicker={newIsFolder}
                size='md'
                value={newFieldName}
                onChange={setNewFieldName}
                onIconChange={(iconKey) => {
                  const option = folderIconOptions.find(
                    (item) => item.value === iconKey,
                  )
                  setNewFieldIcon(option || null)
                }}
              />
            </div>

            <div>
              <label className='mb-1.5 block h-4 text-xs leading-4 font-semibold text-gray-11'>
                Type
              </label>
              <InputSelect
                classNames={{ input: cn(inputSharedClassNames.input, 'text-13') }}
                options={fieldTypeOptions}
                placeholder='Field type'
                value={
                  fieldTypeOptions.find((option) => option.value === newFieldType) ||
                  fieldTypeOptions[0] ||
                  null
                }
                width='target'
                onChange={(selected) => {
                  if (!selected) return
                  setNewFieldType(String(selected.value || selected.name))
                }}
              />
            </div>

            <div>
              <label className='mb-1.5 block h-4 text-xs leading-4 font-semibold text-gray-11'>
                Mandatory
              </label>
              <div className='flex h-9 items-center'>
                <InputCheckbox
                  checked={newIsFolder || newIsMandatory}
                  disabled={newIsFolder}
                  onChange={(checked) => setNewIsMandatory(Boolean(checked))}
                />
              </div>
            </div>

            <div>
              <div
                aria-hidden
                className='mb-1.5 hidden h-4 lg:block'
              />
              <Button
                className='h-9 w-full whitespace-nowrap lg:w-auto'
                icon='lucide:plus'
                label='Add Field'
                size='lg'
                onClick={addField}
              />
            </div>
          </div>
        </div>

        <FieldsTable
          fieldTypeOptions={fieldTypeOptions}
          fields={fields}
          setFields={setFields}
        />
      </div>
    )
  }

  if (step === 4) {
    const displayOptions = [
      'Show Latest Version Only',
      'Show All Versions',
      'Version History Panel',
    ] as const

    return (
      <div className='space-y-8'>
        <div>
          <p className='text-sm text-gray-11'>
            Choose how document versions are managed in this folder.
          </p>

          <h3 className='mt-5 font-bold text-gray-13'>Version Strategy</h3>
          <div className='mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3'>
            {versionOptions.map((item) => {
              const isSelected = versioning === item.id

              return (
                <button
                  key={item.id}
                  type='button'
                  className={cn(
                    'relative flex min-h-[148px] w-full flex-col rounded-[12px] border p-4 text-left transition',
                    isSelected
                      ? 'border-primary-9 bg-primary-2 shadow-sm'
                      : 'border-gray-3 bg-surface hover:border-gray-4 hover:bg-surface-muted',
                  )}
                  onClick={() => setVersioning(item.id)}
                >
                  {isSelected ? <StorageCornerCheck /> : null}

                  <div className='font-semibold text-gray-13'>{item.title}</div>
                  <div className='mt-1 text-sm text-gray-11'>{item.subtitle}</div>
                  <code className='mt-auto inline-block w-full truncate rounded-[6px] bg-gray-2 px-2 py-1.5 text-xs text-gray-11'>
                    {item.sample}
                  </code>
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <h3 className='font-bold text-gray-13'>Display Settings</h3>
          <div className='mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3'>
            {displayOptions.map((item) => {
              const isSelected = displayMode === item

              return (
                <button
                  key={item}
                  type='button'
                  className={cn(
                    'relative flex min-h-[72px] w-full items-center gap-3 rounded-[12px] border p-4 text-left transition',
                    isSelected
                      ? 'border-primary-9 bg-primary-2 shadow-sm'
                      : 'border-gray-3 bg-surface hover:border-gray-4 hover:bg-surface-muted',
                  )}
                  onClick={() => setDisplayMode(item)}
                >
                  <span
                    className={cn(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2',
                      isSelected
                        ? 'border-primary-9 bg-primary-9'
                        : 'border-gray-6 bg-surface',
                    )}
                  >
                    {isSelected ? (
                      <span className='h-1.5 w-1.5 rounded-full bg-white' />
                    ) : null}
                  </span>

                  <span className='text-sm font-semibold text-gray-13'>{item}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <p className='mb-5 text-sm text-gray-11'>
        Connect external ERP or business systems and map folder fields for
        synchronization.
      </p>
      <div className='mb-3 text-xs font-bold text-gray-11 uppercase'>
        Available Connections
      </div>
      <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
        {integrations.map((item) => (
          <div className='rounded-[10px] border border-gray-3 p-3' key={item}>
            <div className='mb-3 font-semibold text-gray-13'>{item}</div>
            <button
              className='flex h-8 w-full items-center justify-center gap-2 rounded-[8px] border border-gray-3 text-sm font-semibold hover:bg-surface-muted'
              type='button'
            >
              <Link2 size={14} /> Connect
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
