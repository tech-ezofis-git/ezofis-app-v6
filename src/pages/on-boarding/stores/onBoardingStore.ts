import { create } from 'zustand'

type Store = {
  step: number
  totalSteps: number
  answers: Record<string, string>
  back: () => void
  next: () => void
  setAnswer: (question: string, answer: string) => void
  setStep: (step: number) => void
  reset: () => void
}

const onBoardingStore = create<Store>()((set) => ({
  step: 1,
  totalSteps: 6,
  answers: {},

  back: () =>
    set((state) => ({
      step: Math.max(state.step - 1, 1),
    })),

  next: () =>
    set((state) => ({
      step: Math.min(state.step + 1, state.totalSteps),
    })),

  setAnswer: (question: string, answer: string) =>
    set((state) => ({
      answers: {
        ...state.answers,
        [question]: answer,
      },
    })),

  setStep: (step: number) => set(() => ({ step })),

  reset: () => set(() => ({ step: 1, answers: {} })),
}))

export default onBoardingStore
