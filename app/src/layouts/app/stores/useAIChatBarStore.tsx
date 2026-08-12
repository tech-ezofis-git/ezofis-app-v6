import { create } from 'zustand'

type Store = {
  isAIChatOpen: boolean
  closeAIChat: () => void
  openAIChat: () => void
  toggleAIChat: () => void
}

const useAIChatBarStore = create<Store>()((set) => ({
  isAIChatOpen: false,
  closeAIChat: () => set({ isAIChatOpen: false }),
  openAIChat: () => set({ isAIChatOpen: true }),
  toggleAIChat: () => set((state) => ({ isAIChatOpen: !state.isAIChatOpen })),
}))

export default useAIChatBarStore
