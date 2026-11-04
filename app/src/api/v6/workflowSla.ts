import authUserStore from '@/stores/authUserStore'
import { axiosV6 } from '../axios'
import { getV6ApiErrorMessage } from './auth'

/**
 * Workflow SLA helpers (workflow settings › SLA):
 * POST /workflow-sla/preview — run unsaved Advanced rules against sample form values;
 * GET /workflow-sla/{workflowId}/instances/{instanceId}/history — a ticket's SLA timers.
 */

const BASE_URL = '/workflow-sla'

const tenantHeaders = () => {
  const store = authUserStore.getState()
  const tenantId =
    store.session?.tenantId ||
    (store.identity as { tenantId?: string } | null)?.tenantId ||
    ''
  return tenantId ? { 'X-Tenant-Id': tenantId } : undefined
}

export type SlaPreviewRequest = {
  businessHours: {
    timeZone: string
    workDays: string[]
    workHours: { from: string; to: string }
  }
  /** UTC ISO time the request is created. */
  createdAtUtc: string
  /** Workflow form field id → value. */
  formValues: Record<string, string>
  slaSettings: unknown
}

export type SlaPreviewResult = {
  businessHours: boolean
  createdAtUtc: string
  errors: string[]
  log: string[]
  targets: SlaPreviewTarget[]
  timeZone: null | string
}

export type SlaPreviewTarget = {
  breachAction: null | string
  entryId: string
  entryName: string
  escalationUsers: string[]
  notifyUsers: string[]
  resolution: null | string
  resolutionDueUtc: null | string
  response: null | string
  responseDueUtc: null | string
  ruleId: string
  ruleName: string
}

export const previewWorkflowSla = async (
  body: SlaPreviewRequest,
): Promise<SlaPreviewResult> => {
  try {
    const { data } = await axiosV6.post(`${BASE_URL}/preview`, body, {
      headers: tenantHeaders(),
      skipCancellation: true,
    })
    return data as SlaPreviewResult
  } catch (e: unknown) {
    const data = (e as { response?: { data?: unknown } })?.response?.data
    throw new Error(getV6ApiErrorMessage(data, 'Could not preview the SLA.'))
  }
}

export type SlaHistory = {
  evaluatedAtUtc: null | string
  evaluationJson: null | string
  matched: boolean | null
  timers: SlaTimerRow[]
}

export type SlaTimerRow = {
  attempts: number
  dueAtUtc: string
  id: number
  outcome: null | string
  processedAtUtc: null | string
  ruleId: string
  scope: string
  snapshotJson: null | string
  status: 'cancelled' | 'failed' | 'fired' | 'pending'
}

export const getWorkflowSlaHistory = async (
  workflowId: string,
  instanceId: string,
): Promise<SlaHistory> => {
  const { data } = await axiosV6.get(
    `${BASE_URL}/${workflowId}/instances/${instanceId}/history`,
    { headers: tenantHeaders() },
  )
  return data as SlaHistory
}
