import { create } from 'zustand'

type Store = {
  password: string
  step: number
  totalSteps: number
  back: () => void
  next: () => void
  setPassword: (password: string) => void
  setStep: (step: number) => void
}

const onBoardingStore = create<Store>()((set) => ({
  password: '',
  step: 0,
  totalSteps: 7,

  back: () =>
    set((state) => ({
      step: Math.max(state.step - 1, 0),
    })),

  next: () =>
    set((state) => ({
      step: Math.min(state.step + 1, state.totalSteps),
    })),

  setPassword: (password: string) => set(() => ({ password })),
  setStep: (step: number) => set(() => ({ step })),
}))

export default onBoardingStore
