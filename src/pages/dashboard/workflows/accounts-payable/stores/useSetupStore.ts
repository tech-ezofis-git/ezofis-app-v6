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
  step: number
  storageSettings: StorageSettings
  closeSetup: () => void
  openSetup: () => void
  setEmailSettings: (emailSettings: EmailSettings) => void
  setErpSettings: (erpSettings: ErpSettings) => void
  setIsSetupStarted: (value: boolean) => void
  setStep: (value: number) => void
  setStorageSettings: (storageSettings: StorageSettings) => void
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
}

const initialStorageSettings: StorageSettings = {
  apiKey: '',
  apiUrl: '',
  isConnected: false,
  isConnecting: false,
  system: '',
}

const setupStore = create<Store>()((set) => ({
  emailSettings: initialEmailSettings,
  erpSettings: initialErpSettings,
  isSetupOpen: false,
  isSetupStarted: false,
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

  setIsSetupStarted: (value: boolean) => set({ isSetupStarted: value }),

  setStep: (value: number) => set({ step: value }),

  setStorageSettings: (storageSettings: StorageSettings) =>
    set({
      storageSettings: {
        ...storageSettings,
      },
    }),
}))

export default setupStore
