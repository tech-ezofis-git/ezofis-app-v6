import { requestApi } from '@/api/requests/requests'
import workflowsApiV6 from '@/api/v6/workflows'
import { mapHistoryFlow } from '@/pages/requests/hooks/useHistory'
import type {
  Id,
  MainProcessDetails,
  SubProcessPreviewField,
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
const toPreview = (value: unknown): SubProcessPreviewField[] =>
  (Array.isArray(value) ? value : [])
    .map((field: any) => ({
      label: String(field?.label ?? field?.Label ?? '').trim(),
      value: String(field?.value ?? field?.Value ?? '').trim(),
    }))
    .filter((field) => field.value)

export const toSubProcessRow = (row: any): SubProcessRow => ({
  duration: row.duration ?? row.sublastActionDuration,
  flowStatus: row.flowStatus ?? row.subProcessStatus ?? 0,
  lastAction: row.lastAction,
  preview: toPreview(row.preview ?? row.Preview),
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
   * subWorkflowHistory }`: one entry per child request, holding the child's
   * own steps. The parent's history response doesn't carry them, so each
   * linked child's history is read here.
   */
  getHistory: async (
    workflowId: Id,
    processId: Id,
    /** Children already loaded elsewhere (header, list); skips a round trip. */
    knownChildren?: SubProcessRow[],
  ): Promise<
    { stage: string; subWorkflowHistory: SubWorkflowHistoryRow[] }[]
  > => {
    const children =
      knownChildren ??
      (await subWorkflowApi.getSubProcesses(workflowId, processId))
    const entries = await Promise.all(
      children.map(async (child) => {
        const res = await workflowsApiV6.getInstanceHistory(
          child.subWorkflowId,
          child.processId,
        )
        const flows: any[] = Array.isArray(res.data?.flows)
          ? res.data.flows
          : Array.isArray(res.data)
            ? res.data
            : []
        return {
          stage: child.subWorkflowName,
          subWorkflowHistory: flows.map(
            (flow, idx): SubWorkflowHistoryRow => ({
              ...(mapHistoryFlow(flow, idx) as SubWorkflowHistoryRow),
              requestNo: child.requestNo,
            }),
          ),
        }
      }),
    )
    return entries.filter((entry) => entry.subWorkflowHistory.length > 0)
  },

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
   * Children of the requests on one page of a workflow's list, keyed by
   * parent process id. One call for the whole page.
   */
  getSubProcessesForRows: async (
    workflowId: Id,
    processIds: Id[],
  ): Promise<Record<string, SubProcessRow[]>> => {
    if (processIds.length === 0) return {}
    const data = await requestApi.getSubWorkflowBatch(workflowId, processIds)
    const result: Record<string, SubProcessRow[]> = {}
    for (const [parentId, rows] of Object.entries(data ?? {})) {
      result[parentId] = asArray(rows).map(toSubProcessRow)
    }
    return result
  },
}
