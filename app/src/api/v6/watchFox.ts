import type { AxiosRequestConfig } from 'axios'
import authUserStore from '@/stores/authUserStore'
import { axiosV6 } from '../axios'
import { getV6ApiErrorMessage } from './auth'

/**
 * WatchFox email watches for one workflow (workflow builder › mail node):
 * GET /email-ingest/watchfox/types, GET /email-ingest/watchfox/workflows/{id}/watches,
 * POST /email-ingest/watchfox/connect, PATCH / DELETE /email-ingest/watchfox/watches/{id},
 * POST /email-ingest/watchfox/watches/{id}/pause | resume | reconnect.
 */

export interface WatchFoxLink {
  url: string
  expiresIn?: number
}

export type WatchFoxProvider = 'gmail' | 'outlook'

export type WatchFoxStatus =
  | 'active'
  | 'error'
  | 'needs_attention'
  | 'paused'
  | 'pending'

export interface WatchFoxType {
  custom: boolean
  id: string
  label: string
}

export interface WatchFoxWatch {
  connectionId: null | string
  createdAtUtc: string
  id: string
  lastError: null | string
  mailboxEmail: null | string
  /** `m365` (Outlook) or `gmail`, as saved by the API. */
  provider: string
  status: WatchFoxStatus
  types: string[]
  watchId: null | string
  webhookUrl: null | string
  workflowId: string
}

export interface WatchFoxWorkflowWatches {
  watches: WatchFoxWatch[]
  webhookUrl: string
}

const BASE_URL = '/email-ingest/watchfox'

const tenantId = () => {
  const store = authUserStore.getState()
  return (
    store.session?.tenantId ||
    (store.identity as null | { tenantId?: string })?.tenantId ||
    ''
  )
}

const request = async <T>(
  config: AxiosRequestConfig,
  fallback: string,
): Promise<T> => {
  const tid = tenantId()
  try {
    const { data } = await axiosV6({
      ...config,
      headers: tid ? { 'X-Tenant-Id': tid } : undefined,
      skipCancellation: true,
    })
    return data as T
  } catch (error) {
    const data = (error as { response?: { data?: unknown } })?.response?.data
    throw new Error(getV6ApiErrorMessage(data, fallback))
  }
}

/** Where the browser lands after the WatchFox sign-in. WatchFox needs https. */
export const getWatchFoxReturnUrl = (): string => {
  if (
    typeof window !== 'undefined' &&
    window.location.origin.startsWith('https://')
  ) {
    return `${window.location.origin}${window.location.pathname}`
  }
  return 'https://cloud.ezofis.com/workflows'
}

export const isWatchFoxOutlook = (provider: string) =>
  provider === 'm365' || provider === 'outlook'

export const getWatchFoxTypes = () =>
  request<WatchFoxType[]>(
    { method: 'GET', url: `${BASE_URL}/types` },
    'Could not load email types.',
  )

export const getWorkflowWatches = (workflowId: string) =>
  request<WatchFoxWorkflowWatches>(
    { method: 'GET', url: `${BASE_URL}/workflows/${workflowId}/watches` },
    'Could not load mailbox watches.',
  )

export const connectWatchFoxMailbox = (payload: {
  provider: WatchFoxProvider
  types: string[]
  workflowId: string
}) =>
  request<WatchFoxLink>(
    {
      data: {
        ...payload,
        redirectUrl: getWatchFoxReturnUrl(),
        tenantId: tenantId(),
      },
      method: 'POST',
      url: `${BASE_URL}/connect`,
    },
    'Could not start the mailbox sign-in.',
  )

export const updateWatchTypes = (id: string, types: string[]) =>
  request<WatchFoxWatch>(
    { data: { types }, method: 'PATCH', url: `${BASE_URL}/watches/${id}` },
    'Could not save the email types.',
  )

export const pauseWatch = (id: string) =>
  request<WatchFoxWatch>(
    { method: 'POST', url: `${BASE_URL}/watches/${id}/pause` },
    'Could not pause the watch.',
  )

/** Resume also checks mail that arrived while paused. */
export const resumeWatch = (id: string) =>
  request<WatchFoxWatch>(
    {
      data: { catchUp: true },
      method: 'POST',
      url: `${BASE_URL}/watches/${id}/resume`,
    },
    'Could not resume the watch.',
  )

export const reconnectWatch = (id: string) =>
  request<WatchFoxLink>(
    {
      data: { redirectUrl: getWatchFoxReturnUrl() },
      method: 'POST',
      url: `${BASE_URL}/watches/${id}/reconnect`,
    },
    'Could not start the mailbox sign-in.',
  )

export const deleteWatch = (id: string) =>
  request<{ deleted: boolean }>(
    { method: 'DELETE', url: `${BASE_URL}/watches/${id}` },
    'Could not remove the watch.',
  )

/**
 * Webhook only (no WatchFox): the client's own tool posts the .eml to the workflow's URL with
 * the key in the `X-Webhook-Key` header. The key is returned once, when it is made.
 */
export interface WorkflowEmailWebhook {
  createdAtUtc: null | string
  enabled: boolean
  keyPrefix: null | string
  lastUsedAtUtc: null | string
  webhookUrl: string
}

export interface WorkflowEmailWebhookKey {
  key: string
  webhook: WorkflowEmailWebhook
}

const WEBHOOK_URL = '/email-ingest/webhook/workflows'

export const getWorkflowEmailWebhook = (workflowId: string) =>
  request<WorkflowEmailWebhook>(
    { method: 'GET', url: `${WEBHOOK_URL}/${workflowId}` },
    'Could not load the webhook.',
  )

export const createWorkflowEmailWebhookKey = (workflowId: string) =>
  request<WorkflowEmailWebhookKey>(
    { method: 'POST', url: `${WEBHOOK_URL}/${workflowId}/key` },
    'Could not create the webhook key.',
  )

export const disableWorkflowEmailWebhookKey = (workflowId: string) =>
  request<WorkflowEmailWebhook>(
    { method: 'DELETE', url: `${WEBHOOK_URL}/${workflowId}/key` },
    'Could not turn off the webhook key.',
  )
