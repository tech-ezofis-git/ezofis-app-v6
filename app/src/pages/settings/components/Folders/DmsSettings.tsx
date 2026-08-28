import { msg } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import {
  Combobox as MantineCombobox,
  TagsInput,
  useCombobox,
} from '@mantine/core'
import { createColumnHelper, useReactTable } from '@tanstack/react-table'
import { Check, Folder, Plus } from 'lucide-react'
import { AnimatePresence } from 'motion/react'
import {
  type Dispatch,
  Fragment,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import * as XLSX from 'xlsx'
import type { Option } from '@/types/option'
import { axiosV6 } from '@/api/axios'
import {
  createRepository,
  deleteRepository,
  updateRepository,
} from '@/api/createFolder'
import formApi from '@/api/form/form'
import { getRepositoryById, getRepositorys } from '@/api/v6/folder/folder'
import {
  completeWizardDraft,
  deleteWizardDraft,
  getActiveWizardDraft,
  saveWizardDraft,
} from '@/api/v6/wizardDrafts'
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
import InputCheckbox from '@/components/base/inputs/InputCheckbox'
import InputRadioGroup from '@/components/base/inputs/InputRadioGroup'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputSelectMultiple from '@/components/base/inputs/InputSelectMultiple'
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
import Tooltip from '@/components/base/Tooltip'
import AiBrandIcon from '@/components/common/AiBrandIcon'
import { AnimateFadeIn } from '@/components/common/animations'
import CustomFilter from '@/components/common/CustomFilter'
import BrandCard from '@/pages/dashboard/workflows/accounts-payable/components/setup/components/steps/components/BrandCard'
import SectionHeader from '@/pages/dashboard/workflows/accounts-payable/components/setup/components/steps/components/SectionHeader'
import { OrDivider } from '@/pages/dashboard/workflows/accounts-payable/components/setup/components/steps/components/StepLayout'
import { DynamicIcon } from '@/pages/folders/components/icons'
import cn from '@/utils/cn'
import { formatDatetime } from '@/utils/dayjs'
import { matchesCategoryFilterValue } from '@/utils/filterUtils'
import {
  settingsHeaderMeta,
  settingsTableCoreOptions,
  useSettingsTablePagination,
  useSettingsTableSearch,
} from '../../helpers/settingsDataTable'
import {
  buildFolderDraftJson,
  folderStepFromDraft,
  folderStepKey,
  type FolderWizardSnapshot,
  hydrateFolderFromDraft,
} from '../../helpers/wizardDraftState'
import SettingsFormSection from '../SettingsFormSection'
import SettingsPageHeader, {
  type SettingsAddAction,
  SettingsHeaderAddButton,
} from '../SettingsPageHeader'
import SettingsSortableDataTable from '../SettingsSortableDataTable'
import SettingsWizardLayout from '../SettingsWizardLayout'
import useSettingsTableToolbar from '../useSettingsTableToolbar'
import AiFolderBuilder from './AiFolderBuilder'
import DmsColumnMapping from './DmsColumnMapping'
import FolderSecurity from './FolderSecurity'
import FolderStorageConnectorPanel, {
  type CloudStorageOption,
} from './FolderStorageConnectorPanel'
import MasterFieldSelectDropdown from './MasterFieldSelectDropdown'

const SESSION_KEY = 'ezofis_dms_settings_state'

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
  optionsJson?: string | null
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

function getStoredState() {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
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

const wizardSteps: WizardStepItem[] = [
  { description: 'Name & description', id: 1, title: 'Folder Details' },
  { description: 'Metadata fields', id: 2, title: 'Fields' },
  { description: 'Storage provider', id: 3, title: 'Storage' },
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
    description: 'Sync Master Form data with corresponding folder fields.',
    icon: 'tabler:file-description',
    id: 'MasterForm',
    title: 'Master Form Sync',
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
  'BOOLEAN',
  'DATE',
  'TIME',
  'DATE_TIME',
  'SINGLE_SELECT',
  'TABLE',
  'BARCODE',
  'OMR',
  'CALCULATED',
  'AUTO_GENERATED',
  'LINK',
  'CURRENCY_AMOUNT',
  'DYNAMIC_TABLE',
] as const

const DATA_TYPE_LABELS: Record<string, string> = {
  AUTO_GENERATED: 'Auto Generated',
  BARCODE: 'Barcode',
  BOOLEAN: 'Boolean',
  CALCULATED: 'Calculated',
  CURRENCY_AMOUNT: 'Currency Amount',
  DATE: 'Date',
  DATE_TIME: 'Date & Time',
  DYNAMIC_TABLE: 'Dynamic Table',
  LINK: 'Link',
  LONG_TEXT: 'Long Text',
  NUMBER: 'Number',
  OMR: 'OMR',
  SHORT_TEXT: 'Short Text',
  SINGLE_SELECT: 'Single Select',
  TABLE: 'Table',
  TIME: 'Time',
}

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
  DATA_TYPE_LABELS[value] ||
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
    return []
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
      optionsJson: field.optionsJson ? String(field.optionsJson) : null,
      orderId: Number(field.orderId) || index + 1,
    })
  })

  mapped.sort((left, right) => left.orderId - right.orderId)

  return recalculateFieldHierarchy(mapped)
}

const fieldColumnHelper = createColumnHelper<FieldDisplayRow>()

