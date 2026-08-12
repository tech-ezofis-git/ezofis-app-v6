import { create } from 'zustand'

type Store = {
  isFieldListOpen: boolean
  closeFieldList: () => void
  openFieldList: () => void
  toggleFieldList: () => void
}

const useFieldListStore = create<Store>((set) => ({
  isFieldListOpen: true,
  closeFieldList: () => set({ isFieldListOpen: false }),
  openFieldList: () => set({ isFieldListOpen: true }),
  toggleFieldList: () =>
    set((state) => ({ isFieldListOpen: !state.isFieldListOpen })),
}))

export default useFieldListStore
