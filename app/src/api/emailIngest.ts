import authUserStore from '../stores/authUserStore'
import { axiosV6 } from './axios'

export interface EmailIngestMailboxPayload {
  connectorId: string
  workflowId: string
  isEnabled?: boolean
  pollIntervalMinutes?: number
  masterSource?: string
  queryFilter?: string | null
  masterFormId?: string | number | null
  masterConnectorId?: string | number | null
  attachmentExtensions?: string
}

export interface EmailIngestMailbox {
  id: string
  connectorId: string
  workflowId: string
  isEnabled: boolean
  pollIntervalMinutes: number
  queryFilter?: string | null
  masterSource?: string
  masterFormId?: string | number | null
  masterConnectorId?: string | number | null
  attachmentExtensions?: string
  lastPolledAtUtc?: string | null
  lastError?: string | null
  createdAtUtc?: string
  modifiedAtUtc?: string | null
  connectorName?: string
  connectorProviderCode?: string
  externalAccountEmail?: string
}

export interface PollMailboxResponse {
  mailboxId: string
  messagesScanned: number
  attachmentsStarted: number
  skippedAlreadyProcessed: number
  error?: string | null
}

const getTenantId = () => {
  const store = authUserStore.getState()
  return store.session?.tenantId || ''
}

export const getMailboxes = async () => {
  const _response = {
    error: '',
    payload: [] as EmailIngestMailbox[],
  }

  try {
    const tenantId = getTenantId()
    const response = await axiosV6.get('/email-ingest/mailboxes', {
      headers: {
        'X-Tenant-Id': tenantId,
      },
    })
    const { data, status } = response

    if (status !== 200) {
      throw new Error('invalid status code')
    }

    const extractList = (obj: any): any[] => {
      if (!obj) return []
      if (Array.isArray(obj)) return obj
      if (Array.isArray(obj.data)) return obj.data
      if (Array.isArray(obj.items)) return obj.items
      if (Array.isArray(obj.value)) return obj.value
      return []
    }

    _response.payload = extractList(data) as EmailIngestMailbox[]
  } catch (e: any) {
    console.error(e)
    _response.error =
      e?.response?.data?.error ||
      e?.response?.data?.message ||
      e?.message ||
      'error fetching mailboxes'
  }

  return _response
}

export const createMailbox = async (payload: EmailIngestMailboxPayload) => {
  const _response = {
    error: '',
    payload: null as EmailIngestMailbox | null,
  }

  try {
    const tenantId = getTenantId()
    const body = {
      isEnabled: true,
      masterSource: 'InternalForm',
      pollIntervalMinutes: 0,
      ...payload,
    }

    const response = await axiosV6.post('/email-ingest/mailboxes', body, {
      headers: {
        'X-Tenant-Id': tenantId,
      },
    })
    const { data, status } = response

    if (status !== 200 && status !== 201) {
      throw new Error('invalid status code')
    }

    const item = data?.data && typeof data.data === 'object' ? data.data : data
    _response.payload = item as EmailIngestMailbox
  } catch (e: any) {
    console.error(e)
    _response.error =
      e?.response?.data?.error ||
      e?.response?.data?.message ||
      e?.message ||
      'error creating mailbox'
  }

  return _response
}

export const updateMailbox = async (
  id: string,
  payload: EmailIngestMailboxPayload,
) => {
  const _response = {
    error: '',
    payload: null as EmailIngestMailbox | null,
  }

  try {
    const tenantId = getTenantId()
    const body = {
      isEnabled: true,
      masterSource: 'InternalForm',
      pollIntervalMinutes: 0,
      ...payload,
    }

    const response = await axiosV6.put(`/email-ingest/mailboxes/${id}`, body, {
      headers: {
        'X-Tenant-Id': tenantId,
      },
    })
    const { data, status } = response

    if (status !== 200) {
      throw new Error('invalid status code')
    }

    const item = data?.data && typeof data.data === 'object' ? data.data : data
    _response.payload = item as EmailIngestMailbox
  } catch (e: any) {
    console.error(e)
    _response.error =
      e?.response?.data?.error ||
      e?.response?.data?.message ||
      e?.message ||
      'error updating mailbox'
  }

  return _response
}

export const pollMailbox = async (id: string) => {
  const _response = {
    error: '',
    payload: null as PollMailboxResponse | null,
  }

  try {
    const tenantId = getTenantId()
    const response = await axiosV6.post(
      `/email-ingest/mailboxes/${id}/poll`,
      {},
      {
        headers: {
          'X-Tenant-Id': tenantId,
        },
      },
    )
    const { data, status } = response

    if (status !== 200) {
      throw new Error('invalid status code')
    }

    const item = data?.data && typeof data.data === 'object' ? data.data : data
    _response.payload = item as PollMailboxResponse
  } catch (e: any) {
    console.error(e)
    _response.error =
      e?.response?.data?.error ||
      e?.response?.data?.message ||
      e?.message ||
      'error polling mailbox'
  }

  return _response
}

/**
 * Reuses an existing mailbox for this connectorId if one exists,
 * otherwise creates a new mailbox linked to the specified workflowId.
 */
export const syncMailboxForWorkflow = async (params: {
  connectorId: string
  workflowId: string
  isEnabled?: boolean
  pollIntervalMinutes?: number
  masterSource?: string
}) => {
  const { connectorId, workflowId } = params
  if (!connectorId || !workflowId) {
    return {
      error: 'connectorId and workflowId are required to sync mailbox',
      payload: null as EmailIngestMailbox | null,
    }
  }

  const existingRes = await getMailboxes()
  const list = existingRes.payload || []
  const match = list.find(
    (m) =>
      String(m.connectorId).toLowerCase() ===
      String(connectorId).toLowerCase(),
  )

  const payload: EmailIngestMailboxPayload = {
    connectorId,
    isEnabled: params.isEnabled ?? true,
    masterSource: params.masterSource || 'InternalForm',
    pollIntervalMinutes: params.pollIntervalMinutes ?? 0,
    workflowId,
  }

  if (match?.id) {
    return await updateMailbox(match.id, payload)
  }

  return await createMailbox(payload)
}

export const emailIngestApi = {
  createMailbox,
  getMailboxes,
  pollMailbox,
  syncMailboxForWorkflow,
  updateMailbox,
}

export default emailIngestApi
