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
  isApSetUpCompleted: boolean
  isSetupCalloutDismissed: boolean
  isSetupOpen: boolean
  isSetupStarted: boolean
  step: number
  storageSettings: StorageSettings
  closeSetup: () => void
  openSetup: () => void
  setEmailSettings: (emailSettings: EmailSettings) => void
  setErpSettings: (erpSettings: ErpSettings) => void
  setisApSetUpCompleted: (value: boolean) => void
  setIsSetupCalloutDismissed: (value: boolean) => void
  setIsSetupStarted: (value: boolean) => void
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
  system: '',
  templateUploaded: false,
  uploadedTemplate: null,
  wantsFileBasedImport: true,
}

const initialStorageSettings: StorageSettings = {
  apiKey: '',
  apiUrl: '',
  isConnected: false,
  isConnecting: false,
  system: 'Included storage',
}

const useSetupStore = create<Store>()((set) => ({
  emailSettings: initialEmailSettings,
  erpSettings: initialErpSettings,
  isApSetUpCompleted: false,
  isSetupCalloutDismissed: false,
  isSetupOpen: false,
  isSetupStarted: true,
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

  setisApSetUpCompleted: (value: boolean) => set({ isApSetUpCompleted: value }),

  setIsSetupCalloutDismissed: (value: boolean) =>
    set({ isSetupCalloutDismissed: value }),

  setIsSetupStarted: (value: boolean) => set({ isSetupStarted: value }),
  setStep: (value: number) => set({ step: value }),
  setStorageSettings: (storageSettings: StorageSettings) =>
    set({
      storageSettings: {
        ...storageSettings,
      },
    }),
}))

export default useSetupStore
