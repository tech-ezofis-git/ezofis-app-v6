import { create } from 'zustand'

type Store = {
  isMaximized: boolean
  isRequestOpen: boolean
  closeRequest: () => void
  openRequest: () => void
  toggleMaximize: () => void
}

const requestStore = create<Store>()((set) => ({
  isMaximized: false,
  isRequestOpen: false,
  closeRequest: () => set({ isRequestOpen: false }),
  openRequest: () => set({ isRequestOpen: true }),
  toggleMaximize: () =>
    set(({ isMaximized }) => ({ isMaximized: !isMaximized })),
}))

export default requestStore
