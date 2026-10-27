import { requestApi } from '@/api/requests/requests'
import authUserStore from '@/stores/authUserStore'
import type {
  Id,
  MainProcessDetails,
  SubProcessRow,
  SubWorkflowLink,
} from '../types'
import { type MockProcess, mockSubWorkflowBackend } from './mock/mockStore'

// The V6 sub-workflow API is not ready yet, so the UI runs on the local mock
// by default. Set VITE_SUB_WORKFLOW_API=live to call the real endpoints.
export const isSubWorkflowMock = () =>
  import.meta.env.VITE_SUB_WORKFLOW_API !== 'live'

/**
 * Display data for a process taking part in a link. The live API derives
 * this server-side; the mock stores it so the Sub Process list can show it.
 */
export const toLinkedProcessSummary = (process: {
  processId: Id
  requestNo?: string | null
  stage?: string
  workflowId: Id
  workflowName?: string
}): MockProcess => ({
  flowStatus: 0,
  lastAction: 'Submit',
  processId: process.processId,
  raisedAt: new Date().toISOString(),
  raisedBy: authUserStore.getState().session?.email,
  requestNo: process.requestNo || `#${process.processId}`,
  stage: process.stage,
  workflowId: process.workflowId,
  workflowName: process.workflowName || '',
})

const asArray = (data: unknown): any[] => {
  const parsed = typeof data === 'string' ? safeParse(data) : data
  if (Array.isArray(parsed)) return parsed
  if (Array.isArray((parsed as any)?.data)) return (parsed as any).data
  return []
}

const safeParse = (value: string) => {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

// Live response shapes are unconfirmed (SUBWORKFLOW_PLAN.md §4). These
// mappers accept the V5 field names and fall back gracefully.
const toSubProcessRow = (row: any): SubProcessRow => ({
  duration: row.duration ?? row.sublastActionDuration,
  flowStatus: row.flowStatus ?? row.subProcessStatus ?? 0,
  lastAction: row.lastAction,
  processId: row.subProcessId ?? row.processId,
  raisedAt: row.raisedAt,
  raisedBy: row.raisedBy,
  requestNo: row.requestNo ?? `#${row.subProcessId ?? row.processId}`,
  stage: row.stage ?? row.stageName,
  subWorkflowId: row.subWorkflowId ?? row.subWorkFlowId,
  subWorkflowName: row.subWorkflowName ?? row.name ?? '',
})

const toMainProcess = (row: any): MainProcessDetails => ({
  flowStatus: row.flowStatus ?? 0,
  processId: row.processId,
  requestNo: row.requestNo ?? `#${row.processId}`,
  workflowId: row.workflowId,
  workflowName: row.workflowName ?? row.name,
})

export const subWorkflowApi = {
  /** Registers the parent→child link after the child request is created. */
  linkSubProcess: async (
    link: Omit<SubWorkflowLink, 'review' | 'subProcessStatus'>,
    mockData?: { child?: MockProcess; parent?: MockProcess },
  ): Promise<SubWorkflowLink> => {
    const payload: SubWorkflowLink = {
      ...link,
      review: '',
      subProcessStatus: 0,
    }
    if (isSubWorkflowMock())
      return mockSubWorkflowBackend.link(
        payload,
        mockData?.child,
        mockData?.parent,
      )
    await requestApi.addSubWorkflow(payload)
    return payload
  },

  /** Parent of a child request, or null when the request is not a child. */
  getMainProcess: async (
    workflowId: Id,
    processId: Id,
  ): Promise<MainProcessDetails | null> => {
    if (isSubWorkflowMock())
      return mockSubWorkflowBackend.getMainProcess(workflowId, processId)
    const rows = asArray(
      await requestApi.getMainProcessDetails(workflowId, processId),
    )
    // V5 takes the last element (InboxList.vue:13863-13866).
    const last = rows.at(-1)
    return last ? toMainProcess(last) : null
  },

  /** Children of a parent request. */
  getSubProcesses: async (
    workflowId: Id,
    processId: Id,
  ): Promise<SubProcessRow[]> => {
    if (isSubWorkflowMock())
      return mockSubWorkflowBackend.getSubProcesses(workflowId, processId)
    const data = await requestApi.getSubWorkflow(workflowId, processId)
    return asArray(data).map(toSubProcessRow)
  },
}
