import { create } from 'zustand'

type FormDetails = {
  description: string
  layout: string
  method: string
  name: string
  type: number | null
}

type Store = {
  formDetails: FormDetails
  isWizardOpen: boolean
  prompt: string
  step: string
  closeWizard: () => void
  openWizard: () => void
  setFormDetails: (formDetails: FormDetails) => void
  setPropmt: (prompt: string) => void
  setStep: (step: string) => void
}

const initialFormDetails: FormDetails = {
  description: '',
  layout: '',
  method: '',
  name: '',
  type: 1,
}

const useFormWizardStore = create<Store>((set) => ({
  formDetails: initialFormDetails,
  isWizardOpen: false,
  prompt: '',
  step: '1',
  closeWizard: () => set({ isWizardOpen: false }),
  openWizard: () =>
    set({ formDetails: initialFormDetails, isWizardOpen: true, step: '1' }),
  setFormDetails: (formDetails: FormDetails) => set({ formDetails }),
  setPropmt: (prompt) => set({ prompt }),
  setStep: (step) => set({ step }),
}))

export default useFormWizardStore
