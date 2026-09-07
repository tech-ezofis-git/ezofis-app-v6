import { create } from 'zustand'
import type { ApiPlaygroundContext } from '@/components/playground/ApiPlayground'

interface PlaygroundStore {
  context: ApiPlaygroundContext | null
  isOpen: boolean
  close: () => void
  open: () => void
  setContext: (context: ApiPlaygroundContext | null) => void
}

const usePlaygroundStore = create<PlaygroundStore>((set) => ({
  context: null,
  isOpen: false,
  close: () => set({ isOpen: false }),
  open: () => set({ isOpen: true }),
  setContext: (context) => set({ context }),
}))

export default usePlaygroundStore
