import { useEffect, useState } from 'react'
import { create } from 'zustand'

export const getProcessingStatusText = (startTime?: string) => {
  if (!startTime) return 'We are processing your file...'
  const start = new Date(startTime).getTime()
  const now = Date.now()
  const elapsed = (now - start) / 1000

  if (elapsed < 5) {
    return 'We are processing your file...'
  } else if (elapsed < 10) {
    return 'Extracting OCR data...'
  } else if (elapsed < 15) {
    return 'Extracting invoice fields...'
  } else if (elapsed < 20) {
    return 'Matching fields with Purchase Order...'
  } else if (elapsed < 25) {
    return 'Matching fields with GL Accounts...'
  } else if (elapsed < 30) {
    return 'Verifying supplier details...'
  } else {
    return 'Making the decision...'
  }
}

export const useProcessingStatusText = (startTime?: string) => {
  const [text, setText] = useState(() => getProcessingStatusText(startTime))

  useEffect(() => {
    if (!startTime) return

    const interval = setInterval(() => {
      setText(getProcessingStatusText(startTime))
    }, 1000)

    return () => clearInterval(interval)
  }, [startTime])

  return text
}

type Store = {
  activeTabValue: string | null
  isClosed: boolean

  // UI State
  isMaximized: boolean
  isRequestOpen: boolean
  newRequest: boolean
  newRequestMeta: string | null
  pendingNav: any
  pendingOpenNewRequest: boolean
  processingProcesses: any[]
  rawWorkflowData: any
  reloadMeta: boolean
  repoData: any
  requestListTab: string // New state for main list tabs
  // Data State (Added these)
  selectedItem: any
  // Actions
  selectedWorkflow: any
  selectedWorkflowId: number | string | null
  summaryCache: Record<string, any>
  addProcessingProcess: (process: any) => void
  cacheSummaryData: (reqNo: string, data: any) => void
  clearPendingNav: () => void
  closeNewRequest: () => void
  closeRequest: () => void
  handleSetRepoData: (data: any) => void
  openNewRequest: (title: string) => void
  openRequest: (item: any, workflowId: any, tab: string) => void // Updated signature
  removeProcessingProcess: (id: string | number) => void

  setPendingNav: (v: any) => void
  setPendingOpenNewRequest: (value: boolean) => void
  setRawWorkflowData: (data: any) => void
  setRequestListTab: (tab: string) => void

  stopRefresh: () => void
  toggleMaximize: () => void
  updateProcessingProcess: (id: string | number, updates: any) => void
  workflowRefresh: () => void
}

const requestStore = create<Store>((set) => ({
  activeTabValue: null,
  isClosed: false,
  isMaximized: false,
  isRequestOpen: false,
  newRequest: false,
  newRequestMeta: null,
  pendingNav: null as null | { direction: 'NEXT' | 'PREV' },
  pendingOpenNewRequest: false,
  processingProcesses: [],
  rawWorkflowData: null,
  reloadMeta: false,
  repoData: null,
  requestListTab: 'Inbox', // Default
  selectedItem: null,
  selectedWorkflow: null,
  selectedWorkflowId: null,
  summaryCache: {},
  addProcessingProcess: (process) =>
    set((state) => ({
      processingProcesses: [
        ...state.processingProcesses,
        {
          ...process,
          startTime: process.startTime || new Date().toISOString(),
        },
      ],
    })),
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
    set({
      newRequest: true,
      newRequestMeta: title,
      pendingOpenNewRequest: false,
    }),
  // FIX: Accept data when opening
  openRequest: (item, workflow, tab) =>
    set({
      activeTabValue: tab,
      isRequestOpen: true,
      selectedItem: item,
      selectedWorkflow: workflow,
      selectedWorkflowId: workflow.id as number | string,
    }),
  removeProcessingProcess: (id) =>
    set((state) => ({
      processingProcesses: state.processingProcesses.filter(
        (p) => (p.processId || p.id) !== id,
      ),
    })),
  stopRefresh: () => set({ reloadMeta: false }),
  toggleMaximize: () =>
    set(({ isMaximized }) => ({ isMaximized: !isMaximized })),
  updateProcessingProcess: (id, updates) =>
    set((state) => ({
      processingProcesses: state.processingProcesses.map((p) =>
        (p.processId || p.id) === id ? { ...p, ...updates } : p,
      ),
    })),
  workflowRefresh: () => set({ reloadMeta: true }),
  setPendingNav: (v) => set({ pendingNav: v }),
  setPendingOpenNewRequest: (value: boolean) =>
    set({ pendingOpenNewRequest: value }),
  setRawWorkflowData: (data) => set({ rawWorkflowData: data }),
  setRequestListTab: (tab) => set({ requestListTab: tab }),
}))

export default requestStore
