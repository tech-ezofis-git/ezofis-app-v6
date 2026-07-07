import { create } from 'zustand'

type Store = {
  answers: Record<string, string>
  step: number
  totalSteps: number
  back: () => void
  next: () => void
  reset: () => void
  setAnswer: (question: string, answer: string) => void
  setStep: (step: number) => void
}

const onBoardingStore = create<Store>()((set) => ({
  answers: {},
  step: 1,
  totalSteps: 6,

  back: () =>
    set((state) => ({
      step: Math.max(state.step - 1, 1),
    })),

  next: () =>
    set((state) => ({
      step: Math.min(state.step + 1, state.totalSteps),
    })),

  reset: () => set(() => ({ answers: {}, step: 1 })),

  setAnswer: (question: string, answer: string) =>
    set((state) => ({
      answers: {
        ...state.answers,
        [question]: answer,
      },
    })),

  setStep: (step: number) => set(() => ({ step })),
}))

export default onBoardingStore
