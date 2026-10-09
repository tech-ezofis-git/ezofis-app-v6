import type { CloudStorageOption } from '@/pages/settings/components/Folders/FolderStorageConnectorPanel'
import GoogleDriveLogo from '@/assets/brands/googledrive.svg'
import OneDriveLogo from '@/assets/brands/onedrive.svg'
import StorageLogo from '@/assets/brands/storage.svg'

export type DmsStorageOption = {
  comingSoon: boolean
  connectorType?: string
  description: string
  icon?: string
  id: string
  logo?: string
  oauthProvider?: string
  storageProviderCode: string
  subtitle: string
  title: string
}

export const dmsStorageOptions: DmsStorageOption[] = [
  {
    comingSoon: false,
    description:
      'Default storage option provided with your account for immediate access.',
    id: 'EZOFIS Drive',
    logo: StorageLogo,
    storageProviderCode: 'EZOFIS',
    subtitle: 'Built-in secure storage',
    title: 'Use secure cloud storage',
  },
  {
    comingSoon: false,
    connectorType: 'ONE_DRIVE',
    description: 'Store folder documents in Microsoft OneDrive.',
    id: 'One Drive',
    logo: OneDriveLogo,
    oauthProvider: 'onedrive',
    storageProviderCode: 'ONE_DRIVE',
    subtitle: 'Microsoft OneDrive',
    title: 'OneDrive',
  },
  {
    comingSoon: false,
    connectorType: 'GOOGLE_DRIVE',
    description: 'Store folder documents in Google Drive.',
    id: 'Google Drive',
    logo: GoogleDriveLogo,
    oauthProvider: 'google',
    storageProviderCode: 'GOOGLE_DRIVE',
    subtitle: 'Google Workspace',
    title: 'Google Drive',
  },
  {
    comingSoon: false,
    connectorType: 'GCP',
    description: 'Store folder documents in Google Cloud Storage.',
    icon: 'logos:google-cloud',
    id: 'GCP',
    oauthProvider: 'gcp',
    storageProviderCode: 'GCP',
    subtitle: 'Google Cloud',
    title: 'GCP Storage',
  },
]

export const isCloudStorageOption = (
  option: DmsStorageOption,
): option is DmsStorageOption & CloudStorageOption =>
  Boolean(option.connectorType && option.oauthProvider)

/** Canonical repository field data types (MULTI_SELECT excluded). */
export const DataType = {
  AUTO_GENERATED: 'AUTO_GENERATED',
  BARCODE: 'BARCODE',
  BOOLEAN: 'BOOLEAN',
  CALCULATED: 'CALCULATED',
  CURRENCY_AMOUNT: 'CURRENCY_AMOUNT',
  DATE: 'DATE',
  DATE_TIME: 'DATE_TIME',
  DYNAMIC_TABLE: 'DYNAMIC_TABLE',
  LINK: 'LINK',
  LONG_TEXT: 'LONG_TEXT',
  NUMBER: 'NUMBER',
  OMR: 'OMR',
  SHORT_TEXT: 'SHORT_TEXT',
  SINGLE_SELECT: 'SINGLE_SELECT',
  TABLE: 'TABLE',
  TIME: 'TIME',
  // MULTI_SELECT: 'MULTI_SELECT',
} as const

export type RepositoryFieldDataType = (typeof DataType)[keyof typeof DataType]

export const REPOSITORY_FIELD_DATA_TYPES = [
  DataType.SHORT_TEXT,
  DataType.LONG_TEXT,
  DataType.NUMBER,
  DataType.BOOLEAN,
  DataType.DATE,
  DataType.TIME,
  DataType.DATE_TIME,
  DataType.SINGLE_SELECT,
  DataType.TABLE,
  DataType.BARCODE,
  DataType.OMR,
  DataType.CALCULATED,
  DataType.AUTO_GENERATED,
  DataType.LINK,
  DataType.CURRENCY_AMOUNT,
  DataType.DYNAMIC_TABLE,
] as const

export const DATA_TYPE_LABELS: Record<string, string> = {
  AUTO_GENERATED: 'Auto generated',
  BARCODE: 'Barcode',
  BOOLEAN: 'Boolean',
  CALCULATED: 'Calculated',
  CURRENCY_AMOUNT: 'Currency amount',
  DATE: 'Date',
  DATE_TIME: 'Date & time',
  DYNAMIC_TABLE: 'Dynamic table',
  LINK: 'Link',
  LONG_TEXT: 'Long text',
  NUMBER: 'Number',
  OMR: 'OMR',
  SHORT_TEXT: 'Short text',
  SINGLE_SELECT: 'Single select',
  TABLE: 'Table',
  TIME: 'Time',
}

export const FOLDER_FIELD_ICON_KEYS = [
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

export const FOLDER_FIELD_ICON_LABELS: Record<
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

export const formatDataTypeLabel = (value: string) =>
  DATA_TYPE_LABELS[value] ||
  value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())

export const toFieldTypeOptions = (types: string[]) =>
  types.map((type) => ({
    id: type,
    name: formatDataTypeLabel(type),
    value: type,
  }))
