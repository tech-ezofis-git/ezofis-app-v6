import { create } from 'zustand'

type Store = {
  isDemoFormOpen: boolean
  closeDemoForm: () => void
  openDemoForm: () => void
}

const useRequestDemoStore = create<Store>()((set) => ({
  isDemoFormOpen: false,
  closeDemoForm: () => set({ isDemoFormOpen: false }),
  openDemoForm: () => set({ isDemoFormOpen: true }),
}))

export default useRequestDemoStore
