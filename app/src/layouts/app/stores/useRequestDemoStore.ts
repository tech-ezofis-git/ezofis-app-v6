import { create } from 'zustand'

type OpenDemoFormOptions = {
  category?: string
  focusDescription?: boolean
  priority?: string
}

type Store = {
  focusDescription?: boolean
  initialCategory?: string
  initialPriority?: string
  isDemoFormOpen: boolean
  closeDemoForm: () => void
  openDemoForm: (options?: OpenDemoFormOptions) => void
}

const useRequestDemoStore = create<Store>()((set) => ({
  focusDescription: false,
  initialCategory: undefined,
  initialPriority: undefined,
  isDemoFormOpen: false,
  closeDemoForm: () =>
    set({
      focusDescription: false,
      initialCategory: undefined,
      initialPriority: undefined,
      isDemoFormOpen: false,
    }),
  openDemoForm: (options) =>
    set({
      focusDescription: Boolean(options?.focusDescription),
      initialCategory: options?.category,
      initialPriority: options?.priority,
      isDemoFormOpen: true,
    }),
}))

export default useRequestDemoStore
