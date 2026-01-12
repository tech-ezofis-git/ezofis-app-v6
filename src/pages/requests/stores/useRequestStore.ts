import { create } from 'zustand'

type Store = {
  // UI State
  isMaximized: boolean
  isRequestOpen: boolean

  // Data State (Added these)
  selectedItem: any | null
  selectedWorkflowId: number | null
  activeTabValue: string | null
  // Actions
  selectedWorkflow: any
  isClosed: boolean
  newRequest: boolean
  rawWorkflowData: any | null
  newRequestMeta: string | null
  reloadMeta: boolean
  repoData: any
  pendingNav: any
  closeRequest: () => void
  openRequest: (item: any, workflowId: any, tab: string) => void // Updated signature
  openNewRequest: (title: string) => void
  closeNewRequest: () => void
  toggleMaximize: () => void
  setRawWorkflowData: (data: any) => void
  workflowRefresh: () => void
  stopRefresh: () => void
  handleSetRepoData: (data: any) => void

  setPendingNav: (v: any) => void
  clearPendingNav: () => void
}

const requestStore = create<Store>()((set) => ({
  isMaximized: false,
  isRequestOpen: false,
  selectedItem: null,
  selectedWorkflowId: null,
  activeTabValue: null,
  selectedWorkflow: null,
  rawWorkflowData: null,
  isClosed: false,
  newRequest: false,
  reloadMeta: false,
  repoData: null,
  newRequestMeta: null,
  // in useRequestStore
  pendingNav: null as null | { direction: 'NEXT' | 'PREV' },
  setPendingNav: (v) => set({ pendingNav: v }),
  clearPendingNav: () => set({ pendingNav: null }),

  handleSetRepoData: (data) => set({ repoData: data }),
  closeRequest: () =>
    set((state) => ({
      isRequestOpen: false,
      selectedItem: null, // Optional: clear data on close
      activeTabValue: null,
      isClosed: !state.isClosed,
    })),
  openNewRequest: (title: string) =>
    set({ newRequest: true, newRequestMeta: title }),
  closeNewRequest: () => set({ newRequest: false, newRequestMeta: null }),
  // FIX: Accept data when opening
  openRequest: (item, workflow, tab) =>
    set({
      isRequestOpen: true,
      selectedItem: item,
      selectedWorkflowId: workflow.id as number,
      selectedWorkflow: workflow,
      activeTabValue: tab,
    }),

  workflowRefresh: () => set({ reloadMeta: true }),
  stopRefresh: () => set({ reloadMeta: false }),
  setRawWorkflowData: (data) => set({ rawWorkflowData: data }),
  toggleMaximize: () =>
    set(({ isMaximized }) => ({ isMaximized: !isMaximized })),
}))

export default requestStore
