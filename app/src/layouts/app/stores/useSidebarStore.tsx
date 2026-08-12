import { create } from 'zustand'

type Store = {
  isSidebarOpen: boolean
  closeSidebar: () => void
  openSidebar: () => void
  toggleSidebar: () => void
}

const useSidebarStore = create<Store>()((set) => ({
  isSidebarOpen: false,
  closeSidebar: () => set({ isSidebarOpen: false }),
  openSidebar: () => set({ isSidebarOpen: true }),
  toggleSidebar: () =>
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
}))

export default useSidebarStore
