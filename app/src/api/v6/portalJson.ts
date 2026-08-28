import authUserStore from '../../stores/authUserStore'
import { axiosV6 } from '../axios'
import { getV6ApiErrorMessage } from './auth'

export type PortalJsonIds = {
  tenantId?: string
  userId?: string
}

export type PortalJsonRecord = {
  portalJson: string
  tenantId?: string
  userId?: string
}

const PORTAL_JSON_URL = '/portal-json'

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null

export const resolvePortalJsonIds = (explicit?: PortalJsonIds) => {
  const store = authUserStore.getState()
  return {
    tenantId:
      explicit?.tenantId ||
      store.session?.tenantId ||
      store.identity?.tenantId ||
      '',
    userId: explicit?.userId || store.session?.id || '',
  }
}

const tenantHeaders = (tenantId?: string) =>
  tenantId ? { 'X-Tenant-Id': tenantId } : undefined

export const unwrapPortalJsonString = (data: unknown): string => {
  if (data == null || data === '') return ''
  if (typeof data === 'string') return data
  if (Array.isArray(data)) return JSON.stringify(data)

  const record = asRecord(data)
  if (!record) return ''

  const nested = record.data ?? record.result ?? record.payload ?? record.value
  if (nested && nested !== record) {
    const inner = unwrapPortalJsonString(nested)
    if (inner) return inner
  }

  if (typeof record.portalJson === 'string') return record.portalJson
  if (record.portalJson != null) {
    return typeof record.portalJson === 'object'
      ? JSON.stringify(record.portalJson)
      : String(record.portalJson)
  }

  return ''
}

export const getPortalJson = async (explicit?: PortalJsonIds) => {
  const response: {
    data: PortalJsonRecord | null
    error: string
    notFound: boolean
  } = {
    data: null,
    error: '',
    notFound: false,
  }

  try {
    const ids = resolvePortalJsonIds(explicit)
    if (!ids.tenantId || !ids.userId) {
      response.error = 'Missing tenant or user for portal JSON'
      return response
    }

    const { data, status } = await axiosV6({
      headers: tenantHeaders(ids.tenantId),
      method: 'GET',
      params: {
        tenantId: ids.tenantId,
        userId: ids.userId,
      },
      skipCancellation: true,
      url: PORTAL_JSON_URL,
    })

    if (status === 404) {
      response.notFound = true
      return response
    }

    if (status !== 200 && status !== 201) {
      throw new Error('invalid status code')
    }

    response.data = {
      portalJson: unwrapPortalJsonString(data),
      tenantId: ids.tenantId,
      userId: ids.userId,
    }
  } catch (error: unknown) {
    const err = error as { response?: { data?: unknown; status?: number } }
    if (err?.response?.status === 404) {
      response.notFound = true
      return response
    }
    console.error(error)
    response.error = getV6ApiErrorMessage(
      err?.response?.data,
      'Failed to load portal JSON',
    )
  }

  return response
}

const savePortalJson = async (
  method: 'POST' | 'PUT',
  portalJson: string,
  explicit?: PortalJsonIds,
) => {
  const response: { data: PortalJsonRecord | null; error: string } = {
    data: null,
    error: '',
  }

  try {
    const ids = resolvePortalJsonIds(explicit)
    if (!ids.tenantId || !ids.userId) {
      response.error = 'Missing tenant or user for portal JSON'
      return response
    }

    const { data, status } = await axiosV6({
      data: {
        portalJson,
        tenantId: ids.tenantId,
        userId: ids.userId,
      },
      headers: tenantHeaders(ids.tenantId),
      method,
      skipCancellation: true,
      url: PORTAL_JSON_URL,
    })

    if (status !== 200 && status !== 201) {
      throw new Error('invalid status code')
    }

    response.data = {
      portalJson: unwrapPortalJsonString(data) || portalJson,
      tenantId: ids.tenantId,
      userId: ids.userId,
    }
  } catch (error: unknown) {
    const err = error as { response?: { data?: unknown } }
    console.error(error)
    response.error = getV6ApiErrorMessage(
      err?.response?.data,
      method === 'POST'
        ? 'Failed to create portal JSON'
        : 'Failed to update portal JSON',
    )
  }

  return response
}

export const createPortalJson = (
  portalJson: string,
  explicit?: PortalJsonIds,
) => savePortalJson('POST', portalJson, explicit)

export const updatePortalJson = (
  portalJson: string,
  explicit?: PortalJsonIds,
) => savePortalJson('PUT', portalJson, explicit)
