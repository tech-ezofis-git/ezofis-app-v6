import { create } from 'zustand'

type Store = {
  isMaximized: boolean
  isOpen: boolean
  suggestion: string
  suggestions: string[]
  close: () => void
  open: () => void
  setSuggestion: (suggestion: string) => void
  toggleMaximize: () => void
}

const useAskAIStore = create<Store>((set) => ({
  isMaximized: false,
  isOpen: false,
  suggestion: '',
  suggestions: [
    'Show recent documents.',
    'Create an approval workflow.',
    'Suggest a form template.',
    'Summarize project progress.',
    'Generate an HR portal layout.',
  ],
  close: () => set({ isOpen: false }),
  open: () => set({ isOpen: true }),
  toggleMaximize: () =>
    set(({ isMaximized }) => ({ isMaximized: !isMaximized })),
  setSuggestion: (suggestion: string) => set({ suggestion }),
}))

export default useAskAIStore
