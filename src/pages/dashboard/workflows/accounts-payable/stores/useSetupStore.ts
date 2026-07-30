import { create } from 'zustand'

type EmailSettings = {
  /** Connected mailbox / connector display name */
  account?: string
  connectorId?: string
  email: string
  isConnected: boolean
  isConnecting: boolean
  password: string
  port: number | string
  provider: string
  server: string
}

type ErpSettings = {
  /** Connected ERP account / connector display name */
  account?: string
  apiKey: string
  apiUrl: string
  connectorId?: string
  fieldDataTypes?: Record<string, string>
  groupingColumn?: string | null
  importMethod?: 'upload' | 'import'
  isConnected: boolean
  isConnecting: boolean
  isParsingTemplate?: boolean
  lineItemFieldDataTypes?: Record<string, string>
  lineItemHeaders?: string[]
  lineItemMapping?: Record<string, string>
  lineItemRows?: any[]
  mapping?: Record<string, string>
  previewRows?: any[]
  selectedFormName?: string | null
  system: string
  templateUploaded?: boolean
  uploadedColumns?: string[]
  uploadedLineItemTemplate?: File | null
  uploadedTemplate?: File | null
  wantsFileBasedImport?: boolean
}

type StorageSettings = {
  /** Connected storage account / connector display name */
  account?: string
  apiKey: string
  apiUrl: string
  connectorId?: string
  isConnected: boolean
  isConnecting: boolean
  system: string
}

type Store = {
  emailSettings: EmailSettings
  erpSettings: ErpSettings
  isActivatingAutomation: boolean
  isApSetUpCompleted: boolean
  isSetupCalloutDismissed: boolean
  isSetupOpen: boolean
  isSetupStarted: boolean
  /** When true, sidebar and routes stay locked until AP setup finishes (signup redirect only). */
  restrictNavigationUntilApSetup: boolean
  step: number
  storageSettings: StorageSettings
  closeSetup: () => void
  openSetup: () => void
  setEmailSettings: (emailSettings: EmailSettings) => void
  setErpSettings: (erpSettings: ErpSettings) => void
  setIsActivatingAutomation: (value: boolean) => void
  setisApSetUpCompleted: (value: boolean) => void
  setIsSetupCalloutDismissed: (value: boolean) => void
  setIsSetupStarted: (value: boolean) => void
  setRestrictNavigationUntilApSetup: (value: boolean) => void
  setStep: (value: number) => void
  setStorageSettings: (storageSettings: StorageSettings) => void
}

const initialEmailSettings: EmailSettings = {
  account: '',
  connectorId: '',
  email: '',
  isConnected: true,
  isConnecting: false,
  password: '',
  port: '',
  provider: 'DIRECT_UPLOAD',
  server: '',
}

const initialErpSettings: ErpSettings = {
  account: '',
  apiKey: '',
  apiUrl: '',
  connectorId: '',
  fieldDataTypes: {},
  groupingColumn: null,
  importMethod: 'upload',
  isConnected: true,
  isConnecting: false,
  isParsingTemplate: false,
  lineItemFieldDataTypes: {},
  lineItemHeaders: [],
  lineItemMapping: {},
  lineItemRows: [],
  mapping: {},
  previewRows: [],
  selectedFormName: null,
  system: 'PREDEFINED',
  templateUploaded: false,
  uploadedColumns: [],
  uploadedLineItemTemplate: null,
  uploadedTemplate: null,
  wantsFileBasedImport: false,
}

const initialStorageSettings: StorageSettings = {
  account: '',
  apiKey: '',
  apiUrl: '',
  connectorId: '',
  isConnected: false,
  isConnecting: false,
  system: 'Included storage',
}

const useSetupStore = create<Store>()((set, get) => ({
  emailSettings: initialEmailSettings,
  erpSettings: initialErpSettings,
  isActivatingAutomation: false,
  isApSetUpCompleted: false,
  isSetupCalloutDismissed: false,
  isSetupOpen: false,
  isSetupStarted: false,
  restrictNavigationUntilApSetup:
    typeof window !== 'undefined'
      ? localStorage.getItem('restrictNavigationUntilApSetup') === 'true'
      : false,
  step: 0,
  storageSettings: initialStorageSettings,
  closeSetup: () =>
    set({
      emailSettings: initialEmailSettings,
      erpSettings: initialErpSettings,
      isSetupOpen: false,
      isSetupStarted: false,
      step: 0,
      storageSettings: initialStorageSettings,
    }),
  openSetup: () => set({ isSetupOpen: true }),

  setEmailSettings: (emailSettings: EmailSettings) =>
    set({
      emailSettings: {
        ...emailSettings,
      },
    }),

  setErpSettings: (erpSettings: ErpSettings) =>
    set({
      erpSettings: {
        ...erpSettings,
      },
    }),

  setIsActivatingAutomation: (value: boolean) =>
    set({ isActivatingAutomation: value }),

  setisApSetUpCompleted: (value: boolean) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('isApSetUpCompleted', String(value))
    }
    set({ isApSetUpCompleted: value })
  },

  setIsSetupCalloutDismissed: (value: boolean) =>
    set({ isSetupCalloutDismissed: value }),

  setIsSetupStarted: (value: boolean) => set({ isSetupStarted: value }),

  setRestrictNavigationUntilApSetup: (value: boolean) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('restrictNavigationUntilApSetup', String(value))
    }
    set({ restrictNavigationUntilApSetup: value })
  },
  setStep: (value: number) => {
    const { emailSettings } = get()
    // Block moving past Step 1 if not connected
    if (value > 0 && !emailSettings.isConnected) {
      return
    }
    set({ step: value })
  },
  setStorageSettings: (storageSettings: StorageSettings) =>
    set({
      storageSettings: {
        ...storageSettings,
      },
    }),
}))

export const shouldLockAppNavigation = () => {
  const { isApSetUpCompleted, restrictNavigationUntilApSetup } =
    useSetupStore.getState()
  return restrictNavigationUntilApSetup && !isApSetUpCompleted
}

export default useSetupStore
