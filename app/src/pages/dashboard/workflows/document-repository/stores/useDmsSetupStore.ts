import { create } from 'zustand'
import type { FolderConfigField } from '@/services/ai/folderConfig'

export type DmsSetupField = FolderConfigField & {
  id: string
  level: number
  orderId: number
}

type Store = {
  description: string
  fields: DmsSetupField[]
  folderName: string
  isGenerating: boolean
  isSaving: boolean
  isSetupCompleted: boolean
  isSetupStarted: boolean
  prompt: string
  showConnectorError: boolean
  step: number
  storageConnectorId: string | null
  storageConnectorLabel: string | null
  storageId: string
  storageProviderCode: string
  resetSetup: () => void
  setDescription: (value: string) => void
  setFields: (fields: DmsSetupField[]) => void
  setFolderName: (value: string) => void
  setIsGenerating: (value: boolean) => void
  setIsSaving: (value: boolean) => void
  setIsSetupCompleted: (value: boolean) => void
  setIsSetupStarted: (value: boolean) => void
  setPrompt: (value: string) => void
  setShowConnectorError: (value: boolean) => void
  setStep: (value: number) => void
  setStorageConnector: (
    connectorId: string | null,
    connectorLabel: string | null,
  ) => void
  setStorageSelection: (storageId: string, storageProviderCode: string) => void
  startSetup: () => void
}

const initialState = {
  description: '',
  fields: [] as DmsSetupField[],
  folderName: '',
  isGenerating: false,
  isSaving: false,
  isSetupCompleted: false,
  isSetupStarted: false,
  prompt: '',
  showConnectorError: false,
  step: 0,
  storageConnectorId: null as string | null,
  storageConnectorLabel: null as string | null,
  storageId: 'EZOFIS Drive',
  storageProviderCode: 'EZOFIS',
}

const useDmsSetupStore = create<Store>()((set) => ({
  ...initialState,
  resetSetup: () => set({ ...initialState }),
  startSetup: () =>
    set({
      ...initialState,
      isSetupStarted: true,
      step: 0,
    }),
  setDescription: (description) => set({ description }),
  setFields: (fields) => set({ fields }),
  setFolderName: (folderName) => set({ folderName }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  setIsSaving: (isSaving) => set({ isSaving }),
  setIsSetupCompleted: (isSetupCompleted) => set({ isSetupCompleted }),
  setIsSetupStarted: (isSetupStarted) => set({ isSetupStarted }),
  setPrompt: (prompt) => set({ prompt }),
  setShowConnectorError: (showConnectorError) => set({ showConnectorError }),
  setStep: (step) => set({ step }),
  setStorageConnector: (storageConnectorId, storageConnectorLabel) =>
    set({
      showConnectorError: false,
      storageConnectorId,
      storageConnectorLabel,
    }),
  setStorageSelection: (storageId, storageProviderCode) =>
    set({
      showConnectorError: false,
      storageConnectorId: null,
      storageConnectorLabel: null,
      storageId,
      storageProviderCode,
    }),
}))

export default useDmsSetupStore
