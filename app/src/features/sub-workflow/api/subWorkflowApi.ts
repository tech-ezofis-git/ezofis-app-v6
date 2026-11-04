import { requestApi } from '@/api/requests/requests'
import type {
  Id,
  MainProcessDetails,
  SubProcessRow,
  SubWorkflowHistoryRow,
  SubWorkflowLink,
} from '../types'

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

// These mappers accept the V5 field names (incl. list rows' `subworkflowTransaction`
// entries) and fall back gracefully.
export const toSubProcessRow = (row: any): SubProcessRow => ({
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

export const toMainProcess = (row: any): MainProcessDetails => ({
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
  ): Promise<SubWorkflowLink> => {
    const payload: SubWorkflowLink = {
      ...link,
      review: '',
      subProcessStatus: 0,
    }
    await requestApi.addSubWorkflow(payload)
    return payload
  },

  /**
   * Connector steps for a request's history, as `{ stage,
   * subWorkflowHistory }`. Live history rows carry `subWorkflowHistory`
   * themselves (V5 processHistory), so nothing extra is fetched here.
   */
  getHistory: async (
    _workflowId: Id,
    _processId: Id,
  ): Promise<
    { stage: string; subWorkflowHistory: SubWorkflowHistoryRow[] }[]
  > => [],

  /** Parent of a child request, or null when the request is not a child. */
  getMainProcess: async (
    workflowId: Id,
    processId: Id,
  ): Promise<MainProcessDetails | null> => {
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
    const data = await requestApi.getSubWorkflow(workflowId, processId)
    return asArray(data).map(toSubProcessRow)
  },

  /**
   * Children of every request in a workflow, keyed by parent process id, for
   * the inbox list. Live list rows carry `subworkflowTransaction` (V5), so
   * nothing extra is fetched here.
   */
  getSubProcessesForWorkflow: async (
    _workflowId: Id,
  ): Promise<Record<string, SubProcessRow[]>> => ({}),
}
