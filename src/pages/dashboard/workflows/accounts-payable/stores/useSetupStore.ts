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
  isConnected: boolean
  isConnecting: boolean
  system: string
  wantsFileBasedImport?: boolean
  uploadedTemplate?: File | null
  templateUploaded?: boolean
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
  isSetupOpen: boolean
  isSetupStarted: boolean
  isSetupCalloutDismissed: boolean
  step: number
  storageSettings: StorageSettings
  isApSetUpCompleted: boolean
  closeSetup: () => void
  openSetup: () => void
  setEmailSettings: (emailSettings: EmailSettings) => void
  setErpSettings: (erpSettings: ErpSettings) => void
  setIsSetupStarted: (value: boolean) => void
  setIsSetupCalloutDismissed: (value: boolean) => void
  setStep: (value: number) => void
  setStorageSettings: (storageSettings: StorageSettings) => void
  setisApSetUpCompleted: (value: boolean) => void
}

const initialEmailSettings: EmailSettings = {
  email: '',
  isConnected: false,
  isConnecting: false,
  password: '',
  port: '',
  provider: '',
  server: '',
}

const initialErpSettings: ErpSettings = {
  apiKey: '',
  apiUrl: '',
  isConnected: false,
  isConnecting: false,
  system: '',
  wantsFileBasedImport: false,
  uploadedTemplate: null,
  templateUploaded: false,
}

const initialStorageSettings: StorageSettings = {
  apiKey: '',
  apiUrl: '',
  isConnected: false,
  isConnecting: false,
  system: 'Included storage',
}

const setupStore = create<Store>()((set) => ({
  emailSettings: initialEmailSettings,
  erpSettings: initialErpSettings,
  isSetupOpen: false,
  isSetupStarted: true,
  isSetupCalloutDismissed: false,
  step: 0,
  storageSettings: initialStorageSettings,
  isApSetUpCompleted: false,
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

  setIsSetupStarted: (value: boolean) => set({ isSetupStarted: value }),

  setIsSetupCalloutDismissed: (value: boolean) =>
    set({ isSetupCalloutDismissed: value }),

  setStep: (value: number) => set({ step: value }),
  setisApSetUpCompleted: (value: boolean) => set({ isApSetUpCompleted: value }),
  setStorageSettings: (storageSettings: StorageSettings) =>
    set({
      storageSettings: {
        ...storageSettings,
      },
    }),
}))

export default setupStore