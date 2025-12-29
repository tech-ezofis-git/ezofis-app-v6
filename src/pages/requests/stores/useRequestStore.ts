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
  closeRequest: () => void
  openRequest: (item: any, workflowId: any, tab: string) => void // Updated signature
  toggleMaximize: () => void
  selectedWorkflow: any
}

const requestStore = create<Store>()((set) => ({
  isMaximized: false,
  isRequestOpen: false,
  selectedItem: null,
  selectedWorkflowId: null,
  activeTabValue: null,
  selectedWorkflow: null,
  closeRequest: () =>
    set({
      isRequestOpen: false,
      selectedItem: null, // Optional: clear data on close
      activeTabValue: null,
    }),

  // FIX: Accept data when opening
  openRequest: (item, workflow, tab) =>
    set({
      isRequestOpen: true,
      selectedItem: item,
      selectedWorkflowId: workflow.id as number,
      selectedWorkflow: workflow,
      activeTabValue: tab,
    }),

  toggleMaximize: () =>
    set(({ isMaximized }) => ({ isMaximized: !isMaximized })),
}))

export default requestStore
