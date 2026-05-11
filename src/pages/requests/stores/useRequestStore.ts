import { create } from 'zustand'

type Store = {
  activeTabValue: string | null
  isClosed: boolean

  // UI State
  isMaximized: boolean
  isRequestOpen: boolean
  newRequest: boolean
  newRequestMeta: string | null
  pendingNav: any
  rawWorkflowData: any | null
  reloadMeta: boolean
  repoData: any
  requestListTab: string // New state for main list tabs
  // Data State (Added these)
  selectedItem: any | null
  // Actions
  selectedWorkflow: any
  selectedWorkflowId: number | null
  summaryCache: Record<string, any>
  cacheSummaryData: (reqNo: string, data: any) => void
  clearPendingNav: () => void
  closeNewRequest: () => void
  closeRequest: () => void
  handleSetRepoData: (data: any) => void
  openNewRequest: (title: string) => void
  openRequest: (item: any, workflowId: any, tab: string) => void // Updated signature
  setPendingNav: (v: any) => void
  setRawWorkflowData: (data: any) => void

  processingProcesses: any[]
  addProcessingProcess: (process: any) => void
  removeProcessingProcess: (id: string | number) => void
  updateProcessingProcess: (id: string | number, updates: any) => void

  setRequestListTab: (tab: string) => void
  stopRefresh: () => void
  toggleMaximize: () => void
  workflowRefresh: () => void
}

const requestStore = create<Store>()((set) => ({
  activeTabValue: null,
  isClosed: false,
  isMaximized: false,
  isRequestOpen: false,
  newRequest: false,
  newRequestMeta: null,
  processingProcesses: [],
  addProcessingProcess: (process) =>
    set((state) => ({
      processingProcesses: [...state.processingProcesses, process],
    })),
  removeProcessingProcess: (id) =>
    set((state) => ({
      processingProcesses: state.processingProcesses.filter(
        (p) => (p.processId || p.id) !== id,
      ),
    })),
  updateProcessingProcess: (id, updates) =>
    set((state) => ({
      processingProcesses: state.processingProcesses.map((p) =>
        (p.processId || p.id) === id ? { ...p, ...updates } : p,
      ),
    })),
  // in useRequestStore
  pendingNav: null as null | { direction: 'NEXT' | 'PREV' },
  rawWorkflowData: null,
  reloadMeta: false,
  repoData: null,
  requestListTab: 'Inbox', // Default
  selectedItem: null,
  selectedWorkflow: null,
  selectedWorkflowId: null,
  summaryCache: {},
  cacheSummaryData: (reqNo, data) =>
    set((state) => ({
      summaryCache: { ...state.summaryCache, [reqNo]: data },
    })),
  clearPendingNav: () => set({ pendingNav: null }),

  closeNewRequest: () => set({ newRequest: false, newRequestMeta: null }),
  closeRequest: () =>
    set((state) => ({
      activeTabValue: null,
      isClosed: !state.isClosed,
      isRequestOpen: false,
      selectedItem: null, // Optional: clear data on close
    })),
  handleSetRepoData: (data) => set({ repoData: data }),
  openNewRequest: (title: string) =>
    set({ newRequest: true, newRequestMeta: title }),
  // FIX: Accept data when opening
  openRequest: (item, workflow, tab) =>
    set({
      activeTabValue: tab,
      isRequestOpen: true,
      selectedItem: item,
      selectedWorkflow: workflow,
      selectedWorkflowId: workflow.id as number,
    }),
  stopRefresh: () => set({ reloadMeta: false }),
  toggleMaximize: () =>
    set(({ isMaximized }) => ({ isMaximized: !isMaximized })),
  workflowRefresh: () => set({ reloadMeta: true }),
  setPendingNav: (v) => set({ pendingNav: v }),
  setRawWorkflowData: (data) => set({ rawWorkflowData: data }),
  setRequestListTab: (tab) => set({ requestListTab: tab }),
}))

export default requestStore
