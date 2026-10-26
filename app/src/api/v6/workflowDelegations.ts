import type { AxiosRequestConfig } from 'axios'
import type {
  Delegation,
  DelegationStatus,
} from '@/pages/settings/components/delegation/delegationHelpers'
import authUserStore from '@/stores/authUserStore'
import { axiosV6 } from '../axios'
import { getV6ApiErrorMessage } from './auth'

/**
 * Workflow delegations (Settings › Delegation):
 * GET / POST /workflow-delegations, GET / PUT / DELETE /workflow-delegations/{id},
 * POST /workflow-delegations/{id}/end.
 */

type DelegationRecord = {
  actions?: Partial<Delegation['actions']>
  assigneeUserId?: string
  delegations?: Array<{
    delegateUserId?: string
    reason?: string
    stageId?: string
    workflowId?: string
  }>
  fromDate?: string
  id?: string
  isDraft?: boolean
  isEnded?: boolean
  modifiedAtUtc?: string
  onPeriodEnd?: Delegation['onPeriodEnd']
  status?: DelegationStatus
  toDate?: string
}

const BASE_URL = '/workflow-delegations'

const tenantHeaders = () => {
  const store = authUserStore.getState()
  const tenantId =
    store.session?.tenantId ||
    (store.identity as { tenantId?: string } | null)?.tenantId ||
    ''
  return tenantId ? { 'X-Tenant-Id': tenantId } : undefined
}

/** "2026-10-27T00:00:00" → "2026-10-27" (dates are day-only here). */
const toDay = (value?: string) => (value ? String(value).slice(0, 10) : '')

const fromRecord = (record: DelegationRecord): Delegation => ({
  actions: {
    notifyDelegates: Boolean(record.actions?.notifyDelegates),
    redirectNewRequests: Boolean(record.actions?.redirectNewRequests),
    transferCurrentRequests: Boolean(record.actions?.transferCurrentRequests),
  },
  assigneeUserId: String(record.assigneeUserId || ''),
  delegations: (record.delegations || []).map((row) => ({
    delegateUserId: String(row.delegateUserId || ''),
    reason: String(row.reason || ''),
    stageId: String(row.stageId || ''),
    workflowId: String(row.workflowId || ''),
  })),
  endedEarly: Boolean(record.isEnded),
  fromDate: toDay(record.fromDate),
  id: String(record.id || ''),
  isDraft: Boolean(record.isDraft),
  modifiedAt: String(record.modifiedAtUtc || ''),
  status: record.status,
  toDate: toDay(record.toDate),
  onPeriodEnd: record.onPeriodEnd || 'RETURN_TO_ASSIGNEE',
})

/** Body for POST / PUT (full replace). Empty dates are omitted for drafts. */
export const toDelegationBody = (item: Delegation) => ({
  actions: item.actions,
  assigneeUserId: item.assigneeUserId,
  delegations: item.delegations.map((row) => ({
    delegateUserId: row.delegateUserId,
    reason: row.reason,
    stageId: row.stageId,
    workflowId: row.workflowId,
  })),
  ...(item.fromDate ? { fromDate: item.fromDate } : {}),
  isDraft: item.isDraft,
  onPeriodEnd: item.onPeriodEnd,
  ...(item.toDate ? { toDate: item.toDate } : {}),
})

/** Readable message from a 400 (incl. ASP.NET `errors` lists) or other failure. */
const errorMessage = (error: unknown, fallback: string) => {
  const data = (error as { response?: { data?: unknown } })?.response?.data
  const errors = (data as { errors?: unknown } | undefined)?.errors
  if (Array.isArray(errors) && errors.length)
    return errors.map(String).join(' ')
  if (errors && typeof errors === 'object') {
    const messages = Object.values(errors as Record<string, unknown>).flat()
    if (messages.length) return messages.map(String).join(' ')
  }
  return getV6ApiErrorMessage(data, fallback)
}

const request = async <T>(
  config: AxiosRequestConfig,
  fallback: string,
): Promise<T> => {
  try {
    const { data } = await axiosV6({
      ...config,
      headers: tenantHeaders(),
      skipCancellation: true,
    })
    return data as T
  } catch (error) {
    throw new Error(errorMessage(error, fallback))
  }
}

const asList = (data: unknown): DelegationRecord[] => {
  if (Array.isArray(data)) return data
  const record = data as { data?: unknown; items?: unknown } | null
  if (Array.isArray(record?.items)) return record.items
  if (Array.isArray(record?.data)) return record.data
  return []
}

export const listDelegations = async () =>
  asList(
    await request<unknown>(
      { method: 'GET', url: BASE_URL },
      'Failed to load delegations',
    ),
  ).map(fromRecord)

export const getDelegation = async (id: string) =>
  fromRecord(
    await request<DelegationRecord>(
      { method: 'GET', url: `${BASE_URL}/${id}` },
      'Failed to load the delegation',
    ),
  )

export const createDelegation = async (item: Delegation) =>
  fromRecord(
    await request<DelegationRecord>(
      { data: toDelegationBody(item), method: 'POST', url: BASE_URL },
      'Failed to create the delegation',
    ),
  )

export const updateDelegation = async (id: string, item: Delegation) =>
  fromRecord(
    await request<DelegationRecord>(
      { data: toDelegationBody(item), method: 'PUT', url: `${BASE_URL}/${id}` },
      'Failed to update the delegation',
    ),
  )

export const endDelegation = async (id: string) =>
  fromRecord(
    await request<DelegationRecord>(
      { method: 'POST', url: `${BASE_URL}/${id}/end` },
      'Failed to end the delegation',
    ),
  )

export const deleteDelegation = async (id: string) => {
  await request<unknown>(
    { method: 'DELETE', url: `${BASE_URL}/${id}` },
    'Failed to delete the delegation',
  )
}
