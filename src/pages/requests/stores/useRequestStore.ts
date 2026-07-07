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

const getInitialJobMappings = () => {
  try {
    const data = localStorage.getItem('v6_job_mappings')
    return data ? JSON.parse(data) : {}
  } catch {
    return {}
  }
}

const getInitialJobStatuses = () => {
  try {
    const data = localStorage.getItem('v6_job_statuses')
    return data ? JSON.parse(data) : {}
  } catch {
    return {}
  }
}

type Store = {
  activeQuickFilters: string[]
  activeTabValue: string | null

  isClosed: boolean
  // UI State
  isMaximized: boolean
  isPlaygroundOpen: boolean
  isRequestOpen: boolean
  jobMappings: Record<string, string>
  jobStatuses: Record<string, any>
  newRequest: boolean
  newRequestMeta: string | null
  pendingNav: any
  pendingOpenNewRequest: boolean
  playgroundContext: any
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
  clearQuickFilters: () => void
  closeNewRequest: () => void
  closeRequest: () => void
  handleSetRepoData: (data: any) => void
  openNewRequest: (title: string) => void
  openRequest: (item: any, workflowId: any, tab: string) => void // Updated signature
  removeProcessingProcess: (id: string | number) => void
  setIsPlaygroundOpen: (open: boolean) => void
  setJobMapping: (jobId: string | number, instanceId: string) => void
  setJobStatus: (id: string, status: any) => void

  setPendingNav: (v: any) => void
  setPendingOpenNewRequest: (value: boolean) => void
  setPlaygroundContext: (context: any) => void
  setRawWorkflowData: (data: any) => void

  setRequestListTab: (tab: string) => void
  stopRefresh: () => void
  toggleMaximize: () => void
  toggleQuickFilter: (filter: string) => void
  updateProcessingProcess: (id: string | number, updates: any) => void
  workflowRefresh: () => void
}

const requestStore = create<Store>((set) => ({
  activeQuickFilters: [],
  activeTabValue: null,
  isClosed: false,
  isMaximized: false,
  isPlaygroundOpen: false,
  isRequestOpen: false,
  jobMappings: getInitialJobMappings(),
  jobStatuses: getInitialJobStatuses(),
  newRequest: false,
  newRequestMeta: null,
  pendingNav: null as null | { direction: 'NEXT' | 'PREV' },
  pendingOpenNewRequest: false,
  playgroundContext: null,
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
  clearQuickFilters: () => set({ activeQuickFilters: [] }),
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
  toggleQuickFilter: (filter) =>
    set((state) => ({
      activeQuickFilters: state.activeQuickFilters.includes(filter)
        ? state.activeQuickFilters.filter((f) => f !== filter)
        : [...state.activeQuickFilters, filter],
    })),
  updateProcessingProcess: (id, updates) =>
    set((state) => ({
      processingProcesses: state.processingProcesses.map((p) =>
        (p.processId || p.id) === id ? { ...p, ...updates } : p,
      ),
    })),
  workflowRefresh: () => set({ reloadMeta: true }),
  setIsPlaygroundOpen: (open) => set({ isPlaygroundOpen: open }),
  setJobMapping: (jobId, instanceId) =>
    set((state) => {
      const stringJobId = String(jobId)
      const nextMappings = { ...state.jobMappings, [stringJobId]: instanceId }
      const jobKey = `job-${stringJobId}`
      const existingStatus = state.jobStatuses[jobKey]
      const nextStatuses = existingStatus
        ? { ...state.jobStatuses, [instanceId]: existingStatus }
        : state.jobStatuses
      try {
        localStorage.setItem('v6_job_mappings', JSON.stringify(nextMappings))
        if (existingStatus) {
          localStorage.setItem('v6_job_statuses', JSON.stringify(nextStatuses))
        }
      } catch {}
      return {
        jobMappings: nextMappings,
        jobStatuses: nextStatuses,
      }
    }),
  setJobStatus: (id, status) =>
    set((state) => {
      const nextStatuses = { ...state.jobStatuses, [id]: status }
      try {
        localStorage.setItem('v6_job_statuses', JSON.stringify(nextStatuses))
      } catch {}
      return { jobStatuses: nextStatuses }
    }),
  setPendingNav: (v) => set({ pendingNav: v }),
  setPendingOpenNewRequest: (value: boolean) =>
    set({ pendingOpenNewRequest: value }),
  setPlaygroundContext: (context) => set({ playgroundContext: context }),
  setRawWorkflowData: (data) => set({ rawWorkflowData: data }),
  setRequestListTab: (tab) => set({ requestListTab: tab }),
}))

export default requestStore
