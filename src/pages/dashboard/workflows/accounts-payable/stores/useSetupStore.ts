import { create } from 'zustand'

type EmailSettings = {
  email: string
  isConnected: boolean
  isConnecting: boolean
  password: string
  port: number | string
  provider: string
  server: string
}

type ErpSettings = {
  apiKey: string
  apiUrl: string
  importMethod?: 'upload' | 'import'
  isConnected: boolean
  isConnecting: boolean
  selectedFormName?: string | null
  system: string
  templateUploaded?: boolean
  uploadedTemplate?: File | null
  wantsFileBasedImport?: boolean
  mapping?: Record<string, string>
  uploadedColumns?: string[]
  previewRows?: any[]
}

type StorageSettings = {
  apiKey: string
  apiUrl: string
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
  email: '',
  isConnected: true,
  isConnecting: false,
  password: '',
  port: '',
  provider: 'DIRECT_UPLOAD',
  server: '',
}

const initialErpSettings: ErpSettings = {
  apiKey: '',
  apiUrl: '',
  importMethod: 'upload',
  isConnected: true,
  isConnecting: false,
  selectedFormName: null,
  system: 'PREDEFINED',
  templateUploaded: false,
  uploadedTemplate: null,
  wantsFileBasedImport: false,
  mapping: {},
  uploadedColumns: [],
  previewRows: [],
}

const initialStorageSettings: StorageSettings = {
  apiKey: '',
  apiUrl: '',
  isConnected: false,
  isConnecting: false,
  system: 'Included storage',
}

const useSetupStore = create<Store>()((set, get) => ({
  emailSettings: initialEmailSettings,
  erpSettings: initialErpSettings,
  isActivatingAutomation: false,
  isApSetUpCompleted:
    typeof window !== 'undefined'
      ? localStorage.getItem('isApSetUpCompleted') === 'true'
      : false,
  isSetupCalloutDismissed: false,
  isSetupOpen: false,
  isSetupStarted: true,
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
