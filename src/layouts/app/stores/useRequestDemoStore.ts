import { create } from 'zustand'

type Store = {
  isDemoFormOpen: boolean
  openDemoForm: () => void
  closeDemoForm: () => void
}

const useRequestDemoStore = create<Store>()((set) => ({
  isDemoFormOpen: false,
  openDemoForm: () => set({ isDemoFormOpen: true }),
  closeDemoForm: () => set({ isDemoFormOpen: false }),
}))

export default useRequestDemoStore
