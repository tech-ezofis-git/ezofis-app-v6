import { Combobox as MantineCombobox, useCombobox } from '@mantine/core'
import { createColumnHelper, useReactTable } from '@tanstack/react-table'
import { Check, Folder } from 'lucide-react'
import {
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { Option } from '@/types/option'
import { createRepository, deleteRepository, updateRepository } from '@/api/createFolder'
import { getRepositoryById, getRepositorys } from '@/api/v6/folder/folder'
import GoogleDriveLogo from '@/assets/brands/googledrive.svg'
import OneDriveLogo from '@/assets/brands/onedrive.svg'
import StorageLogo from '@/assets/brands/storage.svg'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import ConfirmDialog from '@/components/base/ConfirmDialog'
import TableExport from '@/components/base/data-table/actions/TableExport'
import TableSearch from '@/components/base/data-table/actions/TableSearch'
import DataTable from '@/components/base/data-table/DataTable'
import Icon from '@/components/base/icon/Icon'
import AiBrandIcon from '@/components/common/AiBrandIcon'
import InputCheckbox from '@/components/base/inputs/InputCheckbox'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputText from '@/components/base/inputs/InputText'
import InputTextarea from '@/components/base/inputs/InputTextarea'
import ComboboxOptions from '@/components/base/inputs/select/ComboboxOptions'
import ComboboxSearch from '@/components/base/inputs/select/ComboboxSearch'
import { classNames as inputSharedClassNames } from '@/components/base/inputs/shared/constants'
import useLocalSearch from '@/components/base/inputs/shared/hooks/useLocalSearch'
import Menu from '@/components/base/menu/Menu'
import MenuItem from '@/components/base/menu/MenuItem'
import Pagination from '@/components/base/pagination/Pagination'
import showToast from '@/components/base/toast/showToast'
import CustomFilter from '@/components/common/CustomFilter'
import { DynamicIcon } from '@/pages/folders/components/icons'
import BrandCard from '@/pages/dashboard/workflows/accounts-payable/components/setup/components/steps/components/BrandCard'
import SectionHeader from '@/pages/dashboard/workflows/accounts-payable/components/setup/components/steps/components/SectionHeader'
import { OrDivider } from '@/pages/dashboard/workflows/accounts-payable/components/setup/components/steps/components/StepLayout'
import cn from '@/utils/cn'
import { formatDatetime } from '@/utils/dayjs'
import { matchesCategoryFilterValue } from '@/utils/filterUtils'
import {
  settingsHeaderMeta,
  settingsTableCoreOptions,
  useSettingsTablePagination,
  useSettingsTableSearch,
} from '../../helpers/settingsDataTable'
import SettingsFormSection from '../SettingsFormSection'
import SettingsPageHeader, {
  type SettingsAddAction,
  SettingsHeaderAddButton,
} from '../SettingsPageHeader'
import SettingsWizardLayout from '../SettingsWizardLayout'
import SettingsSortableDataTable from '../SettingsSortableDataTable'
import useSettingsTableToolbar from '../useSettingsTableToolbar'
import AiFolderBuilder from './AiFolderBuilder'
import FolderSecurity from './FolderSecurity'
import FolderStorageConnectorPanel, {
  type CloudStorageOption,
} from './FolderStorageConnectorPanel'
type DmsFolderConfigurationProps = {
  onBack?: () => void
}
type FieldDisplayRow = FieldRow & {
  ancestorContinues: boolean[]
  depth: number
  isFileNameField: boolean
  isLastAtDepth: boolean
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

type RepositoryRow = {
  createdAt: string
  createdBy: string
  description: string
  documents: number
  id: string
  name: string
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

const extractRepositories = (
  payload: unknown,
): Array<Record<string, unknown>> => {
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
    createdAt: String(
      repository.createdAtUtc ||
      repository.createdAt ||
      repository.created ||
      '',
    ),
    createdBy: String(
      repository.createdByName ||
      repository.createdBy ||
      repository.ownerName ||
      '',
    ).trim(),
    description: String(repository.description || '').trim(),
    documents: getRepositoryDocumentCount(repository),
    id,
    name,
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
    iconKey: 'folder',
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
    iconKey: 'document',
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
  { description: 'Name & description', id: 1, title: 'Folder Details' },
  { description: 'Storage provider', id: 2, title: 'Storage' },
  { description: 'Metadata fields', id: 3, title: 'Fields' },
  { description: 'Version strategy', id: 4, title: 'Versioning' },
  { description: 'ERP & sync mapping', id: 5, title: 'Integrations' },
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
      'Default storage option provided with your account for immediate access.',
    features: [
      'Enterprise-grade encryption at rest',
      'No third-party account required',
      'Automatic backups and versioning support',
    ],
    id: 'EZOFIS Drive',
    logo: StorageLogo,
    status: 'Ready to use',
    storageProviderCode: 'EZOFIS',
    subtitle: 'Built-in secure storage',
    title: 'Use secure cloud storage',
    type: 'Built-in provider',
  },
  {
    comingSoon: false,
    connectorType: 'ONE_DRIVE',
    description: 'Store folder documents in Microsoft OneDrive.',
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
    title: 'OneDrive',
    type: 'Microsoft cloud',
  },
  {
    comingSoon: false,
    connectorType: 'GOOGLE_DRIVE',
    description: 'Store folder documents in Google Drive.',
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
      'Azure Blob storage integration for organizations using Microsoft Azure.',
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
  {
    description: 'Configure ERP or system integrations later.',
    icon: 'tabler:clock',
    id: 'None',
    title: 'Skip for now',
  },
  {
    description: 'Sync folder documents and metadata with SAP ERP.',
    icon: 'tabler:building-warehouse',
    id: 'SAP',
    title: 'SAP',
  },
  {
    description: 'Connect Oracle ERP for invoice and master data sync.',
    icon: 'tabler:database',
    id: 'Oracle ERP',
    title: 'Oracle ERP',
  },
  {
    description: 'Integrate with Microsoft Dynamics for finance workflows.',
    icon: 'tabler:brand-windows',
    id: 'Microsoft Dynamics',
    title: 'Microsoft Dynamics',
  },
  {
    description: 'Link QuickBooks for accounting and payment updates.',
    icon: 'tabler:receipt-2',
    id: 'QuickBooks',
    title: 'QuickBooks',
  },
  {
    description: 'Use a custom API endpoint for your own systems.',
    icon: 'tabler:api',
    id: 'Custom API',
    title: 'Custom API',
  },
] as const
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

const FOLDER_FIELD_ICON_LABELS: Record<
  (typeof FOLDER_FIELD_ICON_KEYS)[number],
  string
> = {
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
  isFileNameField = false,
) => {
  if (isFileNameField) return 'document'
  if (!field.includeInFolderStructure) return 'tag'

  return field.iconKey &&
    field.iconKey !== 'document' &&
    field.iconKey !== 'tag'
    ? field.iconKey
    : 'folder'
}

const getFieldIconVariant = (
  field: Pick<FieldRow, 'includeInFolderStructure'> & {
    isFileNameField?: boolean
  },
): 'folder' | 'fileName' | 'metadata' => {
  if (!field.includeInFolderStructure) return 'metadata'
  if (field.isFileNameField) return 'fileName'
  return 'folder'
}

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
  // Keep folder-structure fields first as a tree, then metadata fields flat.
  // Last hierarchy field is always the file-name level; earlier ones are folders.
  const sorted = recalculateFieldHierarchy(fields)
  const folderFields = sorted.filter((field) => field.includeInFolderStructure)
  const fileNameFieldId = folderFields[folderFields.length - 1]?.id

  const withDepth = sorted.map((field) => {
    const isFileNameField =
      field.includeInFolderStructure && field.id === fileNameFieldId

    return {
      ...field,
      depth: field.includeInFolderStructure ? Math.max(0, field.level - 1) : 0,
      isFileNameField,
    }
  })

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
  const lastFolderIndex = folderFields.length - 1

  return normalized.map((field, index) => {
    const orderId = index + 1

    if (!field.includeInFolderStructure) {
      return {
        ...field,
        iconKey: undefined,
        level: 0,
        orderId,
      }
    }

    const folderIndex = folderIds.indexOf(field.id)
    const isFileNameField = folderIndex === lastFolderIndex

    return {
      ...field,
      iconKey: isFileNameField
        ? 'document'
        : field.iconKey && field.iconKey !== 'document'
          ? field.iconKey
          : 'folder',
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

const mapStorageCodeToOptionId = (storageProviderCode?: string | null) => {
  const code = String(storageProviderCode || 'EZOFIS').toUpperCase()
  const matched = storageOptions.find(
    (option) => option.storageProviderCode.toUpperCase() === code,
  )
  return matched?.id || storageOptions[0].id
}

const mapApiFieldsToFieldRows = (
  apiFields: Array<Record<string, unknown>> | undefined,
): FieldRow[] => {
  if (!Array.isArray(apiFields) || apiFields.length === 0) {
    return defaultFields
  }

  const mapped: FieldRow[] = []

  apiFields.forEach((field, index) => {
    const fieldName = String(field.name || field.fieldName || '').trim()
    if (!fieldName) return

    mapped.push({
      dataType: String(field.dataType || 'SHORT_TEXT'),
      fieldName,
      iconKey: field.iconKey ? String(field.iconKey) : undefined,
      id: String(field.id || `${fieldName}-${index}`),
      includeInFolderStructure: Boolean(field.includeInFolderStructure),
      isMandatory: Boolean(field.isMandatory),
      level: Number(field.level) || 0,
      orderId: Number(field.orderId) || index + 1,
    })
  })

  mapped.sort((left, right) => left.orderId - right.orderId)

  return mapped.length > 0
    ? recalculateFieldHierarchy(mapped)
    : defaultFields
}

const fieldColumnHelper = createColumnHelper<FieldDisplayRow>()

export default function DmsFolderConfiguration({
  onBack,
}: DmsFolderConfigurationProps) {
  // const [securityFolderName, setSecurityFolderName] = useState<string | null>(
  //   null,
  // )
  const [securityRepository, setSecurityRepository] = useState<RepositoryRow | null>(
    null,
  )
  const [editingRepositoryId, setEditingRepositoryId] = useState<string | null>(null)
  const [deletingRepositoryId, setDeletingRepositoryId] = useState<string | null>(
    null,
  )
  const [isDeletingRepository, setIsDeletingRepository] = useState(false)
  const [showWizard, setShowWizard] = useState(false)
  const [showAiBuilder, setShowAiBuilder] = useState(false)
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
  const [showConnectorError, setShowConnectorError] = useState(false)
  const [versioning, setVersioning] = useState('Incremental Version')
  const [displayMode, setDisplayMode] = useState('Show Latest Version Only')
  const [folderName, setFolderName] = useState('')
  const [description, setDescription] = useState('')

  const [repositories, setRepositories] = useState<RepositoryRow[]>([])
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({})
  const [isLoadingRepositories, setIsLoadingRepositories] = useState(true)
  const [isLoadingEditRepository, setIsLoadingEditRepository] = useState(false)

  const filteredRepositories = useMemo(() => {
    return repositories.filter((repo) => {
      let matches = true
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (!value) return
        if (key === 'name') {
          if (
            !matchesCategoryFilterValue(repo.name, value, 'contains') &&
            !matchesCategoryFilterValue(repo.name, value)
          ) {
            matches = false
          }
        } else if (key === 'description') {
          if (
            !matchesCategoryFilterValue(repo.description, value, 'contains') &&
            !matchesCategoryFilterValue(repo.description, value)
          ) {
            matches = false
          }
        } else if (key === 'storage') {
          if (!matchesCategoryFilterValue(repo.storage, value)) matches = false
        } else if (key === 'documents') {
          if (
            !matchesCategoryFilterValue(String(repo.documents), value)
          ) {
            matches = false
          }
        } else if (key === 'status') {
          if (!matchesCategoryFilterValue(repo.status, value)) matches = false
        } else if (key === 'createdAt') {
          if (
            !matchesCategoryFilterValue(repo.createdAt, value, 'contains') &&
            !matchesCategoryFilterValue(repo.createdAt, value)
          ) {
            matches = false
          }
        } else if (key === 'createdBy') {
          if (
            !matchesCategoryFilterValue(repo.createdBy, value, 'contains') &&
            !matchesCategoryFilterValue(repo.createdBy, value)
          ) {
            matches = false
          }
        }
      })
      return matches
    })
  }, [repositories, activeFilters])

  const folderNameOptions = useMemo(
    () =>
      Array.from(
        new Set(
          repositories.map((r) => String(r.name || '').trim()).filter(Boolean),
        ),
      )
        .sort((a, b) => a.localeCompare(b))
        .map((name) => ({ label: name, value: name })),
    [repositories],
  )

  const descriptionOptions = useMemo(
    () =>
      Array.from(
        new Set(
          repositories
            .map((r) => String(r.description || '').trim())
            .filter(Boolean),
        ),
      )
        .sort((a, b) => a.localeCompare(b))
        .map((description) => ({ label: description, value: description })),
    [repositories],
  )

  const storageFilterOptions = useMemo(
    () =>
      Array.from(
        new Set(
          repositories
            .map((r) => String(r.storage || '').trim())
            .filter(Boolean),
        ),
      )
        .sort((a, b) => a.localeCompare(b))
        .map((storage) => ({ label: storage, value: storage })),
    [repositories],
  )

  const documentCountOptions = useMemo(
    () =>
      Array.from(new Set(repositories.map((r) => String(r.documents))))
        .sort((a, b) => Number(a) - Number(b))
        .map((count) => ({ label: count, value: count })),
    [repositories],
  )

  const createdByOptions = useMemo(
    () =>
      Array.from(
        new Set(
          repositories
            .map((r) => String(r.createdBy || '').trim())
            .filter(Boolean),
        ),
      )
        .sort((a, b) => a.localeCompare(b))
        .map((createdBy) => ({ label: createdBy, value: createdBy })),
    [repositories],
  )

  const createdAtOptions = useMemo(
    () =>
      Array.from(
        new Set(
          repositories
            .map((r) => String(r.createdAt || '').trim())
            .filter(Boolean),
        ),
      )
        .sort((a, b) => a.localeCompare(b))
        .map((createdAt) => ({
          label: formatDatetime(createdAt, 'datetime') || createdAt,
          value: createdAt,
        })),
    [repositories],
  )

  const statusOptions = [
    { label: 'Active', value: 'active' },
    { label: 'Archived', value: 'archived' },
  ]

  const openEditRepository = useCallback(async (repository: RepositoryRow) => {
    setSecurityRepository(null)
    setShowAiBuilder(false)
    setIsLoadingEditRepository(true)

    try {
      const response = await getRepositoryById(repository.id)

      if (response.canceled) return

      if (response.error || !response.data) {
        showToast({
          message:
            typeof response.error === 'string'
              ? response.error
              : 'Failed to load folder details.',
          variant: 'error',
        })
        return
      }

      const details = response.data as Record<string, unknown>
      const storageProviderCode = String(
        details.storageProviderCode || 'EZOFIS',
      ).toUpperCase()
      const storageOptionId = mapStorageCodeToOptionId(storageProviderCode)
      const storageOption =
        storageOptions.find((option) => option.id === storageOptionId) ||
        storageOptions[0]
      const providerId = details.storageProviderId
        ? String(details.storageProviderId)
        : null

      setEditingRepositoryId(String(details.id || repository.id))
      setFolderName(String(details.name || repository.name || ''))
      setDescription(
        String(details.description || repository.description || ''),
      )
      setFields(
        mapApiFieldsToFieldRows(
          Array.isArray(details.fields)
            ? (details.fields as Array<Record<string, unknown>>)
            : undefined,
        ),
      )
      setStorage(storageOption.id)
      setShowConnectorError(false)

      if (
        storageOption.storageProviderCode === 'EZOFIS' ||
        !providerId
      ) {
        setStorageConnectorId(null)
        setStorageConnectorLabel(null)
      } else {
        setStorageConnectorId(providerId)
        setStorageConnectorLabel(
          String(details.storageProviderName || storageOption.title),
        )
      }

      setStep(1)
      setShowWizard(true)
    } finally {
      setIsLoadingEditRepository(false)
    }
  }, [])

  const openSecurityRepository = useCallback((repository: RepositoryRow) => {
    setShowWizard(false)
    setShowAiBuilder(false)
    setSecurityRepository(repository)
  }, [])

  const loadRepositoriesRequestIdRef = useRef(0)

  const loadRepositories = useCallback(async () => {
    const requestId = ++loadRepositoriesRequestIdRef.current
    setIsLoadingRepositories(true)

    try {
      const response = await getRepositorys()

      if (
        response.canceled ||
        requestId !== loadRepositoriesRequestIdRef.current
      ) {
        return
      }

      if (response.error) {
        // showToast({
        //   message: 'Failed to load folders.',
        //   variant: 'error',
        // })
        setRepositories([])
        return
      }

      const rows = extractRepositories(response.data)
        .map((repository) => mapRepositoryToRow(repository))
        .filter(
          (repository): repository is RepositoryRow => repository !== null,
        )

      setRepositories(rows)
    } finally {
      if (requestId === loadRepositoriesRequestIdRef.current) {
        setIsLoadingRepositories(false)
      }
    }
  }, [])

  useEffect(() => {
    void loadRepositories()
  }, [loadRepositories])

  const deletingRepository = useMemo(
    () =>
      repositories.find((repository) => repository.id === deletingRepositoryId) ||
      null,
    [deletingRepositoryId, repositories],
  )

  const openDeleteRepository = useCallback((repository: RepositoryRow) => {
    setDeletingRepositoryId(repository.id)
  }, [])

  const cancelDeleteRepository = useCallback(() => {
    if (isDeletingRepository) return
    setDeletingRepositoryId(null)
  }, [isDeletingRepository])

  const confirmDeleteRepository = useCallback(async () => {
    if (!deletingRepositoryId) return

    setIsDeletingRepository(true)
    try {
      const response = await deleteRepository(deletingRepositoryId)

      if (response.error) {
        showToast({
          message:
            typeof response.error === 'string'
              ? response.error
              : 'Failed to delete folder',
          variant: 'error',
        })
        return
      }

      showToast({ message: 'Folder deleted successfully.', variant: 'success' })
      setDeletingRepositoryId(null)
      await loadRepositories()
    } finally {
      setIsDeletingRepository(false)
    }
  }, [deletingRepositoryId, loadRepositories])

  const closeWizard = () => {
    setShowWizard(false)
    setEditingRepositoryId(null)
    setStep(1)
    setStorageConnectorId(null)
    setStorageConnectorLabel(null)
    setShowConnectorError(false)
  }

  const openManualBuilder = () => {
    setShowAiBuilder(false)
    setEditingRepositoryId(null)
    setFolderName('')
    setDescription('')
    setFields(defaultFields)
    setStorage('EZOFIS Drive')
    setStorageConnectorId(null)
    setStorageConnectorLabel(null)
    setShowConnectorError(false)
    setVersioning('Incremental Version')
    setDisplayMode('Show Latest Version Only')
    setStep(1)
    setShowWizard(true)
  }

  const openAiBuilder = () => {
    setShowWizard(false)
    setShowAiBuilder(true)
  }

  const handleAiBuilderApply = (payload: {
    description: string
    fields: Array<{
      dataType: string
      fieldName: string
      iconKey?: string
      includeInFolderStructure: boolean
      isMandatory: boolean
    }>
    folderName: string
    integrations?: string
    storage?: string
    versioning?: string
  }) => {
    const mappedFields = payload.fields.map((field, index) => {
      const includeInFolderStructure = Boolean(field.includeInFolderStructure)

      return {
        dataType: field.dataType || 'SHORT_TEXT',
        fieldName: field.fieldName,
        iconKey: includeInFolderStructure
          ? field.iconKey || 'folder'
          : field.iconKey || 'document',
        id: crypto.randomUUID(),
        includeInFolderStructure,
        isMandatory: Boolean(field.isMandatory),
        level: 0,
        orderId: index + 1,
      }
    })

    setFolderName(payload.folderName)
    setDescription(payload.description)
    setFields(
      mappedFields.length > 0
        ? recalculateFieldHierarchy(mappedFields)
        : defaultFields,
    )
    if (payload.storage) {
      setStorage(payload.storage)
      setStorageConnectorId(null)
      setStorageConnectorLabel(null)
    }
    if (payload.versioning) {
      setVersioning(payload.versioning)
    }
    setShowAiBuilder(false)
    setStep(1)
    setShowWizard(true)
    showToast({
      message: 'AI folder setup applied. Review and finish configuration.',
      variant: 'success',
    })
  }

  const handleStorageChange = (nextStorage: string) => {
    setStorage(nextStorage)
    setStorageConnectorId(null)
    setStorageConnectorLabel(null)
    setShowConnectorError(false)
  }

  const handleStorageConnectorChange = (
    connectorId: string | null,
    connectorLabel: string | null,
  ) => {
    setStorageConnectorId(connectorId)
    setStorageConnectorLabel(connectorLabel)
    if (connectorId) setShowConnectorError(false)
  }

  const goNext = () => {
    if (step === 2) {
      const selectedStorageOption =
        storageOptions.find((item) => item.id === storage) ?? storageOptions[0]

      if (isCloudStorageOption(selectedStorageOption) && !storageConnectorId) {
        setShowConnectorError(true)
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
      setShowConnectorError(true)
      setStep(2)
      return
    }

    const isEditing = Boolean(editingRepositoryId)

    const payload = {
      description,
      fields: fields.map((field, index) => ({
        ...(isEditing ? { id: field.id } : {}),
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
      const response = isEditing
        ? await updateRepository(editingRepositoryId as string, payload)
        : await createRepository(payload)

      if (response.error) {
        showToast({
          message: isEditing
            ? `Failed to update folder: ${response.error}`
            : `Failed to create folder: ${response.error}`,
          variant: 'error',
        })
        return
      }

      showToast({
        message: isEditing
          ? 'Folder updated successfully.'
          : 'Folder created successfully.',
        variant: 'success',
      })
      await loadRepositories()
      closeWizard()
    } finally {
      setIsSavingRepository(false)
    }
  }

  const {
    pagination,
    table: repositoryTable,
    tableSearchOptions,
  } = useRepositoryTable(filteredRepositories, {
    onDeleteRepository: openDeleteRepository,
    onEditRepository: (repository) => {
      void openEditRepository(repository)
    },
    onSecurityRepository: openSecurityRepository,
  })
  const repositoryToolbar = useSettingsTableToolbar({
    isReLoading: isLoadingRepositories,
    table: repositoryTable,
    onReload: () => {
      void loadRepositories()
    },
  })

  const formattedWizardSteps = useMemo(
    () =>
      wizardSteps.map((item) => ({
        id: item.id - 1,
        label: item.title,
        description: item.description,
        icon:
          item.id === 1
            ? 'tabler:folder'
            : item.id === 2
              ? 'tabler:database'
              : item.id === 3
                ? 'tabler:list-details'
                : item.id === 4
                  ? 'tabler:git-branch'
                  : 'tabler:api',
      })),
    [],
  )

  if (securityRepository) {
    return (
      <FolderSecurity
        folderName={securityRepository.name}
        repositoryId={securityRepository.id}
        onBack={() => setSecurityRepository(null)}
        onBackToSettings={onBack}
      />
    )
  }

  if (showAiBuilder) {
    return (
      <AiFolderBuilder
        onBack={() => setShowAiBuilder(false)}
        onBackToSettings={onBack}
        onApply={handleAiBuilderApply}
      />
    )
  }

  if (showWizard) {
    return (
      <SettingsWizardLayout
        activeStep={step - 1}
        steps={formattedWizardSteps}
        onStepChange={(stepIdx) => setStep((stepIdx + 1) as WizardStep)}
        onBack={goBack}
        onNext={goNext}
        onSave={() => {
          void handleCreateRepository()
        }}
        onCancel={closeWizard}
        onBackToSettings={onBack}
        isSaving={isSavingRepository}
        nextLabel='Continue'
        saveLabel={editingRepositoryId ? 'Update' : 'Save'}
        moduleTitle='Folder Configuration'
        setupTitle={editingRepositoryId ? 'Edit Folder' : 'Create Folder'}
        headerTitle={
          editingRepositoryId ? 'Edit Folder Setup' : 'New Folder Setup'
        }
        headerDescription='Configure repository storage, metadata fields, versioning, and integrations'
      >
        <WizardContent
          description={description}
          displayMode={displayMode}
          editingRepositoryId={editingRepositoryId}
          fields={fields}
          folderName={folderName}
          onBack={onBack}
          setStep={setStep}
          showConnectorError={showConnectorError}
          step={step}
          storage={storage}
          storageConnectorId={storageConnectorId}
          storageConnectorLabel={storageConnectorLabel}
          versioning={versioning}
          setDescription={setDescription}
          setDisplayMode={setDisplayMode}
          setFields={setFields}
          setFolderName={setFolderName}
          setStorage={handleStorageChange}
          setVersioning={setVersioning}
          onStorageConnectorChange={handleStorageConnectorChange}
        />
      </SettingsWizardLayout>
    )
  }

  return (
    <div className='flex h-full min-h-0 flex-col bg-[var(--surface)]'>
      <ConfirmDialog
        opened={deletingRepositoryId != null}
        title='Delete Folder'
        description={
          deletingRepository
            ? `Are you sure you want to delete "${deletingRepository.name}"? This action cannot be undone.`
            : 'Are you sure you want to delete this folder? This action cannot be undone.'
        }
        confirmLabel='Delete'
        isConfirming={isDeletingRepository}
        variant='danger'
        onCancel={cancelDeleteRepository}
        onConfirm={() => {
          void confirmDeleteRepository()
        }}
      />
      <div className='flex min-h-0 flex-1 flex-col'>
        <SettingsPageHeader
          description='Create and manage folders with custom fields, storage, and versioning.'
          title='Folder Configuration'
          onBack={onBack}
        />

        <div className='flex flex-1 flex-col overflow-hidden p-4'>
          <CustomFilter
            activeFilters={activeFilters}
            trailingActions={
              <>
                <TableExport
                  fileName='folders'
                  table={repositoryTable as any}
                />
                <Menu
                  position='bottom-end'
                  width={200}
                  withinPortal
                  target={
                    <IconButton
                      ariaLabel='New Folder'
                      color='primary'
                      icon='lucide:plus'
                      size='md'
                      tooltip='New Folder'
                      variant='solid'
                    />
                  }
                >
                  <MenuItem
                    icon='lucide:wrench'
                    label='Manual builder'
                    onClick={openManualBuilder}
                  />
                  <MenuItem
                    leftSection={
                      <AiBrandIcon className='size-4' variant='outline-purple' />
                    }
                    label='AI builder'
                    onClick={openAiBuilder}
                  />
                </Menu>
              </>
            }
            actionButtons={[
              {
                color: 'gray',
                disabled: isLoadingRepositories,
                icon: 'tabler:refresh',
                id: 'refresh',
                isIconButton: true,
                tooltip: 'Refresh',
                variant: 'outline',
                onClick: loadRepositories,
              },
            ]}
            customSearchComponent={
              <TableSearch table={repositoryTable as any} />
            }
            filters={[
              {
                id: 'name',
                label: 'Folder',
                options: folderNameOptions,
                searchable: true,
                searchPlaceholder: 'Search folder...',
              },
              {
                id: 'storage',
                label: 'Storage',
                options: storageFilterOptions,
              },
              { id: 'status', label: 'Status', options: statusOptions },
            ]}
            moreFilters={[
              {
                id: 'description',
                label: 'Description',
                options: descriptionOptions,
                searchable: true,
                searchPlaceholder: 'Search description...',
              },
              {
                id: 'documents',
                label: 'Documents',
                options: documentCountOptions,
              },
              {
                id: 'createdAt',
                label: 'Created',
                options: createdAtOptions,
              },
              {
                id: 'createdBy',
                label: 'Created By',
                options: createdByOptions,
                searchable: true,
                searchPlaceholder: 'Search created by...',
              },
            ]}
            onFilterChange={(id, val) => {
              setActiveFilters((prev) => ({ ...prev, [id]: val }))
            }}
            showReset={
              Object.keys(activeFilters).some((k) => activeFilters[k]) ||
              !!tableSearchOptions.state.globalFilter?.value
            }
            onReset={() => {
              setActiveFilters({})
              tableSearchOptions.onGlobalFilterChange({ id: '', value: '' })
            }}
          />

          <div className='mt-2 flex min-h-0 flex-1 flex-col overflow-hidden'>
            <div className='min-h-0 flex-1 overflow-hidden'>
              <DataTable
                isLoading={isLoadingRepositories || isLoadingEditRepository}
                isReLoading={isLoadingRepositories || isLoadingEditRepository}
                pageSize={pagination.pageSize}
                rowSize={repositoryToolbar.rowSize}
                table={repositoryTable}
                hideActionBar
                hideGrouping
                stickyHeader
                onReload={() => {
                  void loadRepositories()
                }}
                onRowSizeChange={repositoryToolbar.onRowSizeChange}
              />
            </div>
            <Pagination
              className='mt-4 shrink-0'
              itemLabel='Folders'
              page={pagination.page}
              pageSize={pagination.pageSize}
              showPageNumbers={false}
              totalItems={repositoryTable.getFilteredRowModel().rows.length}
              onPageChange={pagination.onPageChange}
              onPageSizeChange={pagination.onPageSizeChange}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function FieldNameCell({
  children,
  field,
}: {
  children: ReactNode
  field: FieldRow & { isFileNameField?: boolean }
}) {
  return (
    <div className='flex min-h-8 min-w-0 items-center gap-2'>
      <FieldTreeIcon
        iconKey={getFieldIconKey(field, Boolean(field.isFileNameField))}
        variant={getFieldIconVariant(field)}
      />
      <div className='min-w-0 flex-1'>{children}</div>
    </div>
  )
}

function FieldNameTreeCell({
  children,
  depth,
  iconKey,
  isLastAtDepth,
  variant,
}: {
  children: ReactNode
  depth: number
  iconKey: string
  isLastAtDepth: boolean
  variant: 'folder' | 'fileName' | 'metadata'
}) {
  return (
    <div className='flex min-h-8 min-w-0 items-center gap-2'>
      <FieldTreeLines depth={depth} isLastAtDepth={isLastAtDepth} />
      <FieldTreeIcon iconKey={iconKey} variant={variant} />
      <div className='min-w-0 flex-1'>{children}</div>
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
          className='flex h-full w-full items-center justify-center text-gray-11'
          type='button'
          onClick={() => combobox.toggleDropdown()}
        >
          <DynamicIcon className='h-3.5 w-3.5' name={selectedKey} />
        </button>
      </MantineCombobox.Target>

      <MantineCombobox.Dropdown
        classNames={{
          dropdown: 'z-[200] border border-gray-3 p-0 shadow-md',
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
    <DynamicIcon className='h-3.5 w-3.5 text-gray-11' name={selectedKey} />
  )

  const leftSection = (
    <div className='flex h-full w-full items-center justify-center border-r border-gray-3'>
      {iconSection}
    </div>
  )

  return (
    <InputText
      classNames={{
        input: cn(inputSharedClassNames.input, heightClass),
      }}
      leftSection={leftSection}
      leftSectionPointerEvents='auto'
      leftSectionWidth={32}
      placeholder={placeholder}
      ref={inputRef}
      value={value}
      styles={{
        input: {
          paddingInlineStart: '2.75rem',
        },
      }}
      onBlur={onBlur}
      onChange={onChange}
    />
  )
}

function FieldsTable({
  fields,
  fieldTypeOptions,
  setFields,
}: {
  fields: FieldRow[]
  fieldTypeOptions: SelectOption[]
  setFields: Dispatch<SetStateAction<FieldRow[]>>
}) {
  const [editingRowId, setEditingRowId] = useState<string | null>(null)

  useEffect(() => {
    setFields((prev) => {
      const next = recalculateFieldHierarchy(prev)
      const unchanged =
        prev.length === next.length &&
        prev.every(
          (field, index) =>
            field.id === next[index]?.id &&
            field.iconKey === next[index]?.iconKey &&
            field.level === next[index]?.level &&
            field.orderId === next[index]?.orderId &&
            field.includeInFolderStructure ===
            next[index]?.includeInFolderStructure,
        )
      return unchanged ? prev : next
    })
  }, [setFields])

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

  const deleteField = (id: string) => {
    setFields((prev) =>
      recalculateFieldHierarchy(prev.filter((field) => field.id !== id)),
    )
    setEditingRowId((current) => (current === id ? null : current))
  }

  const columns = useMemo(
    () => [
      fieldColumnHelper.display({
        enableResizing: false,
        enableSorting: false,
        header: '',
        id: 'drag',
        maxSize: 44,
        meta: { ...settingsHeaderMeta.center, className: 'px-1 !pl-3' },
        minSize: 44,
        size: 44,
        cell: () => null,
      }),
      fieldColumnHelper.accessor('fieldName', {
        enableSorting: false,
        header: () => (
          <div className='flex min-w-0 items-center gap-2'>
            <span aria-hidden className='inline-block h-3.5 w-3.5 shrink-0' />
            <span>Field Name</span>
          </div>
        ),
        id: 'fieldName',
        meta: { ...settingsHeaderMeta.start, className: 'pl-1 pr-3' },
        minSize: 160,
        size: 220,
        cell: ({ row }) => {
          const rowId = row.original.id
          const isRowEditing = editingRowId === rowId

          if (isRowEditing) {
            const isFolderLevel =
              row.original.includeInFolderStructure &&
              !row.original.isFileNameField
            const nameInput = (
              <FieldNameWithIconInput
                iconKey={getFieldIconKey(
                  row.original,
                  row.original.isFileNameField,
                )}
                showIconPicker={isFolderLevel}
                value={row.original.fieldName}
                onChange={(value) => updateField(rowId, { fieldName: value })}
                onIconChange={(iconKey) => updateField(rowId, { iconKey })}
              />
            )

            if (row.original.includeInFolderStructure) {
              return (
                <div className='flex min-h-8 min-w-0 items-center gap-2'>
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
            <div className='truncate text-13 font-medium text-gray-12'>
              {row.original.fieldName}
            </div>
          )

          return row.original.includeInFolderStructure ? (
            <FieldNameTreeCell
              depth={row.original.depth}
              iconKey={getFieldIconKey(
                row.original,
                row.original.isFileNameField,
              )}
              isLastAtDepth={row.original.isLastAtDepth}
              variant={getFieldIconVariant(row.original)}
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
        minSize: 120,
        size: 140,
        cell: ({ row }) => {
          const rowId = row.original.id
          const isRowEditing = editingRowId === rowId

          if (!isRowEditing) {
            return (
              <span className='text-13 font-medium text-gray-12'>
                {formatDataTypeLabel(row.original.dataType)}
              </span>
            )
          }

          return (
            <div className='w-full max-w-[170px]'>
              <InputSelect
                classNames={{ input: 'h-8 text-12' }}
                options={fieldTypeOptions}
                width='target'
                value={
                  fieldTypeOptions.find(
                    (option) => option.value === row.original.dataType,
                  ) ||
                  fieldTypeOptions[0] ||
                  null
                }
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
        minSize: 72,
        size: 80,
        cell: ({ row }) => {
          const rowId = row.original.id
          const isRowEditing = editingRowId === rowId

          if (!isRowEditing) {
            return (
              <div className='flex justify-center'>
                <span className='text-13 font-medium text-gray-12'>
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
        meta: {
          ...settingsHeaderMeta.center,
          className: 'whitespace-nowrap',
          disableEllipsis: true,
        },
        minSize: 110,
        size: 110,
        cell: ({ row }) => {
          const rowId = row.original.id
          const isRowEditing = editingRowId === rowId
          const isMandatory = Boolean(
            row.original.includeInFolderStructure || row.original.isMandatory,
          )

          if (!isRowEditing) {
            return (
              <div className='flex justify-center'>
                <span className='text-13 font-medium text-gray-12'>
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
        id: 'actions',
        maxSize: 88,
        meta: settingsHeaderMeta.center,
        minSize: 88,
        size: 88,
        cell: ({ row }) => {
          const rowId = row.original.id
          const isRowEditing = editingRowId === rowId

          return (
            <div className='flex items-center justify-center gap-0.5'>
              <IconButton
                ariaLabel={isRowEditing ? 'Done editing' : 'Edit field'}
                color='gray'
                icon={isRowEditing ? 'lucide:check' : 'lucide:pencil'}
                size='sm'
                variant='ghost'
                onClick={() => toggleRowEdit(rowId)}
              />
              <IconButton
                ariaLabel='Delete field'
                color='gray'
                icon='lucide:trash-2'
                size='sm'
                variant='ghost'
                onClick={() => deleteField(rowId)}
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
      <div className='rounded-xl border border-[var(--gray-3)] bg-surface px-4 py-6 text-center text-13 font-medium text-gray-12 shadow-sm'>
        No fields configured yet. Use the form above to add your first field.
      </div>
    )
  }

  return (
    <SettingsSortableDataTable
      rowClassName='group'
      table={table}
      getRowClassName={(row) =>
        !row.includeInFolderStructure ? 'bg-[var(--gray-1)]/70' : undefined
      }
      onReorder={handleReorder}
      onValidateReorder={handleValidateReorder}
    />
  )
}

function FieldTreeIcon({
  iconKey,
  variant,
}: {
  iconKey: string
  variant: 'folder' | 'fileName' | 'metadata'
}) {
  return (
    <span
      className={cn(
        'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded',
        variant === 'folder' && 'bg-primary-3 text-primary-9',
        variant === 'fileName' && 'bg-blue-3 text-blue-9',
        variant === 'metadata' && 'bg-gray-3 text-gray-11',
      )}
    >
      <DynamicIcon className='h-2.5 w-2.5' name={iconKey} />
    </span>
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
      className='relative shrink-0 self-stretch'
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

function useRepositoryTable(
  rows: RepositoryRow[],
  {
    onDeleteRepository,
    onEditRepository,
    onSecurityRepository,
  }: {
    onDeleteRepository: (repository: RepositoryRow) => void
    onEditRepository: (repository: RepositoryRow) => void
    onSecurityRepository: (repository: RepositoryRow) => void
  },
) {
  const columnHelper = createColumnHelper<RepositoryRow>()
  const tableSearchOptions = useSettingsTableSearch()
  const {
    page,
    pageSize,
    pagination,
    paginationModel,
    onPageChange,
    onPageSizeChange,
    onPaginationChange,
  } = useSettingsTablePagination()

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
            <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--primary-3)] text-[var(--primary-9)]'>
              <Folder size={16} />
            </div>
          </div>
        ),
      }),
      columnHelper.accessor('name', {
        enableSorting: false,
        header: 'Folder',
        id: 'folder',
        meta: { ...settingsHeaderMeta.start, label: 'Folder' },
        minSize: 40,
        size: 200,
        cell: ({ getValue }) => (
          <span className='text-sm font-semibold text-[var(--gray-13)]'>
            {String(getValue() || '')}
          </span>
        ),
      }),
      columnHelper.accessor('description', {
        enableSorting: false,
        header: 'Description',
        id: 'description',
        meta: { ...settingsHeaderMeta.start, label: 'Description' },
        minSize: 40,
        size: 220,
        cell: ({ getValue }) => (
          <span className='text-sm text-[var(--gray-12)]'>
            {String(getValue() || '').trim()}
          </span>
        ),
      }),
      columnHelper.accessor('storage', {
        enableSorting: false,
        header: 'Storage',
        id: 'storage',
        meta: {
          ...settingsHeaderMeta.start,
          disableEllipsis: true,
          label: 'Storage',
        },
        minSize: 40,
        size: 120,
        cell: ({ getValue }) => (
          <span className='inline-flex items-center rounded-[10px] border border-[var(--border-default)] bg-surface px-3 py-1 font-medium text-[var(--gray-13)]'>
            {getValue()}
          </span>
        ),
      }),
      columnHelper.accessor('documents', {
        enableSorting: false,
        header: 'Documents',
        id: 'documents',
        meta: {
          ...settingsHeaderMeta.start,
          disableEllipsis: true,
          label: 'Documents',
        },
        minSize: 40,
        size: 110,
        cell: ({ getValue }) => (
          <span className='inline-flex items-center rounded-[10px] border border-[var(--border-default)] bg-surface px-3 py-1 font-medium text-[var(--gray-13)]'>
            {getValue().toLocaleString()}
          </span>
        ),
      }),
      columnHelper.accessor('status', {
        enableSorting: false,
        header: 'Status',
        id: 'status',
        meta: {
          ...settingsHeaderMeta.start,
          disableEllipsis: true,
          label: 'Status',
        },
        minSize: 40,
        size: 110,
        cell: ({ getValue }) => {
          const status = getValue()
          const isActive = status === 'active'
          return (
            <span
              className={[
                'inline-flex items-center rounded-[10px] border px-2.5 py-0.5 text-xs font-normal capitalize',
                isActive
                  ? 'border-[var(--green-5)] bg-[var(--green-3)] text-[var(--green-11)]'
                  : 'border-[var(--gray-4)] bg-[var(--gray-2)] text-[var(--gray-10)]',
              ].join(' ')}
            >
              {isActive ? 'Active' : 'Archived'}
            </span>
          )
        },
      }),
      columnHelper.accessor('createdAt', {
        enableSorting: false,
        header: 'Created',
        id: 'createdAt',
        meta: { ...settingsHeaderMeta.start, label: 'Created' },
        minSize: 40,
        size: 145,
        cell: ({ getValue }) => {
          const raw = String(getValue() || '').trim()
          if (!raw) return <span />
          return <span>{formatDatetime(raw, 'datetime')}</span>
        },
      }),
      columnHelper.accessor('createdBy', {
        enableSorting: false,
        header: 'Created By',
        id: 'createdBy',
        meta: { ...settingsHeaderMeta.start, label: 'Created By' },
        minSize: 40,
        size: 140,
        cell: ({ getValue }) => (
          <span className='text-sm text-[var(--gray-12)]'>
            {String(getValue() || '').trim()}
          </span>
        ),
      }),
      columnHelper.display({
        enableResizing: false,
        enableSorting: false,
        header: '',
        id: 'actions',
        meta: settingsHeaderMeta.end,
        minSize: 56,
        size: 56,
        cell: ({ row }) => {
          const repository = row.original

          return (
            <div
              className='flex items-center justify-end gap-1'
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
                <MenuItem
                  icon='lucide:shield'
                  label='Security'
                  onClick={() => onSecurityRepository(repository)}
                />
                <MenuItem
                  className='text-red-11'
                  icon='lucide:trash-2'
                  iconClass='text-red-11'
                  label='Delete'
                  onClick={() => onDeleteRepository(repository)}
                />
              </Menu>
            </div>
          )
        },
      }),
    ],
    [columnHelper, onDeleteRepository, onEditRepository, onSecurityRepository],
  )

  const table = useReactTable({
    ...settingsTableCoreOptions,
    ...tableSearchOptions,
    ...paginationModel,
    columns,
    data: rows,
    state: {
      ...tableSearchOptions.state,
      pagination,
    },
    getRowId: (row) => row.id,
    onPaginationChange,
  })

  return {
    pagination: {
      page,
      pageSize,
      onPageChange,
      onPageSizeChange,
    },
    table,
    tableSearchOptions,
  }
}

function WizardContent({
  description,
  displayMode,
  editingRepositoryId,
  fields,
  folderName,
  onBack,
  showConnectorError,
  step,
  storage,
  storageConnectorId,
  storageConnectorLabel,
  versioning,
  setDescription,
  setDisplayMode,
  setFields,
  setFolderName,
  setStep,
  setStorage,
  setVersioning,
  onStorageConnectorChange,
}: {
  description: string
  displayMode: string
  editingRepositoryId?: string | null
  fields: FieldRow[]
  folderName: string
  onBack?: () => void
  setDescription: Dispatch<SetStateAction<string>>
  setDisplayMode: Dispatch<SetStateAction<string>>
  setFields: Dispatch<SetStateAction<FieldRow[]>>
  setFolderName: Dispatch<SetStateAction<string>>
  setStep: (step: WizardStep) => void
  setVersioning: Dispatch<SetStateAction<string>>
  showConnectorError?: boolean
  step: WizardStep
  storage: string
  storageConnectorId: string | null
  storageConnectorLabel: string | null
  versioning: string
  onStorageConnectorChange: (
    connectorId: string | null,
    connectorLabel: string | null,
  ) => void
  setStorage: (nextStorage: string) => void
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
  const [selectedIntegration, setSelectedIntegration] = useState<string>('None')
  const [connectedIntegrationId, setConnectedIntegrationId] = useState<
    string | null
  >(null)

  const loadFieldTypes = useCallback(async () => {
    const types = new Set<string>(REPOSITORY_FIELD_DATA_TYPES)
    const response = await getRepositorys()

    if (!response.error && Array.isArray(response.data)) {
      response.data.forEach(
        (repository: { fields?: Array<{ dataType?: string }> }) => {
          ; (repository.fields || []).forEach((field) => {
            if (field.dataType) types.add(field.dataType)
          })
        },
      )
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
          iconKey: newIsFolder
            ? String(newFieldIcon?.value || 'folder')
            : undefined,
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
      </SettingsFormSection>
    )
  }

  if (step === 2) {
    const selectedStorage =
      storageOptions.find((item) => item.id === storage) ?? storageOptions[0]
    const defaultStorage = storageOptions[0]
    const cloudStorageOptions = storageOptions.filter(
      (item) => item.id !== defaultStorage.id,
    )
    const isCloudSelected = isCloudStorageOption(selectedStorage)

    return (
      <SettingsFormSection>
        <div className='space-y-6'>
          <div>
            <SectionHeader
              description='Use built-in secure storage for folder documents.'
              title='Default Storage'
            />
            <BrandCard
              checked={storage === defaultStorage.id}
              connected={storage === defaultStorage.id}
              description={defaultStorage.description}
              logo={defaultStorage.logo}
              name={defaultStorage.title}
              value={defaultStorage.id}
              onClick={() => setStorage(defaultStorage.id)}
            />
          </div>

          <OrDivider />

          <div>
            <SectionHeader
              description='Connect your provider to securely store and manage folder documents.'
              title='Cloud Integrations'
            />
            <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
              {cloudStorageOptions.map((item) => {
                const isSelected = storage === item.id
                const isDisabled = item.comingSoon

                return (
                  <div
                    key={item.id}
                    className={cn(
                      isDisabled && 'pointer-events-none opacity-60',
                    )}
                  >
                    <BrandCard
                      checked={isSelected}
                      connected={
                        isSelected &&
                        Boolean(storageConnectorId) &&
                        !isDisabled
                      }
                      description={
                        isDisabled
                          ? 'Coming soon'
                          : isSelected && storageConnectorId
                            ? storageConnectorLabel || 'Connected'
                            : item.description
                      }
                      icon={item.icon}
                      logo={item.logo}
                      name={item.title}
                      value={item.id}
                      onClick={() => {
                        if (!isDisabled) setStorage(item.id)
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
              error={
                showConnectorError
                  ? 'Please fill the required field: Connector'
                  : undefined
              }
              option={selectedStorage}
              required
              onConnectorChange={onStorageConnectorChange}
            />
          ) : null}
        </div>
      </SettingsFormSection>
    )
  }

  if (step === 3) {
    return (
      <SettingsFormSection>
        <div className='flex flex-col gap-3'>
          <div>
            <h3 className='mb-3 text-14/5 font-semibold text-gray-12'>
              Folder Fields
            </h3>

            <div className='rounded-lg border border-gray-3 bg-surface p-4'>
              <div className='flex flex-col gap-4'>
                <div className='grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_200px] md:items-end'>
                  <div>
                    <label className='mb-2 block text-13 font-medium text-gray-11'>
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

                  <InputSelect
                    label='Type'
                    options={fieldTypeOptions}
                    placeholder='Field type'
                    width='target'
                    value={
                      fieldTypeOptions.find(
                        (option) => option.value === newFieldType,
                      ) ||
                      fieldTypeOptions[0] ||
                      null
                    }
                    onChange={(selected) => {
                      if (!selected) return
                      setNewFieldType(String(selected.value || selected.name))
                    }}
                  />
                </div>

                <div className='flex flex-wrap items-center justify-between gap-3'>
                  <div className='flex flex-wrap items-center gap-5'>
                    <label className='flex h-9 cursor-pointer items-center gap-2 text-13 font-medium text-gray-12'>
                      <InputCheckbox
                        checked={newIsFolder}
                        onChange={(checked) => {
                          const isFolder = Boolean(checked)
                          setNewIsFolder(isFolder)
                          if (isFolder) setNewIsMandatory(true)
                        }}
                      />
                      Folder
                    </label>

                    <label className='flex h-9 cursor-pointer items-center gap-2 text-13 font-medium text-gray-12'>
                      <InputCheckbox
                        checked={newIsFolder || newIsMandatory}
                        disabled={newIsFolder}
                        onChange={(checked) =>
                          setNewIsMandatory(Boolean(checked))
                        }
                      />
                      Mandatory
                    </label>
                  </div>

                  <Button
                    className='h-9'
                    icon='lucide:plus'
                    label='Add Field'
                    onClick={addField}
                  />
                </div>
              </div>
            </div>
          </div>

          <FieldsTable
            fields={fields}
            fieldTypeOptions={fieldTypeOptions}
            setFields={setFields}
          />
        </div>
      </SettingsFormSection>
    )
  }

  if (step === 4) {
    const displayOptions = [
      'Show Latest Version Only',
      'Show All Versions',
      'Version History Panel',
    ] as const

    return (
      <SettingsFormSection>
        <div className='flex flex-col gap-6'>
          <div>
            <h3 className='text-14/5 font-semibold text-gray-12'>
              Version Strategy
            </h3>
            <p className='mt-1 text-13 text-gray-11'>
              Choose how document versions are managed in this folder.
            </p>

            <div className='mt-3 grid grid-cols-1 gap-3'>
              {versionOptions.map((item) => {
                const isSelected = versioning === item.id

                return (
                  <button
                    key={item.id}
                    type='button'
                    className={cn(
                      'flex w-full items-start gap-3 rounded-[12px] border p-3.5 text-left transition',
                      isSelected
                        ? 'border-primary-8 bg-primary-2 shadow-sm ring-1 ring-primary-8'
                        : 'border-gray-3 bg-surface hover:border-primary-5',
                    )}
                    onClick={() => setVersioning(item.id)}
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition',
                        isSelected
                          ? 'border-primary-9 bg-surface'
                          : 'border-gray-7 bg-surface',
                      )}
                    >
                      {isSelected ? (
                        <span className='h-2 w-2 rounded-full bg-primary-9' />
                      ) : null}
                    </span>

                    <div className='min-w-0 flex-1'>
                      <div className='text-13 font-medium text-gray-12'>
                        {item.title}
                      </div>
                      <div className='mt-0.5 text-13 text-gray-11'>
                        {item.subtitle}
                      </div>
                      <code className='mt-2 block truncate rounded-md bg-gray-2 px-2 py-1.5 text-12 text-gray-11'>
                        {item.sample}
                      </code>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <h3 className='text-14/5 font-semibold text-gray-12'>
              Display Settings
            </h3>
            <p className='mt-1 text-13 text-gray-11'>
              Control which versions users see by default.
            </p>

            <div className='mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3'>
              {displayOptions.map((item) => {
                const isSelected = displayMode === item

                return (
                  <button
                    key={item}
                    type='button'
                    className={cn(
                      'flex w-full items-center gap-3 rounded-[12px] border p-3.5 text-left transition',
                      isSelected
                        ? 'border-primary-8 bg-primary-2 shadow-sm ring-1 ring-primary-8'
                        : 'border-gray-3 bg-surface hover:border-primary-5',
                    )}
                    onClick={() => setDisplayMode(item)}
                  >
                    <span
                      className={cn(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition',
                        isSelected
                          ? 'border-primary-9 bg-surface'
                          : 'border-gray-7 bg-surface',
                      )}
                    >
                      {isSelected ? (
                        <span className='h-2 w-2 rounded-full bg-primary-9' />
                      ) : null}
                    </span>

                    <span className='min-w-0 text-13 font-medium text-gray-12'>
                      {item}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </SettingsFormSection>
    )
  }

  if (step === 5) {
    return (
      <SettingsFormSection>
        <div>
          <h3 className='text-14/5 font-semibold text-gray-12'>
            Integrations
          </h3>
          <p className='mt-1 text-13 text-gray-11'>
            Optionally connect an ERP or business system to sync folder fields.
          </p>

          <div className='mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2'>
            {integrations.map((item) => {
              const isSelected = selectedIntegration === item.id
              const isConnected = connectedIntegrationId === item.id
              const canConnect = item.id !== 'None'

              return (
                <div
                  key={item.id}
                  className={cn(
                    'rounded-[12px] border p-3.5 transition',
                    isSelected
                      ? 'border-primary-8 bg-primary-2 shadow-sm ring-1 ring-primary-8'
                      : isConnected
                        ? 'border-green-8 bg-green-1'
                        : 'border-gray-3 bg-surface hover:border-primary-5',
                  )}
                >
                  <div className='flex items-start gap-3'>
                    <button
                      type='button'
                      className={cn(
                        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition',
                        isSelected || isConnected
                          ? 'bg-surface shadow-sm'
                          : 'bg-gray-2',
                      )}
                      onClick={() => {
                        setSelectedIntegration(item.id)
                        if (item.id === 'None') {
                          setConnectedIntegrationId(null)
                        }
                      }}
                    >
                      <Icon
                        className={cn(
                          'size-4',
                          isConnected
                            ? 'text-green-11'
                            : isSelected
                              ? 'text-primary-9'
                              : 'text-gray-11',
                        )}
                        name={item.icon}
                      />
                    </button>

                    <div className='min-w-0 flex-1'>
                      <div className='flex items-center justify-between gap-2'>
                        <button
                          type='button'
                          className='min-w-0 truncate text-left text-13 font-medium text-gray-12'
                          onClick={() => {
                            setSelectedIntegration(item.id)
                            if (item.id === 'None') {
                              setConnectedIntegrationId(null)
                            }
                          }}
                        >
                          {item.title}
                        </button>

                        {canConnect ? (
                          <button
                            type='button'
                            className={cn(
                              'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-12 font-medium transition',
                              isConnected
                                ? 'bg-green-3 text-green-11'
                                : 'bg-primary-3 text-primary-11 hover:bg-primary-4',
                            )}
                            onClick={() => {
                              if (isConnected) {
                                setConnectedIntegrationId(null)
                                if (selectedIntegration === item.id) {
                                  setSelectedIntegration('None')
                                }
                                return
                              }
                              setSelectedIntegration(item.id)
                              setConnectedIntegrationId(item.id)
                            }}
                          >
                            <Icon
                              className='size-3.5'
                              name={
                                isConnected ? 'lucide:check' : 'lucide:link-2'
                              }
                            />
                            {isConnected ? 'Connected' : 'Connect'}
                          </button>
                        ) : (
                          <span
                            aria-hidden
                            className='inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-12 font-medium opacity-0'
                          >
                            <Icon className='size-3.5' name='lucide:link-2' />
                            Connect
                          </span>
                        )}
                      </div>

                      <button
                        type='button'
                        className='mt-0.5 w-full text-left text-12 text-gray-11'
                        onClick={() => {
                          setSelectedIntegration(item.id)
                          if (item.id === 'None') {
                            setConnectedIntegrationId(null)
                          }
                        }}
                      >
                        {item.description}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </SettingsFormSection>
    )
  }

  return null
}
