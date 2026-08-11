import { create } from 'zustand'
type Answer = string | string[]
type Store = {
  answers: Record<string, Answer>
  step: number
  totalSteps: number
  back: () => void
  next: () => void
  reset: () => void
  setAnswer: (question: string, answer: Answer) => void
  setStep: (step: number) => void
}

const onBoardingStore = create<Store>()((set) => ({
  answers: {},
  step: 1,
  totalSteps: 7,

  back: () =>
    set((state) => ({
      step: Math.max(state.step - 1, 1),
    })),

  next: () =>
    set((state) => ({
      step: Math.min(state.step + 1, state.totalSteps),
    })),

  reset: () => set(() => ({ answers: {}, step: 1 })),

  setAnswer: (question: string, answer: Answer) =>
    set((state) => ({
      answers: {
        ...state.answers,
        [question]: answer,
      },
    })),

  setStep: (step: number) => set(() => ({ step })),
}))

export default onBoardingStore