export default function DmsFolderConfiguration({
  onBack,
}: DmsFolderConfigurationProps) {
  const { t } = useLingui()
  const storedState = useMemo(() => getStoredState(), [])

  // const [securityFolderName, setSecurityFolderName] = useState<string | null>(
  //   null,
  // )
  const [securityRepository, setSecurityRepository] =
    useState<RepositoryRow | null>(storedState?.securityRepository ?? null)
  const [editingRepositoryId, setEditingRepositoryId] = useState<string | null>(
    storedState?.editingRepositoryId ?? null,
  )
  const [originalFieldIds, setOriginalFieldIds] = useState<Set<string>>(
    storedState?.originalFieldIds
      ? new Set(storedState.originalFieldIds)
      : new Set(),
  )
  const [deletingRepositoryId, setDeletingRepositoryId] = useState<
    string | null
  >(null)
  const [isDeletingRepository, setIsDeletingRepository] = useState(false)
  const [showWizard, setShowWizard] = useState(storedState?.showWizard ?? false)
  const [showAiBuilder, setShowAiBuilder] = useState(
    storedState?.showAiBuilder ?? false,
  )
  const [step, setStep] = useState<WizardStep>(storedState?.step ?? 1)
  const [fields, setFields] = useState<FieldRow[]>(
    Array.isArray(storedState?.fields) ? storedState.fields : [],
  )
  const [storage, setStorage] = useState(storedState?.storage ?? 'EZOFIS Drive')
  const [storageConnectorId, setStorageConnectorId] = useState<string | null>(
    storedState?.storageConnectorId ?? null,
  )
  const [storageConnectorLabel, setStorageConnectorLabel] = useState<
    string | null
  >(storedState?.storageConnectorLabel ?? null)
  const [isSavingRepository, setIsSavingRepository] = useState(false)
  const [showConnectorError, setShowConnectorError] = useState(false)
  const [versioning, setVersioning] = useState(
    storedState?.versioning ?? 'Incremental Version',
  )
  const [displayMode, setDisplayMode] = useState(
    storedState?.displayMode ?? 'Show Latest Version Only',
  )
  const [folderName, setFolderName] = useState(storedState?.folderName ?? '')
  const [description, setDescription] = useState(storedState?.description ?? '')
  const [storageDrive, setStorageDrive] = useState<string | null>(
    storedState?.storageDrive ?? null,
  )
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>(
    storedState?.activeFilters ?? {},
  )
  const folderDraftIdRef = useRef<string | null>(null)

  const persistFolderWizardDraft = useCallback(
    async (currentStep: number, snapshot: FolderWizardSnapshot) => {
      const { data, error } = await saveWizardDraft('folder', {
        currentStep,
        currentStepKey: folderStepKey(currentStep),
        draftId: folderDraftIdRef.current,
        draftJson: JSON.stringify(buildFolderDraftJson(snapshot)),
      })
      if (data?.id) folderDraftIdRef.current = data.id
      if (error) {
        showToast({
          message: error,
          variant: 'warning',
        })
      }
    },
    [],
  )

  const finishFolderWizardDraft = useCallback(async () => {
    let draftId = folderDraftIdRef.current
    folderDraftIdRef.current = null
    if (!draftId) {
      const { data } = await getActiveWizardDraft('folder')
      draftId = data?.id ?? null
    }
    if (!draftId) return
    await completeWizardDraft('folder', draftId)
  }, [])

  const discardFolderWizardDraft = useCallback(async () => {
    const draftId = folderDraftIdRef.current
    folderDraftIdRef.current = null
    if (!draftId) return
    await deleteWizardDraft('folder', draftId)
  }, [])

  useEffect(() => {
    if (!showWizard) return
    if (folderDraftIdRef.current) return

    let cancelled = false
    void (async () => {
      const { data } = await getActiveWizardDraft('folder')
      if (cancelled) return
      if (data?.id) folderDraftIdRef.current = data.id
    })()

    return () => {
      cancelled = true
    }
  }, [showWizard])

  const applyFolderDraftSnapshot = useCallback(
    (
      hydrated: ReturnType<typeof hydrateFolderFromDraft>,
      currentStep?: number,
      currentStepKey?: string,
    ) => {
      if (hydrated.folderName != null) setFolderName(hydrated.folderName)
      if (hydrated.description != null) setDescription(hydrated.description)
      if (hydrated.storage) setStorage(hydrated.storage)
      if (hydrated.storageConnectorId !== undefined) {
        setStorageConnectorId(hydrated.storageConnectorId ?? null)
      }
      if (hydrated.storageConnectorLabel !== undefined) {
        setStorageConnectorLabel(hydrated.storageConnectorLabel ?? null)
      }
      if (hydrated.storageDrive !== undefined) {
        setStorageDrive(hydrated.storageDrive ?? null)
      }
      if (hydrated.versioning) setVersioning(hydrated.versioning)
      if (hydrated.displayMode) setDisplayMode(hydrated.displayMode)
      if (hydrated.fields?.length) {
        setFields(
          hydrated.fields.map((field, index) => ({
            dataType: String(field.dataType || 'SHORT_TEXT'),
            fieldName: String(field.fieldName || ''),
            iconKey: field.iconKey,
            id: String(field.id || crypto.randomUUID()),
            includeInFolderStructure: Boolean(field.includeInFolderStructure),
            isMandatory: Boolean(field.isMandatory),
            level: Number(field.level || 0),
            orderId: Number(field.orderId || index + 1),
          })),
        )
      }
      setStep(folderStepFromDraft(currentStep, currentStepKey))
    },
    [],
  )

  useEffect(() => {
    try {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          activeFilters,
          description,
          displayMode,
          editingRepositoryId,
          fields,
          folderName,
          originalFieldIds: Array.from(originalFieldIds),
          securityRepository,
          showAiBuilder,
          showWizard,
          step,
          storage,
          storageConnectorId,
          storageConnectorLabel,
          storageDrive,
          versioning,
        }),
      )
    } catch {
      // ignore
    }
  }, [
    securityRepository,
    editingRepositoryId,
    originalFieldIds,
    showWizard,
    showAiBuilder,
    step,
    fields,
    storage,
    storageConnectorId,
    storageConnectorLabel,
    versioning,
    displayMode,
    folderName,
    description,
    storageDrive,
    activeFilters,
  ])

  const [repositories, setRepositories] = useState<RepositoryRow[]>([])
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
          if (!matchesCategoryFilterValue(String(repo.documents), value)) {
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
    { label: t`Active`, value: 'active' },
    { label: t`Archived`, value: 'archived' },
  ]

  const openEditRepository = useCallback(
    async (repository: RepositoryRow) => {
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
        const mappedFields = mapApiFieldsToFieldRows(
          Array.isArray(details.fields)
            ? (details.fields as Array<Record<string, unknown>>)
            : undefined,
        )
        setFields(mappedFields)
        setOriginalFieldIds(new Set(mappedFields.map((field) => field.id)))
        setStorage(storageOption.id)
        setShowConnectorError(false)

        if (storageOption.storageProviderCode === 'EZOFIS' || !providerId) {
          setStorageConnectorId(null)
          setStorageConnectorLabel(null)
        } else {
          setStorageConnectorId(providerId)
          setStorageConnectorLabel(
            String(details.storageProviderName || storageOption.title),
          )
        }

        setStorageDrive(
          details.storageDrive ? String(details.storageDrive) : null,
        )
        setStep(1)
        setShowWizard(true)

        const draft = await getActiveWizardDraft('folder')
        folderDraftIdRef.current = draft.data?.id ?? null
        if (!draft.data?.draftJson) return

        const hydrated = hydrateFolderFromDraft(draft.data.draftJson)
        if (
          String(hydrated.editingRepositoryId || '') !==
          String(details.id || repository.id)
        ) {
          return
        }

        applyFolderDraftSnapshot(
          hydrated,
          draft.data.currentStep,
          draft.data.currentStepKey,
        )
      } finally {
        setIsLoadingEditRepository(false)
      }
    },
    [applyFolderDraftSnapshot],
  )

  const openSecurityRepository = useCallback((repository: RepositoryRow) => {
    setShowWizard(false)
    setShowAiBuilder(false)
    setSecurityRepository(repository)
  }, [])

  const loadRepositoriesRequestIdRef = useRef(0)
  const wizardRef = useRef<any>(null)

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
      repositories.find(
        (repository) => repository.id === deletingRepositoryId,
      ) || null,
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

  const resetWizardUi = () => {
    setShowWizard(false)
    setShowAiBuilder(false)
    setEditingRepositoryId(null)
    setOriginalFieldIds(new Set())
    setStep(1)
    setStorageConnectorId(null)
    setStorageConnectorLabel(null)
    setShowConnectorError(false)
    setStorageDrive(null)
  }

  const closeWizard = () => {
    void discardFolderWizardDraft()
    resetWizardUi()
  }

  const openManualBuilder = async () => {
    setShowAiBuilder(false)
    setEditingRepositoryId(null)
    setFolderName('')
    setDescription('')
    setFields([])
    setStorage('EZOFIS Drive')
    setStorageConnectorId(null)
    setStorageConnectorLabel(null)
    setShowConnectorError(false)
    setStorageDrive(null)
    setVersioning('Incremental Version')
    setDisplayMode('Show Latest Version Only')
    setStep(1)

    const { data } = await getActiveWizardDraft('folder')
    folderDraftIdRef.current = data?.id ?? null

    if (data?.draftJson) {
      const hydrated = hydrateFolderFromDraft(data.draftJson)
      if (!hydrated.editingRepositoryId) {
        applyFolderDraftSnapshot(
          hydrated,
          data.currentStep,
          data.currentStepKey,
        )
      }
    }

    setShowWizard(true)
  }

  const openAiBuilder = async () => {
    setShowWizard(false)
    const { data } = await getActiveWizardDraft('folder')
    folderDraftIdRef.current = data?.id ?? null
    setShowAiBuilder(true)
  }

  const handleAiBuilderApply = async (payload: {
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
    const trimmedName = payload.folderName.trim()
    if (!trimmedName) {
      showToast({ message: 'Folder name is required.', variant: 'error' })
      return
    }

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

    const finalFields = recalculateFieldHierarchy(mappedFields)

    setFolderName(trimmedName)
    setDescription(payload.description)
    setFields(finalFields)

    const targetStorage = payload.storage || storage
    const selectedStorageOption =
      storageOptions.find(
        (item) =>
          item.id === targetStorage ||
          item.title.toLowerCase() === targetStorage.toLowerCase(),
      ) ?? storageOptions[0]

    if (payload.storage) {
      setStorage(payload.storage)
    }
    if (payload.versioning) {
      setVersioning(payload.versioning)
    }

    const apiPayload = {
      description: payload.description.trim(),
      fields: finalFields.map((field, index) => ({
        dataType: field.dataType,
        iconKey: field.iconKey,
        includeInFolderStructure: field.includeInFolderStructure,
        isMandatory: field.isMandatory,
        level: field.level,
        name: field.fieldName,
        optionsJson: field.optionsJson,
        orderId: field.orderId ?? index + 1,
      })),
      name: trimmedName,
      storageDrive: null,
      storageProviderCode: selectedStorageOption.storageProviderCode,
      storageProviderId:
        selectedStorageOption.storageProviderCode === 'EZOFIS'
          ? undefined
          : storageConnectorId || undefined,
    }

    try {
      setIsSavingRepository(true)
      const response = await createRepository(apiPayload)

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
      await finishFolderWizardDraft()
      resetWizardUi()
    } catch (error: any) {
      showToast({
        message: `Failed to create folder: ${error?.message || 'Unknown error'}`,
        variant: 'error',
      })
    } finally {
      setIsSavingRepository(false)
    }
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

  const buildManualFolderSnapshot = (): FolderWizardSnapshot => ({
    description,
    displayMode,
    editingRepositoryId,
    fields,
    folderName,
    source: 'manual',
    storage,
    storageConnectorId,
    storageConnectorLabel,
    storageDrive,
    versioning,
  })

  const goNext = () => {
    if (step === 3) {
      const selectedStorageOption =
        storageOptions.find((item) => item.id === storage) ?? storageOptions[0]

      if (isCloudStorageOption(selectedStorageOption) && !storageConnectorId) {
        setShowConnectorError(true)
        return
      }
    }

    void persistFolderWizardDraft(step, buildManualFolderSnapshot())
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
      setStep(3)
      return
    }

    const isEditing = Boolean(editingRepositoryId)

    await persistFolderWizardDraft(5, {
      description,
      displayMode,
      editingRepositoryId,
      fields,
      folderName,
      source: 'manual',
      storage,
      storageConnectorId,
      storageConnectorLabel,
      storageDrive,
      versioning,
    })

    const payload = {
      description,
      fields: fields.map((field, index) => {
        const isUuid =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            field.id,
          )
        const isExistingRecord = originalFieldIds.has(field.id)
        const includeId = isEditing && isUuid && isExistingRecord

        return {
          ...(includeId ? { id: field.id } : {}),
          dataType: field.dataType,
          iconKey: field.iconKey,
          includeInFolderStructure: field.includeInFolderStructure,
          isMandatory: field.isMandatory,
          level: field.level,
          name: field.fieldName,
          optionsJson: field.optionsJson,
          orderId: field.orderId ?? index + 1,
        }
      }),
      name: trimmedName,
      storageDrive: storageDrive || '',
      storageProviderCode: selectedStorageOption.storageProviderCode,
      storageProviderId:
        selectedStorageOption.storageProviderCode === 'EZOFIS'
          ? undefined
          : storageConnectorId,
    }

    setIsSavingRepository(true)

    try {
      let finalStorageDrive = payload.storageDrive

      // Handle "Create Master Form" workflow interception
      const wizardState = wizardRef.current?.getMasterFormState?.()
      if (
        wizardState?.masterFormSetupMode === 'create' &&
        wizardState?.selectedIntegration === 'MasterForm'
      ) {
        const {
          masterFormAllRows,
          masterFormFile,
          syncDataTypes,
          syncMapping,
        } = wizardState

        if (!masterFormFile) {
          showToast({
            message: 'Please upload an Excel file for the Master Form.',
            variant: 'error',
          })
          return
        }

        // 1. Generate Form Payload
        const timestamp = Date.now()
        const folderPrefix = payload.name || 'Folder'
        const filePrefix =
          masterFormFile?.name?.replace(/\.[^/.]+$/, '') || 'Upload'
        const autoTitle = `${folderPrefix}_${filePrefix}_${timestamp}`

        const formTitle = autoTitle
        const formDesc = ''
        const formPayload = {
          description: formDesc,
          formJson: {
            panels: [
              {
                columns: 1,
                fields: Object.entries(syncMapping).map(
                  ([repoName, excelHeader], idx) => {
                    const dataType =
                      syncDataTypes?.[repoName] ||
                      fields.find((f) => f.fieldName === repoName)?.dataType ||
                      'SHORT_TEXT'
                    return {
                      id: `field-${Date.now()}-${idx}`,
                      label: repoName,
                      type: dataType,
                      settings: {
                        aiSettings: {
                          fileDataValidate: [],
                          formControlValidate: {
                            conditionFields: [],
                            existingFormFields: [],
                            formFields: '',
                            masterFormColumn: [],
                            masterFormId: 0,
                            optionsType: '',
                          },
                          imageFileValidate: {
                            formFields: [],
                            optionsType: '',
                          },
                        },
                        general: {
                          dividerType: 'SOLID',
                          hideLabel: false,
                          placeholder: '',
                          size: 'col-12',
                          tooltip: '',
                          url: '',
                          visibility: 'NORMAL',
                        },
                        specific: {
                          additionalLoginTypes: [],
                          allowHalfRating: false,
                          allowMultipleFiles: false,
                          allowMultipleSignatures: false,
                          allowToAddNewOptions: false,
                          autoGenerateValue: {
                            prefix: 'Form',
                            suffix: 'DATE_TIME',
                          },
                          customDefaultValue: '',
                          customOptions: 'Option 1,Option 2',
                          defaultValue: 'CUSTOM',
                          fibFields: [],
                          formula: '',
                          loginType: 'EZOFIS_LOGIN',
                          mappedColumnId: '',
                          mappedFieldId: '',
                          masterFormTableColumns: [],
                          masterTable: '',
                          masterTableColumn: '',
                          matrixColumns: [],
                          matrixRows: [],
                          matrixType: 'SHORT_TEXT',
                          matrixTypeSettings: {},
                          nestedList: [],
                          nestedListFieldType: 'SHORT_TEXT',
                          nestedListItemsPerLine: [],
                          nestedListMaxLevel: 3,
                          nestedListTypeSettings: {},
                          optionsPerLine: 0,
                          optionsType: 'CUSTOM',
                          popupTriggerType: 'BUTTON',
                          qrValue: false,
                          ratingIcon: 'STAR',
                          ratingIconCount: 5,
                          secondaryPanel: '',
                          separateOptionsUsing: 'COMMA',
                          showColumnTotal: false,
                          tableColumns: [],
                          tableFixedRowCount: 0,
                          tableFixedRowLabels: [],
                          tableRowsType: 'ON_DEMAND',
                          tabList: [],
                          textContent: '',
                        },
                        validation: {
                          allowedFileTypes: [],
                          answerIndicator: 'NO',
                          contentRule: '',
                          dateRange: 'NONE',
                          documentExpiryField: '',
                          enableSettings: [],
                          fieldRule: 'OPTIONAL',
                          hasCalculatedField: false,
                          mandatorySettings: [],
                          maxFileSize: 10,
                          maxiDays: 0,
                          maximum: '',
                          maxiTime: 0,
                          miniDays: 0,
                          minimum: '',
                          miniTime: 0,
                          readonlySettings: [],
                          requiredValidation: 'ANY',
                          timeFormat: '12',
                          timeRange: 'NONE',
                          verificationRequired: false,
                        },
                      },
                    }
                  },
                ),
                id: `panel-${Date.now()}`,
                name: 'Master Data',
                settings: {
                  description: 'Master Data Fields',
                  title: formTitle,
                },
              },
            ],
            settings: {
              general: {
                description: formDesc,
                layout: 'CLASSIC',
                name: formTitle,
                type: 'WORKFLOW',
              },
              publish: {
                publishOption: 'PUBLISHED',
                publishSchedule: '',
                unpublishSchedule: '',
              },
            },
          },
          layout: 'CLASSIC',
          name: formTitle,
          publishOption: 'PUBLISHED',
          type: 'WORKFLOW',
        }
        console.log('create api called ')
        // 2. Call formApi.createForm
        const formRes = await formApi.createForm(formPayload)
        if (formRes.error) {
          showToast({
            message: `Failed to create Master Form: ${formRes.error}`,
            variant: 'error',
          })
          return
        }

        const formIdRaw = formRes.data
        const formId =
          typeof formIdRaw === 'string'
            ? formIdRaw
            : formIdRaw?.id || formIdRaw?.formId || formIdRaw?.data || ''
        if (!formId) {
          showToast({
            message: 'Master Form created but no form ID was returned.',
            variant: 'error',
          })
          return
        }
        console.log('form id api called')
        // Fetch the freshly created form to get the actual field IDs generated by the server
        const actualFieldMapping: Record<string, string> = {}
        try {
          const freshFormRes = await formApi.getFormDataById(formId)
          const formJson = freshFormRes.data?.formJson
          const fieldsArray = Array.isArray(formJson?.panels)
            ? formJson.panels.flatMap((panel: any) =>
                Array.isArray(panel?.fields) ? panel.fields : [],
              )
            : Array.isArray(formJson?.fields)
              ? formJson.fields
              : Array.isArray(formJson?.components)
                ? formJson.components
                : []

          fieldsArray.forEach((f: any) => {
            const actualId = String(f.id || f.key || f.name || '')
            const actualLabel = String(
              f.displayLabel ||
                f.label ||
                f.name ||
                f.title ||
                f.id ||
                f.key ||
                '',
            )
            if (actualId && actualLabel) {
              actualFieldMapping[actualLabel] = actualId
            }
          })
        } catch (e) {
          console.error('Failed to fetch fresh form details', e)
        }

        // Upload Excel rows as entries using the background job API
        console.log('masterFormFile', masterFormFile)
        if (masterFormFile) {
          showToast({
            message:
              'Uploading master file to process entries in the background...',
            variant: 'default',
          })
          console.log('upload master file api called')
          try {
            const formData = new FormData()
            formData.append('formId', formId)
            formData.append('file', masterFormFile)

            const uploadRes = await formApi.uploadMasterFile(formData)
            if (uploadRes.error) {
              console.error('Failed to upload master file', uploadRes.error)
              showToast({
                message: `Failed to enqueue background import: ${uploadRes.error}`,
                variant: 'warning',
              })
            } else {
              showToast({
                message:
                  'Master file queued for background import successfully.',
                variant: 'success',
              })
            }
          } catch (entryError) {
            console.error('Failed to upload master file', entryError)
            showToast({
              message: 'Failed to upload master file to the server',
              variant: 'warning',
            })
          }
        }

        // 3. Construct the storageDrive value
        // Format: formId[repoName:formFieldId:sync, ...]
        const mappingParts = Object.entries(syncMapping || {}).map(
          ([repoName, excelHeader]) => {
            const isSync = wizardState?.syncFields?.includes(repoName)
            // Use the actual field ID from the form if available, fallback to the label (repoName)
            const actualFieldId = actualFieldMapping[repoName] || repoName
            return `${repoName}:${actualFieldId}${isSync ? ':sync' : ''}`
          },
        )
        finalStorageDrive = `${formId}[${mappingParts.join(',')}]`
        payload.storageDrive = finalStorageDrive
      } else if (
        wizardState?.masterFormSetupMode === 'existing' &&
        wizardState?.selectedIntegration === 'MasterForm'
      ) {
        const { selectedExistingFormIds, syncFields, syncMapping } = wizardState
        const mappingParts = Object.entries(syncMapping || {}).map(
          ([formIdAndFieldId, repoName]) => {
            const [fId, formFieldId] = formIdAndFieldId.split(':')
            const formIndex = (selectedExistingFormIds || []).indexOf(fId)
            const formRef = formIndex !== -1 ? String(formIndex) : fId
            const isSync = syncFields?.includes(formIdAndFieldId)
            return `${repoName}:${formRef}:${formFieldId}${isSync ? ':sync' : ''}`
          },
        )
        const formIdsStr = (selectedExistingFormIds || []).join(',')
        finalStorageDrive = `${formIdsStr}[${mappingParts.join(',')}]`
        payload.storageDrive = finalStorageDrive
      }
      console.log('create or upload api called')
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
      await finishFolderWizardDraft()
      resetWizardUi()
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

  const formattedWizardSteps = useMemo(() => {
    const isEditMode = editingRepositoryId !== null
    return wizardSteps.map((item) => ({
      clickable: isEditMode ? true : undefined,
      description: item.description,
      disabled: isEditMode ? false : undefined,
      icon:
        item.id === 1
          ? 'tabler:folder'
          : item.id === 2
            ? 'tabler:list-details'
            : item.id === 3
              ? 'tabler:cloud'
              : item.id === 4
                ? 'tabler:git-branch'
                : 'tabler:api',
      id: item.id - 1,
      label: item.title,
    }))
  }, [editingRepositoryId])

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
        onApply={handleAiBuilderApply}
        onBack={() => {
          void discardFolderWizardDraft()
          setShowAiBuilder(false)
        }}
        onBackToSettings={onBack}
      />
    )
  }

  if (showWizard) {
    return (
      <SettingsWizardLayout
        activeStep={step - 1}
        headerDescription={wizardSteps[step - 1]?.description}
        headerTitle={wizardSteps[step - 1]?.title}
        isSaving={isSavingRepository}
        moduleTitle='Folder Configuration'
        nextLabel='Continue'
        saveLabel={editingRepositoryId ? 'Update' : 'Save'}
        steps={formattedWizardSteps}
        setupTitle={editingRepositoryId ? 'Edit Folder' : 'Create Folder'}
        onBack={goBack}
        onBackToSettings={() => {
          void discardFolderWizardDraft()
          onBack?.()
        }}
        onCancel={closeWizard}
        onNext={goNext}
        onSave={() => {
          void handleCreateRepository()
        }}
        onStepChange={(stepIdx) => {
          const next = (stepIdx + 1) as WizardStep
          if (next > step) {
            void persistFolderWizardDraft(step, buildManualFolderSnapshot())
          }
          setStep(next)
        }}
      >
        <AnimatePresence initial={false} mode='wait'>
          <AnimateFadeIn className='flex flex-col gap-6 md:gap-7'>
            <WizardContent
              description={description}
              displayMode={displayMode}
              editingRepositoryId={editingRepositoryId}
              fields={fields}
              folderName={folderName}
              showConnectorError={showConnectorError}
              step={step}
              storage={storage}
              storageConnectorId={storageConnectorId}
              storageConnectorLabel={storageConnectorLabel}
              storageDrive={storageDrive}
              versioning={versioning}
              wizardRef={wizardRef}
              setDescription={setDescription}
              setDisplayMode={setDisplayMode}
              setFields={setFields}
              setFolderName={setFolderName}
              setStep={setStep}
              setStorage={handleStorageChange}
              setStorageDrive={setStorageDrive}
              setVersioning={setVersioning}
              onBack={onBack}
              onStorageConnectorChange={handleStorageConnectorChange}
            />
          </AnimateFadeIn>
        </AnimatePresence>
      </SettingsWizardLayout>
    )
  }

  return (
    <div className='flex h-full min-h-0 flex-col bg-[var(--surface)]'>
      <ConfirmDialog
        confirmLabel='Delete'
        isConfirming={isDeletingRepository}
        opened={deletingRepositoryId != null}
        title='Delete Folder'
        variant='danger'
        description={
          deletingRepository
            ? `Are you sure you want to delete "${deletingRepository.name}"? This action cannot be undone.`
            : 'Are you sure you want to delete this folder? This action cannot be undone.'
        }
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
            showReset={
              Object.keys(activeFilters).some((k) => activeFilters[k]) ||
              !!tableSearchOptions.state.globalFilter?.value
            }
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
                    label='AI builder'
                    leftSection={
                      <AiBrandIcon
                        className='size-4'
                        variant='outline-purple'
                      />
                    }
                    onClick={openAiBuilder}
                  />
                </Menu>
              </>
            }
            onFilterChange={(id, val) => {
              setActiveFilters((prev) => ({ ...prev, [id]: val }))
            }}
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
  disabled,
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
  disabled?: boolean
  iconKey?: string
  placeholder?: string
  showIconPicker: boolean
  size?: 'sm' | 'md'
  value: string
  onBlur?: () => void
  onChange: (value: string) => void
  onIconChange?: (iconKey: string) => void
}) {
  const { t } = useLingui()
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
          disabled={disabled}
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
          placeholder={t`Search icons`}
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
      disabled={disabled}
      leftSection={leftSection}
      leftSectionPointerEvents='auto'
      leftSectionWidth={32}
      placeholder={placeholder}
      ref={inputRef}
      value={value}
      classNames={{
        input: cn(inputSharedClassNames.input, heightClass),
      }}
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

function FieldOptionsConfiguration({
  columnsLength,
  row,
  updateField,
}: {
  columnsLength: number
  row: FieldRow
  updateField: (id: string, updates: Partial<FieldRow>) => void
}) {
  const parsedOptions = useMemo(() => {
    let parsed: any = { type: 'predefined', values: [] }
    try {
      if (row.optionsJson) {
        const p = JSON.parse(row.optionsJson)
        if (Array.isArray(p)) {
          parsed = { type: 'predefined', values: p }
        } else {
          parsed = p
        }
      }
    } catch {}
    return parsed
  }, [row.optionsJson])

  const [optionsType, setOptionsType] = useState<string>(
    parsedOptions.type || 'predefined',
  )
  const [forms, setForms] = useState<any[]>([])
  const [loadingForms, setLoadingForms] = useState(false)
  const [fields, setFields] = useState<any[]>([])
  const [loadingFields, setLoadingFields] = useState(false)

  useEffect(() => {
    if (optionsType === 'master' && forms.length === 0) {
      let isMounted = true
      setLoadingForms(true)
      formApi
        .getForms({
          currentPage: 1,
          itemsPerPage: 1000,
          mode: 'BROWSE',
          sortBy: { criteria: 'name', order: 'ASC' },
        })
        .then((res) => {
          if (!isMounted) return
          let loadedForms: any[] = []
          console.log('forms', res?.data?.data?.[0]?.value)

          if (res?.data?.data?.[0]?.value) {
            loadedForms = res.data.data[0].value
          } else if (Array.isArray(res.data)) {
            if (res.data.length > 0 && res.data[0].value) {
              loadedForms = res.data.flatMap((group: any) => group.value || [])
            } else {
              loadedForms = res.data
            }
          }
          setForms(loadedForms)
        })
        .finally(() => {
          if (isMounted) setLoadingForms(false)
        })
      return () => {
        isMounted = false
      }
    }
  }, [optionsType])

  useEffect(() => {
    if (optionsType === 'master' && parsedOptions.masterFormId) {
      let isMounted = true
      setLoadingFields(true)
      formApi
        .getFormDataById(parsedOptions.masterFormId)
        .then((res) => {
          if (!isMounted) return

          let allFields: any[] = []
          let formJson = res.data?.formJson

          if (typeof formJson === 'string') {
            try {
              formJson = JSON.parse(formJson)
            } catch {}
          }

          if (formJson?.panels && Array.isArray(formJson.panels)) {
            allFields = formJson.panels.flatMap(
              (panel: any) => panel.fields || [],
            )
          } else if (formJson?.fields) {
            allFields = formJson.fields
          }

          setFields(allFields)
        })
        .finally(() => {
          if (isMounted) setLoadingFields(false)
        })
      return () => {
        isMounted = false
      }
    } else if (optionsType === 'master' && !parsedOptions.masterFormId) {
      setFields([])
    }
  }, [optionsType, parsedOptions.masterFormId])

  const handleTypeChange = (val: number) => {
    const typeMap: Record<number, string> = {
      1: 'unique',
      2: 'master',
      3: 'predefined',
    }
    const newType = typeMap[val] || 'predefined'
    setOptionsType(newType)
    updateField(row.id, {
      optionsJson: JSON.stringify({ type: newType, values: [] }),
    })
  }

  const currentTypeVal =
    optionsType === 'unique' ? 1 : optionsType === 'master' ? 2 : 3
  console.log('forms', forms)
  return (
    <tr className='bg-gray-1/50 shadow-inner'>
      <td
        className='border-b border-[var(--gray-3)] px-12 py-5'
        colSpan={columnsLength}
      >
        <div className='flex max-w-md flex-col gap-4'>
          <label className='text-13 font-medium text-gray-12'>
            Options Configuration
          </label>
          <div>
            <InputRadioGroup
              value={currentTypeVal}
              options={[
                { id: 1, name: 'Use unique column values as options' },
                { id: 2, name: 'Use values from a master table as options' },
                { id: 3, name: 'Use predefined values as options' },
              ]}
              onChange={handleTypeChange}
            />
          </div>

          {optionsType === 'predefined' && (
            <div className='pt-1'>
              <InputSelectMultiple
                searchPlaceholder='Type an option and press Enter'
                clearable
                creatable
                searchable
                options={(parsedOptions.values || []).map((opt: string) => ({
                  id: opt,
                  name: opt,
                  value: opt,
                }))}
                value={(parsedOptions.values || []).map((opt: string) => ({
                  id: opt,
                  name: opt,
                  value: opt,
                }))}
                onChange={(newOptions) =>
                  updateField(row.id, {
                    optionsJson: JSON.stringify({
                      ...parsedOptions,
                      values: newOptions.map((o) => o.value || o.name),
                    }),
                  })
                }
              />
            </div>
          )}

          {optionsType === 'master' && (
            <div className='flex flex-col gap-4 pt-1'>
              <InputSelect
                label='Master Form'
                loading={loadingForms}
                options={forms.map((f) => ({ id: String(f.id), name: f.name }))}
                searchPlaceholder='Search master form...'
                searchable
                value={
                  parsedOptions.masterFormId
                    ? {
                        id: parsedOptions.masterFormId,
                        name:
                          forms.find(
                            (f) => String(f.id) === parsedOptions.masterFormId,
                          )?.name || parsedOptions.masterFormId,
                      }
                    : null
                }
                onChange={(selected) => {
                  updateField(row.id, {
                    optionsJson: JSON.stringify({
                      ...parsedOptions,
                      masterFieldId: null,
                      masterFormId: selected?.id || null,
                    }),
                  })
                }}
              />
              {parsedOptions.masterFormId && (
                <InputSelect
                  label='Master Field'
                  loading={loadingFields}
                  searchPlaceholder='Search field...'
                  searchable
                  options={fields.map((f) => ({
                    id: f.id,
                    name: f.label || f.name || f.id,
                  }))}
                  value={
                    parsedOptions.masterFieldId
                      ? {
                          id: parsedOptions.masterFieldId,
                          name:
                            fields.find(
                              (f) => f.id === parsedOptions.masterFieldId,
                            )?.label ||
                            fields.find(
                              (f) => f.id === parsedOptions.masterFieldId,
                            )?.name ||
                            parsedOptions.masterFieldId,
                        }
                      : null
                  }
                  onChange={(selected) => {
                    updateField(row.id, {
                      optionsJson: JSON.stringify({
                        ...parsedOptions,
                        masterFieldId: selected?.id || null,
                      }),
                    })
                  }}
                />
              )}
            </div>
          )}
        </div>
      </td>
    </tr>
  )
}

function FieldsTable({
  fields,
  fieldTypeOptions,
  isEditing,
  setFields,
}: {
  fields: FieldRow[]
  fieldTypeOptions: SelectOption[]
  isEditing?: boolean
  setFields: Dispatch<SetStateAction<FieldRow[]>>
}) {
  const { t } = useLingui()
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
                disabled={Boolean(isEditing)}
                showIconPicker={isFolderLevel}
                value={row.original.fieldName}
                iconKey={getFieldIconKey(
                  row.original,
                  row.original.isFileNameField,
                )}
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
              isLastAtDepth={row.original.isLastAtDepth}
              variant={getFieldIconVariant(row.original)}
              iconKey={getFieldIconKey(
                row.original,
                row.original.isFileNameField,
              )}
            >
              {nameLabel}
            </FieldNameTreeCell>
          ) : (
            <FieldNameCell field={row.original}>{nameLabel}</FieldNameCell>
          )
        },
        header: () => (
          <div className='flex min-w-0 items-center gap-2'>
            <span className='inline-block h-3.5 w-3.5 shrink-0' aria-hidden />
            <span>Field Name</span>
          </div>
        ),
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
            <div className='w-full max-w-[170px] py-1'>
              <InputSelect
                classNames={{ input: 'h-8 text-12' }}
                options={fieldTypeOptions}
                searchPlaceholder='Search type'
                width='target'
                searchable
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
        header: t`Folder`,
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
                disabled={isEditing}
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
                disabled={Boolean(
                  isEditing && row.original.includeInFolderStructure,
                )}
                onClick={() => deleteField(rowId)}
              />
            </div>
          )
        },
      }),
    ],
    [editingRowId, fieldTypeOptions, t],
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
      disabled={(row) => Boolean(isEditing && row.includeInFolderStructure)}
      rowClassName='group'
      table={table}
      renderSubComponent={(row) => {
        if (editingRowId !== row.id) return null

        const hasOptions = [
          'SINGLE_SELECT',
          'MULTI_SELECT',
          'BOOLEAN',
        ].includes(row.dataType)
        if (!hasOptions) return null

        return (
          <FieldOptionsConfiguration
            columnsLength={columns.length}
            row={row}
            updateField={updateField}
          />
        )
      }}
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
  const { t } = useLingui()
  const columnHelper = createColumnHelper<RepositoryRow>()
  const tableSearchOptions = useSettingsTableSearch(SESSION_KEY)
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
        header: t`Folder`,
        id: 'folder',
        meta: { ...settingsHeaderMeta.start, label: t`Folder` },
        minSize: 40,
        size: 200,
        cell: ({ row }) => (
          <button
            className='max-w-full text-left text-sm font-semibold text-[var(--gray-13)] transition-colors hover:underline'
            type='button'
            onClick={() => onEditRepository(row.original)}
          >
            {String(row.original.name || '')}
          </button>
        ),
      }),
      columnHelper.accessor('description', {
        enableSorting: false,
        header: t`Description`,
        id: 'description',
        meta: { ...settingsHeaderMeta.start, label: t`Description` },
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
        header: t`Storage`,
        id: 'storage',
        meta: {
          ...settingsHeaderMeta.start,
          disableEllipsis: true,
          label: t`Storage`,
        },
        minSize: 40,
        size: 120,
        cell: ({ getValue }) => {
          const value = String(getValue() || '')
          const label = value === 'Default' ? t`Default` : value
          return (
            <span className='inline-flex items-center rounded-[10px] border border-[var(--border-default)] bg-surface px-3 py-1 font-medium text-[var(--gray-13)]'>
              {label}
            </span>
          )
        },
      }),
      columnHelper.accessor('documents', {
        enableSorting: false,
        header: t`Documents`,
        id: 'documents',
        meta: {
          ...settingsHeaderMeta.start,
          disableEllipsis: true,
          label: t`Documents`,
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
        header: t`Status`,
        id: 'status',
        meta: {
          ...settingsHeaderMeta.start,
          disableEllipsis: true,
          label: t`Status`,
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
              {isActive ? t`Active` : t`Archived`}
            </span>
          )
        },
      }),
      columnHelper.accessor('createdAt', {
        enableSorting: false,
        header: t`Created`,
        id: 'createdAt',
        meta: { ...settingsHeaderMeta.start, label: t`Created` },
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
        header: t`Created By`,
        id: 'createdBy',
        meta: { ...settingsHeaderMeta.start, label: t`Created By` },
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
                  label={t`Edit`}
                  onClick={() => onEditRepository(repository)}
                />
                <MenuItem
                  icon='lucide:shield'
                  label={t`Security`}
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
  showConnectorError,
  step,
  storage,
  storageConnectorId,
  storageConnectorLabel,
  storageDrive,
  versioning,
  wizardRef,
  setDescription,
  setDisplayMode,
  setFields,
  setFolderName,
  setStep,
  setStorage,
  setStorageDrive,
  setVersioning,
  onBack,
  onStorageConnectorChange,
}: {
  description: string
  displayMode: string
  editingRepositoryId?: string | null
  fields: FieldRow[]
  folderName: string
  setDescription: Dispatch<SetStateAction<string>>
  setDisplayMode: Dispatch<SetStateAction<string>>
  setFields: Dispatch<SetStateAction<FieldRow[]>>
  setFolderName: Dispatch<SetStateAction<string>>
  setStorageDrive: Dispatch<SetStateAction<string | null>>
  setVersioning: Dispatch<SetStateAction<string>>
  showConnectorError?: boolean
  step: WizardStep
  storage: string
  storageConnectorId: string | null
  storageConnectorLabel: string | null
  storageDrive: string | null
  versioning: string
  wizardRef?: React.MutableRefObject<any>
  onBack?: () => void
  onStorageConnectorChange: (
    connectorId: string | null,
    connectorLabel: string | null,
  ) => void
  setStep: (step: WizardStep) => void
  setStorage: (nextStorage: string) => void
}) {
  const { t } = useLingui()
  const [newFieldName, setNewFieldName] = useState('')
  const [newFieldType, setNewFieldType] = useState('SHORT_TEXT')
  const [newIsFolder, setNewIsFolder] = useState(false)
  const [newIsMandatory, setNewIsMandatory] = useState(false)
  const [newFieldOptions, setNewFieldOptions] = useState<string[]>([])
  const [newFieldIcon, setNewFieldIcon] = useState<SelectOption | null>(
    folderIconOptions.find((option) => option.value === 'folder') || null,
  )
  const [fieldTypeOptions, setFieldTypeOptions] = useState<SelectOption[]>(() =>
    toFieldTypeOptions([...REPOSITORY_FIELD_DATA_TYPES]),
  )

  // Master Form Setup Modes
  const [masterFormSetupMode, setMasterFormSetupMode] = useState<
    'existing' | 'create' | null
  >('existing')
  const [masterFormFile, setMasterFormFile] = useState<File | null>(null)
  const [masterFormParsing, setMasterFormParsing] = useState(false)
  const [masterFormHeaders, setMasterFormHeaders] = useState<string[]>([])
  const [masterFormPreviewRows, setMasterFormPreviewRows] = useState<any[]>([])
  const [masterFormAllRows, setMasterFormAllRows] = useState<any[]>([])
  const [existingFormPreviewRows, setExistingFormPreviewRows] = useState<any[]>(
    [],
  )
  const [masterFormRowCount, setMasterFormRowCount] = useState(0)
  const [masterFormUploadState, setMasterFormUploadState] = useState<
    'idle' | 'parsing' | 'ready' | 'error'
  >('idle')
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const handleMasterFileChange = async (file: File | null | undefined) => {
    if (!file) return
    setMasterFormFile(file)
    setMasterFormUploadState('parsing')
    setSyncMapping({})
    setSyncFields([])
    try {
      const buf = await file.arrayBuffer()
      const u8 = new Uint8Array(buf)
      const wb = XLSX.read(u8, { type: 'array' })
      const firstSheetName = wb.SheetNames[0]
      const headerWs = wb.Sheets[firstSheetName]
      const headerRawRows = XLSX.utils.sheet_to_json(headerWs, {
        blankrows: false,
        header: 1,
      }) as unknown[][]
      const headerRow = headerRawRows?.[0] ?? []
      const headers = headerRow
        .map((h) =>
          String(h ?? '')
            .trim()
            .replace(/\s+/g, ' '),
        )
        .filter(Boolean)
      const allHeaderRows = XLSX.utils.sheet_to_json(headerWs) as any[]

      // Auto-match fields via API
      const mappingPayload = {
        excelSheets: [
          {
            columns: headers,
            sheetName: firstSheetName,
          },
        ],
        headerFields: fields.map((f) => ({
          dataType: f.dataType || 'SHORT_TEXT',
          name: f.fieldName,
        })),
        lineItemFields: [],
      }

      const newSyncMapping = { ...syncMapping }

      try {
        const { data } = await axiosV6.post('/field-mapping', mappingPayload)
        if (data?.headerFields && Array.isArray(data.headerFields)) {
          data.headerFields.forEach((match: any) => {
            if (
              match.masterField &&
              match.excelField &&
              !newSyncMapping[match.masterField]
            ) {
              newSyncMapping[match.masterField] = match.excelField
            }
          })
        }
      } catch (apiError) {
        console.error(
          'API Field Mapping failed, falling back to basic matching',
          apiError,
        )
        fields.forEach((field) => {
          const fieldNameLower = field.fieldName.toLowerCase()
          const match = headers.find((h) => h.toLowerCase() === fieldNameLower)
          if (match && !newSyncMapping[field.fieldName]) {
            newSyncMapping[field.fieldName] = match
          }
        })
      }

      setSyncMapping(newSyncMapping)
      setMasterFormHeaders(headers)
      setMasterFormPreviewRows(allHeaderRows.slice(0, 15))
      setMasterFormAllRows(allHeaderRows)
      setMasterFormRowCount(allHeaderRows.length)
      setMasterFormUploadState('ready')

      // Use the uploaded file name for the form name
      const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
      setMasterFormTitle(fileNameWithoutExt)
    } catch (e) {
      setMasterFormUploadState('error')
      showToast({ message: 'Failed to parse Excel file', variant: 'error' })
    }
  }

  const [formsList, setFormsList] = useState<
    Array<{ id: string; name: string }>
  >([])

  const [selectedIntegration, setSelectedIntegration] = useState<string>(() => {
    if (storageDrive && storageDrive.includes('[')) return 'MasterForm'
    return 'None'
  })
  const [connectedIntegrationId, setConnectedIntegrationId] = useState<
    string | null
  >(() => {
    if (storageDrive && storageDrive.includes('[')) return 'MasterForm'
    return null
  })
  const [selectedFormIds, setSelectedFormIds] = useState<string[]>(() => {
    if (storageDrive && storageDrive.includes('[')) {
      const prefixStr = storageDrive
        .substring(0, storageDrive.indexOf('['))
        .trim()
      return prefixStr ? prefixStr.split(',').map((id) => id.trim()) : []
    }
    return []
  })
  const [syncMapping, setSyncMapping] = useState<Record<string, string>>(() => {
    if (storageDrive && storageDrive.includes('[')) {
      const prefixStr = storageDrive
        .substring(0, storageDrive.indexOf('['))
        .trim()
      const formIds = prefixStr
        ? prefixStr.split(',').map((id) => id.trim())
        : []
      const firstFormId = formIds[0] || ''
      const mappingStr = storageDrive.substring(
        storageDrive.indexOf('[') + 1,
        storageDrive.length - 1,
      )
      const pairs = mappingStr.split(',')
      const parsedMapping: Record<string, string> = {}
      pairs.forEach((pair) => {
        const parts = pair.split(':').map((p) => p.trim())
        if (parts.length === 0 || !parts[0]) return

        const repoField = parts[0]
        const isMultiFormFormat =
          parts.length === 4 || (parts.length === 3 && parts[2] !== 'sync')

        if (isMultiFormFormat) {
          const formIdOrIndex = parts[1]
          const formFieldId = parts[2]
          let formId = formIdOrIndex
          const idx = parseInt(formIdOrIndex, 10)
          if (!isNaN(idx) && idx >= 0 && idx < formIds.length) {
            formId = formIds[idx]
          }
          parsedMapping[`${formId}:${formFieldId}`] = repoField
        } else {
          const formFieldId = parts[1] || ''
          parsedMapping[`${firstFormId}:${formFieldId}`] = repoField
        }
      })
      return parsedMapping
    }
    return {}
  })
  const [syncFields, setSyncFields] = useState<string[]>(() => {
    if (storageDrive && storageDrive.includes('[')) {
      const prefixStr = storageDrive
        .substring(0, storageDrive.indexOf('['))
        .trim()
      const formIds = prefixStr
        ? prefixStr.split(',').map((id) => id.trim())
        : []
      const firstFormId = formIds[0] || ''
      const mappingStr = storageDrive.substring(
        storageDrive.indexOf('[') + 1,
        storageDrive.length - 1,
      )
      const pairs = mappingStr.split(',')
      const parsedSyncFields: string[] = []
      pairs.forEach((pair) => {
        const parts = pair.split(':').map((p) => p.trim())
        if (parts.length === 0 || !parts[0]) return

        const isMultiFormFormat =
          parts.length === 4 || (parts.length === 3 && parts[2] !== 'sync')

        if (isMultiFormFormat) {
          if (parts.length === 4 && parts[3] === 'sync') {
            const formIdOrIndex = parts[1]
            const formFieldId = parts[2]
            let formId = formIdOrIndex
            const idx = parseInt(formIdOrIndex, 10)
            if (!isNaN(idx) && idx >= 0 && idx < formIds.length) {
              formId = formIds[idx]
            }
            parsedSyncFields.push(`${formId}:${formFieldId}`)
          }
        } else {
          if (parts.length === 3 && parts[2] === 'sync') {
            const formFieldId = parts[1] || ''
            parsedSyncFields.push(`${firstFormId}:${formFieldId}`)
          }
        }
      })
      return parsedSyncFields
    }
    return []
  })

  const [syncDataTypes, setSyncDataTypes] = useState<Record<string, string>>({})

  const [masterFormTitle, setMasterFormTitle] = useState(
    `${folderName} - Master Form`,
  )
  const [masterFormDescription, setMasterFormDescription] = useState('')

  useImperativeHandle(
    wizardRef,
    () => ({
      getMasterFormState: () => ({
        masterFormAllRows,
        masterFormDescription,
        masterFormFile,
        masterFormSetupMode,
        masterFormTitle,
        selectedExistingFormIds: selectedFormIds,
        selectedIntegration,
        syncDataTypes,
        syncFields,
        syncMapping,
      }),
    }),
    [
      masterFormSetupMode,
      selectedIntegration,
      syncMapping,
      syncDataTypes,
      syncFields,
      masterFormTitle,
      masterFormDescription,
      masterFormAllRows,
      masterFormFile,
      selectedFormIds,
    ],
  )

  const [formFields, setFormFields] = useState<
    Array<{ id: string; label: string }>
  >([])
  const fieldTypesLoadedRef = useRef(false)

  const loadFieldTypes = useCallback(async () => {
    const allowedTypes = new Set<string>(REPOSITORY_FIELD_DATA_TYPES)
    const types = new Set<string>(REPOSITORY_FIELD_DATA_TYPES)
    const response = await getRepositorys()

    if (!response.error && Array.isArray(response.data)) {
      response.data.forEach(
        (repository: { fields?: Array<{ dataType?: string }> }) => {
          ;(repository.fields || []).forEach((field) => {
            if (field.dataType && allowedTypes.has(field.dataType)) {
              types.add(field.dataType)
            }
          })
        },
      )
    }

    setFieldTypeOptions(toFieldTypeOptions(Array.from(types)))
  }, [])

  useEffect(() => {
    if (step !== 2 || fieldTypesLoadedRef.current) return
    fieldTypesLoadedRef.current = true
    void loadFieldTypes()
  }, [loadFieldTypes, step])

  useEffect(() => {
    if (step === 5 && selectedIntegration === 'MasterForm') {
      if ((formsList ?? []).length > 0) return
      void formApi.listAllForms().then((res) => {
        if (!res.data) {
          setFormsList([])
          return
        }

        let forms: any[] = []
        if (Array.isArray(res.data)) {
          if (
            res.data.length > 0 &&
            res.data[0]?.value &&
            Array.isArray(res.data[0].value)
          ) {
            forms = res.data.flatMap((group: any) => group.value || [])
          } else {
            forms = res.data
          }
        } else if (Array.isArray(res.data?.data)) {
          forms = res.data.data
        } else if (Array.isArray(res.data?.content)) {
          forms = res.data.content
        } else if (Array.isArray(res.data?.value)) {
          forms = res.data.value
        }

        setFormsList(
          forms
            .map((form: any) => ({
              id: String(form?.id || form?.formId || ''),
              name: String(form?.name || form?.title || form?.id || ''),
            }))
            .filter((form) => form.id),
        )
      })
    }
  }, [step, selectedIntegration, formsList])

  useEffect(() => {
    let isMounted = true
    if (selectedFormIds.length > 0) {
      const allFieldsArray: any[] = []

      Promise.all(
        selectedFormIds.map((id) =>
          formApi
            .getFormDataById(id)
            .then((res) => ({ data: res.data, id }))
            .catch(() => ({ data: null, id })),
        ),
      ).then((results) => {
        if (!isMounted) return

        results.forEach((res) => {
          let formJson = res.data?.formJson
          if (!formJson) return
          if (typeof formJson === 'string') {
            try {
              formJson = JSON.parse(formJson)
            } catch {
              // ignore
            }
          }
          const formName = res.data.name || res.data.title || res.id
          const fieldsArray = Array.isArray(formJson?.panels)
            ? formJson.panels.flatMap((panel: any) =>
                Array.isArray(panel?.fields) ? panel.fields : [],
              )
            : Array.isArray(formJson?.fields)
              ? formJson.fields
              : Array.isArray(formJson?.components)
                ? formJson.components
                : []

          const ignoredTypes = [
            'divider',
            'paragraph',
            'label',
            'heading',
            'button',
            'static',
            'static_text',
            'html',
            'image',
            'content',
            'panel',
            'layout',
            'title',
            'subtitle',
            'header',
            'description',
            'spacer',
            'alert',
            'horizontal_rule',
          ]
          fieldsArray.forEach((f: any) => {
            const fieldType = String(
              f.type || f.control || f.controlType || f.dataType || '',
            )
              .trim()
              .toLowerCase()
            if (ignoredTypes.includes(fieldType)) {
              return // skip decorative/layout fields
            }
            allFieldsArray.push({
              formId: res.id,
              formName: formName,
              id: String(f.id || f.key || f.name || ''),
              label: String(
                f.displayLabel ||
                  f.label ||
                  f.name ||
                  f.title ||
                  f.id ||
                  f.key ||
                  '',
              ),
            })
          })
        })

        // @ts-ignore
        setFormFields(allFieldsArray)
      })

      Promise.all(
        selectedFormIds.map((id) =>
          formApi
            .getFormEntries(id, 1, 1, false)
            .then((res) => {
              let entries: any[] = []
              if (res.data?.entries && Array.isArray(res.data.entries)) {
                entries = res.data.entries
              } else if (res.data?.data && Array.isArray(res.data.data)) {
                entries = res.data.data
              } else if (res.data && Array.isArray(res.data)) {
                entries = res.data
              } else if (res.data?.items && Array.isArray(res.data.items)) {
                entries = res.data.items
              }
              return { entry: entries[0] || null, formId: id }
            })
            .catch(() => ({ entry: null, formId: id })),
        ),
      ).then((results) => {
        if (!isMounted) return
        const entryMap: Record<string, any> = {}
        results.forEach((res) => {
          if (res.entry) {
            entryMap[res.formId] = res.entry
          }
        })
        setExistingFormPreviewRows([entryMap])
      })

      return () => {
        isMounted = false
      }
    } else {
      setFormFields([])
      setExistingFormPreviewRows([])
    }
  }, [selectedFormIds])

  useEffect(() => {
    if (
      connectedIntegrationId === 'MasterForm' &&
      Object.keys(syncMapping).length > 0 &&
      selectedFormIds.length > 0
    ) {
      const formatted = `${selectedFormIds.join(',')}[${Object.entries(
        syncMapping,
      )
        .map(([formIdAndFieldId, repoName]) => {
          const [fId, formFieldId] = formIdAndFieldId.split(':')
          const formIndex = selectedFormIds.indexOf(fId)
          const formRef = formIndex !== -1 ? String(formIndex) : fId
          return `${repoName}:${formRef}:${formFieldId}${syncFields.includes(formIdAndFieldId) ? ':sync' : ''}`
        })
        .join(',')}]`
      setStorageDrive(formatted)
      console.log('Sync mapping string to save:', formatted)
    } else {
      setStorageDrive(null)
    }
  }, [
    connectedIntegrationId,
    syncMapping,
    syncFields,
    selectedFormIds,
    setStorageDrive,
  ])

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
          optionsJson:
            newFieldOptions.length > 0 ? JSON.stringify(newFieldOptions) : null,
          orderId: prev.length + 1,
        },
      ]),
    )
    setNewFieldName('')
    setNewFieldOptions([])
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
        <AnimateFadeIn delay={0.1}>
          <InputText
            label={t`Folder Name *`}
            placeholder={t`e.g. AP Invoices 2026`}
            value={folderName}
            onChange={(value: string) => {
              setFolderName(value)
              if (
                masterFormTitle === `${folderName} - Master Form` ||
                !masterFormTitle
              ) {
                setMasterFormTitle(`${value} - Master Form`)
              }
            }}
          />
        </AnimateFadeIn>

        <AnimateFadeIn delay={0.15}>
          <InputTextarea
            label={t`Description`}
            minRows={3}
            placeholder={t`Describe the purpose of this folder...`}
            value={description}
            onChange={setDescription}
          />
        </AnimateFadeIn>
      </SettingsFormSection>
    )
  }

  if (step === 2) {
    return (
      <SettingsFormSection>
        <div className='flex flex-col gap-3'>
          <div>
            <AnimateFadeIn delay={0.1}>
              <h3 className='mb-3 text-14/5 font-semibold text-gray-12'>
                Folder Fields
              </h3>
            </AnimateFadeIn>

            <AnimateFadeIn delay={0.15}>
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
                      searchPlaceholder='Search type'
                      width='target'
                      searchable
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

                  {['SINGLE_SELECT', 'MULTI_SELECT', 'BOOLEAN'].includes(
                    newFieldType,
                  ) && (
                    <div className='flex flex-col gap-2'>
                      <label className='text-13 font-medium text-gray-11'>
                        Options
                      </label>
                      <TagsInput
                        data={[]}
                        placeholder='Type an option and press Enter'
                        value={newFieldOptions}
                        clearable
                        onChange={setNewFieldOptions}
                      />
                    </div>
                  )}

                  <div className='flex flex-wrap items-center justify-between gap-3'>
                    <div className='flex flex-wrap items-center gap-5'>
                      <label className='flex h-9 cursor-pointer items-center gap-2 text-13 font-medium text-gray-12'>
                        <InputCheckbox
                          checked={newIsFolder}
                          disabled={Boolean(editingRepositoryId)}
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
            </AnimateFadeIn>
          </div>

          <AnimateFadeIn delay={0.2}>
            <FieldsTable
              fields={fields}
              fieldTypeOptions={fieldTypeOptions}
              isEditing={Boolean(editingRepositoryId)}
              setFields={setFields}
            />
          </AnimateFadeIn>
        </div>
      </SettingsFormSection>
    )
  }

  if (step === 3) {
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
          <AnimateFadeIn delay={0.1}>
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
          </AnimateFadeIn>

          <OrDivider />

          <AnimateFadeIn delay={0.15}>
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
                        icon={item.icon}
                        logo={item.logo}
                        name={item.title}
                        value={item.id}
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
                        onClick={() => {
                          if (!isDisabled) setStorage(item.id)
                        }}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          </AnimateFadeIn>

          {isCloudSelected ? (
            <AnimateFadeIn delay={0.2}>
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
                onConnectorChange={onStorageConnectorChange}
              />
            </AnimateFadeIn>
          ) : null}
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
          <AnimateFadeIn delay={0.1}>
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
          </AnimateFadeIn>

          <AnimateFadeIn delay={0.15}>
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
          </AnimateFadeIn>
        </div>
      </SettingsFormSection>
    )
  }

  if (step === 5) {
    return (
      <SettingsFormSection>
        <div>
          <AnimateFadeIn delay={0.1}>
            <h3 className='text-14/5 font-semibold text-gray-12'>
              Integrations
            </h3>
            <p className='mt-1 text-13 text-gray-11'>
              Optionally connect an ERP or business system to sync folder
              fields.
            </p>
          </AnimateFadeIn>

          <div className='mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2'>
            {integrations.map((item, idx) => {
              const isSelected = selectedIntegration === item.id
              const isConnected = connectedIntegrationId === item.id
              const canConnect = item.id !== 'None'

              return (
                <AnimateFadeIn delay={0.15 + idx * 0.05} key={item.id}>
                  <div
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
                          } else {
                            setConnectedIntegrationId(item.id)
                          }
                        }}
                      >
                        <Icon
                          name={item.icon}
                          className={cn(
                            'size-4',
                            isConnected
                              ? 'text-green-11'
                              : isSelected
                                ? 'text-primary-9'
                                : 'text-gray-11',
                          )}
                        />
                      </button>

                      <div className='min-w-0 flex-1'>
                        <div className='flex items-center justify-between gap-2'>
                          <button
                            className='min-w-0 truncate text-left text-13 font-medium text-gray-12'
                            type='button'
                            onClick={() => {
                              setSelectedIntegration(item.id)
                              if (item.id === 'None') {
                                setConnectedIntegrationId(null)
                              } else {
                                setConnectedIntegrationId(item.id)
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
                              className='inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-12 font-medium opacity-0'
                              aria-hidden
                            >
                              <Icon className='size-3.5' name='lucide:link-2' />
                              Connect
                            </span>
                          )}
                        </div>

                        <button
                          className='mt-0.5 w-full text-left text-12 text-gray-11'
                          type='button'
                          onClick={() => {
                            setSelectedIntegration(item.id)
                            if (item.id === 'None') {
                              setConnectedIntegrationId(null)
                            } else {
                              setConnectedIntegrationId(item.id)
                            }
                          }}
                        >
                          {item.description}
                        </button>
                      </div>
                    </div>
                  </div>
                </AnimateFadeIn>
              )
            })}
          </div>

          <AnimatePresence>
            {selectedIntegration === 'MasterForm' &&
              connectedIntegrationId === 'MasterForm' && (
                <AnimateFadeIn delay={0.2}>
                  <div className='mt-6 rounded-[12px] border border-gray-3 bg-surface p-4 shadow-sm'>
                    <div className='mb-4'>
                      <h4 className='text-14/5 font-semibold text-gray-12'>
                        Master Form Configuration
                      </h4>
                      <p className='mt-0.5 text-xs text-gray-10'>
                        Select an existing form or upload an Excel file to
                        create a new one.
                      </p>
                    </div>

                    {/* Setup Mode Toggle */}
                    <div className='mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2'>
                      <button
                        type='button'
                        className={cn(
                          'group relative flex min-h-[76px] w-full cursor-pointer flex-row items-center gap-3 rounded-lg border px-4 py-3.5 text-left transition-all duration-200',
                          masterFormSetupMode === 'existing'
                            ? 'border-primary-9 bg-primary-1 shadow-sm ring-2 ring-primary-9/20'
                            : 'border-gray-4 bg-surface hover:border-gray-5 hover:bg-gray-2',
                        )}
                        onClick={() => {
                          setMasterFormSetupMode('existing')
                          setSyncMapping({})
                          setSyncFields([])
                        }}
                      >
                        <div
                          className={cn(
                            'flex size-9 shrink-0 items-center justify-center rounded-md p-1.5',
                            masterFormSetupMode === 'existing'
                              ? 'bg-white shadow-sm'
                              : 'bg-gray-2 group-hover:bg-gray-3',
                          )}
                        >
                          <Icon
                            name='tabler:database-search'
                            className={cn(
                              'size-5',
                              masterFormSetupMode === 'existing'
                                ? 'text-primary-11'
                                : 'text-primary-9',
                            )}
                          />
                        </div>
                        <div className='min-w-0 flex-1'>
                          <div
                            className={cn(
                              'truncate text-14/5 font-medium',
                              masterFormSetupMode === 'existing'
                                ? 'text-primary-12'
                                : 'text-gray-13',
                            )}
                          >
                            Use existing form
                          </div>
                          <p className='mt-0.5 line-clamp-2 text-12/4.5 text-pretty text-gray-10'>
                            Select an existing form and map its fields.
                          </p>
                        </div>
                        {masterFormSetupMode === 'existing' && (
                          <div className='flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-9'>
                            <Icon
                              className='size-3 text-white'
                              name='tabler:check'
                            />
                          </div>
                        )}
                      </button>

                      <button
                        type='button'
                        className={cn(
                          'group relative flex min-h-[76px] w-full cursor-pointer flex-row items-center gap-3 rounded-lg border px-4 py-3.5 text-left transition-all duration-200',
                          masterFormSetupMode === 'create'
                            ? 'border-primary-9 bg-primary-1 shadow-sm ring-2 ring-primary-9/20'
                            : 'border-gray-4 bg-surface hover:border-gray-5 hover:bg-gray-2',
                        )}
                        onClick={() => {
                          setMasterFormSetupMode('create')
                          setSyncMapping({})
                          setSyncFields([])
                        }}
                      >
                        <div
                          className={cn(
                            'flex size-9 shrink-0 items-center justify-center rounded-md p-1.5',
                            masterFormSetupMode === 'create'
                              ? 'bg-white shadow-sm'
                              : 'bg-gray-2 group-hover:bg-gray-3',
                          )}
                        >
                          <Icon
                            name='tabler:table-import'
                            className={cn(
                              'size-5',
                              masterFormSetupMode === 'create'
                                ? 'text-primary-11'
                                : 'text-primary-9',
                            )}
                          />
                        </div>
                        <div className='min-w-0 flex-1'>
                          <div
                            className={cn(
                              'truncate text-14/5 font-medium',
                              masterFormSetupMode === 'create'
                                ? 'text-primary-12'
                                : 'text-gray-13',
                            )}
                          >
                            Create master form
                          </div>
                          <p className='mt-0.5 line-clamp-2 text-12/4.5 text-pretty text-gray-10'>
                            Upload your records via CSV or Excel.
                          </p>
                        </div>
                        {masterFormSetupMode === 'create' && (
                          <div className='flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-9'>
                            <Icon
                              className='size-3 text-white'
                              name='tabler:check'
                            />
                          </div>
                        )}
                      </button>
                    </div>

                    {masterFormSetupMode === 'existing' && (
                      <AnimateFadeIn delay={0.1}>
                        <div className='mb-6 max-w-md'>
                          <InputSelectMultiple
                            label='Select Forms'
                            placeholder='Select forms...'
                            searchable
                            options={(formsList ?? []).map((f) => ({
                              id: f.id,
                              name: f.name,
                              value: f.id,
                            }))}
                            value={selectedFormIds.map((id) => {
                              const found = (formsList ?? []).find(
                                (f) => f.id === id,
                              )
                              return {
                                id,
                                name: found?.name || id,
                                value: id,
                              }
                            })}
                            onChange={(selectedList) => {
                              const ids = (selectedList || []).map((item) =>
                                String(item.value),
                              )
                              setSelectedFormIds(ids)
                              setSyncMapping((prev) => {
                                const newMap: Record<string, string> = {}
                                Object.entries(prev).forEach(([key, val]) => {
                                  const formId = key.split(':')[0]
                                  if (ids.includes(formId)) {
                                    newMap[key] = val
                                  }
                                })
                                return newMap
                              })
                              setSyncFields((prev) =>
                                prev.filter((key) => {
                                  const formId = key.split(':')[0]
                                  return ids.includes(formId)
                                }),
                              )
                            }}
                          />
                        </div>

                        {selectedFormIds.length > 0 && (
                          <div>
                            <h5 className='mb-3 text-13 font-medium text-gray-12'>
                              Field Mapping
                            </h5>
                            <div className='overflow-visible rounded-lg border border-gray-3 shadow-inner'>
                              <table className='w-full text-left text-13'>
                                <thead className='sticky top-0 z-10 border-b border-gray-3 bg-gray-2/50 backdrop-blur-sm'>
                                  <tr>
                                    <th className='w-[30%] px-4 py-3 font-semibold text-gray-11'>
                                      Form Fields
                                    </th>
                                    <th className='w-[20%] px-4 py-3 font-semibold text-gray-11'>
                                      Example Value
                                    </th>
                                    <th className='w-[30%] px-4 py-3 font-semibold text-gray-11'>
                                      Folder Fields
                                    </th>
                                    <th className='w-[20%] px-4 py-3 text-center font-semibold text-gray-11'>
                                      Sync
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className='divide-y divide-gray-3 bg-surface'>
                                  {(() => {
                                    let lastFormId = ''
                                    return (formFields as any[]).map(
                                      (formField) => {
                                        const showFormHeader =
                                          formField.formId !== lastFormId
                                        lastFormId = formField.formId

                                        const targetMapValue = `${formField.formId}:${formField.id}`
                                        const mappedRepoFieldName =
                                          syncMapping[targetMapValue] || ''
                                        const entryMap =
                                          existingFormPreviewRows[0] || {}
                                        const firstEntry =
                                          entryMap[formField.formId]

                                        let exampleValue = ''
                                        if (firstEntry) {
                                          let parsedValues: any = {}
                                          if (firstEntry.values) {
                                            if (
                                              typeof firstEntry.values ===
                                              'string'
                                            ) {
                                              try {
                                                parsedValues = JSON.parse(
                                                  firstEntry.values,
                                                )
                                              } catch {}
                                            } else {
                                              parsedValues = firstEntry.values
                                            }
                                          } else {
                                            parsedValues = firstEntry
                                          }

                                          const rawVal =
                                            parsedValues?.[formField.id] ??
                                            firstEntry?.[formField.id]
                                          exampleValue =
                                            rawVal !== undefined &&
                                            rawVal !== null
                                              ? typeof rawVal === 'object'
                                                ? String(
                                                    rawVal.value ??
                                                      JSON.stringify(rawVal),
                                                  )
                                                : String(rawVal)
                                              : ''
                                        }

                                        const fieldRow = (
                                          <tr
                                            className='transition-colors hover:bg-gray-1/30'
                                            key={targetMapValue}
                                          >
                                            <td className='px-4 py-3 font-medium text-gray-12'>
                                              {formField.label}
                                            </td>
                                            <td className='px-4 py-3'>
                                              {exampleValue ? (
                                                <div
                                                  className='max-w-[150px] cursor-pointer truncate text-[13px] text-gray-10 transition-all hover:break-words hover:whitespace-normal'
                                                  title={exampleValue}
                                                >
                                                  {exampleValue}
                                                </div>
                                              ) : (
                                                <div className='text-[13px] text-gray-8'>
                                                  -
                                                </div>
                                              )}
                                            </td>
                                            <td className='px-4 py-3'>
                                              <MasterFieldSelectDropdown
                                                options={fields.map((f) => ({
                                                  id: f.fieldName,
                                                  label: f.fieldName,
                                                }))}
                                                value={
                                                  mappedRepoFieldName || null
                                                }
                                                onChange={(
                                                  selectedRepoFieldName,
                                                ) => {
                                                  setSyncMapping((prev) => {
                                                    const newMap = { ...prev }
                                                    if (selectedRepoFieldName) {
                                                      newMap[targetMapValue] =
                                                        selectedRepoFieldName
                                                    } else {
                                                      delete newMap[
                                                        targetMapValue
                                                      ]
                                                    }
                                                    return newMap
                                                  })
                                                  if (!selectedRepoFieldName) {
                                                    setSyncFields((prev) =>
                                                      prev.filter(
                                                        (f) =>
                                                          f !== targetMapValue,
                                                      ),
                                                    )
                                                  }
                                                }}
                                              />
                                            </td>
                                            <td className='px-4 py-3'>
                                              <div className='flex justify-center'>
                                                <input
                                                  className='h-4 w-4 cursor-pointer rounded border-gray-3 text-primary-9 accent-primary-9 focus:ring-primary-5'
                                                  name='sync_field'
                                                  type='checkbox'
                                                  checked={syncFields.includes(
                                                    targetMapValue,
                                                  )}
                                                  disabled={
                                                    !mappedRepoFieldName
                                                  }
                                                  title={
                                                    !mappedRepoFieldName
                                                      ? 'Please map a folder field first'
                                                      : 'Select for sync'
                                                  }
                                                  onChange={(e) => {
                                                    if (e.target.checked) {
                                                      setSyncFields((prev) => [
                                                        ...prev,
                                                        targetMapValue,
                                                      ])
                                                    } else {
                                                      setSyncFields((prev) =>
                                                        prev.filter(
                                                          (f) =>
                                                            f !==
                                                            targetMapValue,
                                                        ),
                                                      )
                                                    }
                                                  }}
                                                />
                                              </div>
                                            </td>
                                          </tr>
                                        )

                                        if (showFormHeader) {
                                          return (
                                            <Fragment
                                              key={`header-${formField.formId}`}
                                            >
                                              <tr className='bg-gray-2/20 font-semibold text-gray-12'>
                                                <td
                                                  className='border-y border-gray-3 bg-gray-2/30 px-4 py-2 text-xs font-semibold tracking-wider text-gray-10 uppercase'
                                                  colSpan={4}
                                                >
                                                  {formField.formName}
                                                </td>
                                              </tr>
                                              {fieldRow}
                                            </Fragment>
                                          )
                                        }

                                        return fieldRow
                                      },
                                    )
                                  })()}
                                  {formFields.length === 0 && (
                                    <tr>
                                      <td
                                        className='px-4 py-8 text-center text-[13px] text-gray-10'
                                        colSpan={4}
                                      >
                                        No form fields found.
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </AnimateFadeIn>
                    )}

                    {masterFormSetupMode === 'create' && (
                      <AnimateFadeIn delay={0.1}>
                        {masterFormUploadState === 'idle' ? (
                          <div className='group relative mb-6 w-full overflow-hidden rounded-xl border border-border-default bg-surface p-2 shadow-2xs transition-all duration-500 hover:shadow-xs'>
                            <div
                              className={cn(
                                'relative z-10 flex min-h-[150px] cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-[1.5px] border-dashed border-border-default px-6 py-6 text-center transition-all duration-500 ease-out',
                                isDragOver
                                  ? 'scale-[0.99] border-primary-9 bg-accent-soft/10 shadow-inner'
                                  : 'bg-surface hover:border-primary-9 hover:bg-accent-soft/5',
                              )}
                              onClick={() => fileInputRef.current?.click()}
                              onDragLeave={() => setIsDragOver(false)}
                              onDragOver={(e) => {
                                e.preventDefault()
                                setIsDragOver(true)
                              }}
                              onDrop={(e) => {
                                e.preventDefault()
                                setIsDragOver(false)
                                handleMasterFileChange(
                                  e.dataTransfer.files?.[0],
                                )
                              }}
                            >
                              <div className='flex size-14 items-center justify-center rounded-full bg-accent-soft transition-all duration-300 group-hover:scale-105'>
                                <Icon
                                  className='size-6 text-primary-9'
                                  name='tabler:cloud-upload'
                                />
                              </div>
                              <div className='text-center'>
                                <h3 className='text-[14px] font-medium tracking-tight text-gray-12'>
                                  Drop your PO master file here, or{' '}
                                  <span className='font-medium text-primary-9 group-hover:underline'>
                                    browse
                                  </span>
                                </h3>
                                <p className='mt-1.5 text-[12px] text-gray-8'>
                                  Supports Excel (.xlsx, .xls) and CSV formats
                                </p>
                              </div>
                            </div>

                            <input
                              accept='.csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel'
                              className='hidden'
                              ref={fileInputRef}
                              type='file'
                              onChange={(e) =>
                                handleMasterFileChange(e.target.files?.[0])
                              }
                            />
                          </div>
                        ) : (
                          <div className='mb-6 flex flex-col gap-4'>
                            <div className='flex items-center justify-between rounded-xl border border-border-default bg-surface p-4 shadow-sm'>
                              <div className='flex items-center gap-3'>
                                <div className='flex size-10 items-center justify-center rounded-lg bg-green-2 text-green-11'>
                                  {masterFormUploadState === 'parsing' ? (
                                    <Icon
                                      className='size-5 animate-spin text-green-11'
                                      name='tabler:loader-2'
                                    />
                                  ) : (
                                    <Icon
                                      className='size-5 text-green-11'
                                      name='tabler:file-spreadsheet'
                                    />
                                  )}
                                </div>
                                <div className='min-w-0 flex-1'>
                                  <h4 className='truncate text-[14px] font-medium text-gray-12'>
                                    {masterFormFile?.name}
                                  </h4>
                                  <p className='text-[12px] text-gray-9'>
                                    {masterFormUploadState === 'parsing'
                                      ? 'Uploading and processing file...'
                                      : masterFormFile
                                        ? `Excel Spreadsheet • ${masterFormRowCount} Records`
                                        : 'Processing...'}
                                  </p>
                                </div>
                              </div>
                              <Button
                                icon='tabler:refresh'
                                label='Replace File'
                                size='sm'
                                variant='outline'
                                onClick={() => {
                                  setMasterFormUploadState('idle')
                                  setMasterFormFile(null)
                                  setSyncMapping({})
                                }}
                              />
                            </div>

                            {masterFormUploadState === 'ready' && (
                              <div className='flex flex-col gap-6'>
                                <DmsColumnMapping
                                  dataTypes={syncDataTypes}
                                  fields={fields}
                                  mapping={syncMapping}
                                  previewRows={masterFormPreviewRows}
                                  syncFields={syncFields}
                                  uploadedColumns={masterFormHeaders}
                                  onUpdateDataTypes={(newDataTypes) =>
                                    setSyncDataTypes(newDataTypes)
                                  }
                                  onUpdateMapping={(newMapping) =>
                                    setSyncMapping(newMapping)
                                  }
                                  onUpdateSyncFields={(newSyncFields) =>
                                    setSyncFields(newSyncFields)
                                  }
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </AnimateFadeIn>
                    )}
                  </div>
                </AnimateFadeIn>
              )}
          </AnimatePresence>
        </div>
      </SettingsFormSection>
    )
  }

  return null
}
