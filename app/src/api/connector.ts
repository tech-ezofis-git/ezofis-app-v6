import authUserStore from '../stores/authUserStore'
import { axiosV6 } from './axios'

export interface ConnectorPayload {
  filterBy: {
    filters: {
      condition: string
      criteria: string
      value: string
    }[]
    groupCondition: string
  }[]
  mode: string
}

/** Compares connector codes ignoring case and separators (ONE_DRIVE === onedrive) */
const normalizeConnectorCode = (value: unknown) =>
  String(value ?? '')
    .toUpperCase()
    .replace(/[\s_-]+/g, '')

export const getConnection = async (payload: ConnectorPayload) => {
  const _response = {
    error: '',
    payload: [] as any[],
  }

  try {
    const store = authUserStore.getState()
    const tenantId = store.session?.tenantId || ''

    const response = await axiosV6.get('/connector/all', {
      headers: {
        'X-Tenant-Id': tenantId,
      },
    })
    const { data, status } = response

    if (status !== 200) {
      throw new Error('invalid status code')
    }

    // Safely extract list from the response
    const extractData = (obj: any): any[] => {
      if (!obj) return []
      if (Array.isArray(obj)) return obj
      const inner = obj.data || obj.value || obj.items
      if (Array.isArray(inner)) return inner
      if (typeof obj === 'object') {
        for (const key in obj) {
          if (Array.isArray(obj[key])) return obj[key]
        }
      }
      return []
    }

    const allConnectors = typeof data === 'string' ? JSON.parse(data) : data
    const list = extractData(allConnectors)

    const normalized = list.map((item: any) => ({
      ...item,
      id: item.id ?? item.Id ?? item.connectorId ?? item.value,
      name:
        item.name ??
        item.Name ??
        item.connectorName ??
        item.externalAccountEmail ??
        '',
    }))

    // Apply client-side filtering based on payload criteria
    const connectorType = payload.filterBy?.[0]?.filters?.find(
      (f) => f.criteria === 'connectorType',
    )?.value
    const expectedCode = normalizeConnectorCode(connectorType)

    _response.payload = expectedCode
      ? normalized.filter((item: any) =>
          [
            item.providerCode,
            item.ProviderCode,
            item.connectorType,
            item.ConnectorType,
            item.provider,
            item.type,
          ].some((code) => {
            const norm = normalizeConnectorCode(code)
            if (!norm) return false
            if (norm === expectedCode) return true
            if (
              (expectedCode === 'SAP' || expectedCode === 'SAPXSUAA') &&
              (norm === 'SAP' || norm === 'SAPXSUAA')
            ) {
              return true
            }
            return false
          }),
        )
      : normalized
  } catch (e: any) {
    console.error(e)
    _response.error = 'error fetching connection'
  }

  return _response
}

export const addConnector = async (payload: any) => {
  const _response = {
    error: '',
    payload: '' as any,
  }

  try {
    const store = authUserStore.getState()
    const tenantId = store.session?.tenantId || ''

    const response = await axiosV6.post('/connector', payload, {
      headers: {
        'X-Tenant-Id': tenantId,
      },
    })
    const { data, status } = response

    if (status !== 201 && status !== 200) {
      throw new Error('invalid status code')
    }

    _response.payload = data
  } catch (e: any) {
    console.error(e)
    _response.error = 'error adding connection'
  }

  return _response
}

export type OAuthProviderCode =
  | 'GMAIL'
  | 'OUTLOOK'
  | 'QUICKBOOKS'
  | 'GOOGLE_DRIVE'
  | 'GCP'
  | 'ONEDRIVE'
  | 'SAP'
  | 'SAP_XSUAA'

export interface AuthorizeOAuthPayload {
  name: string
  providerCode: OAuthProviderCode
  successRedirectUrl: string
}

const extractAuthorizeUrl = (data: unknown): string => {
  if (typeof data === 'string' && data.startsWith('http')) return data
  if (!data || typeof data !== 'object') return ''

  const obj = data as Record<string, unknown>
  const candidates = [
    obj.authorizationUrl,
    obj.authorizeUrl,
    obj.authUrl,
    obj.url,
    obj.redirectUrl,
    obj.value,
  ]

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.startsWith('http')) {
      return candidate
    }
  }

  if (obj.data !== undefined) {
    return extractAuthorizeUrl(obj.data)
  }

  return ''
}

export const authorizeOAuth = async (payload: AuthorizeOAuthPayload) => {
  const _response = {
    error: '',
    payload: '' as string,
  }

  try {
    const store = authUserStore.getState()
    const tenantId = store.session?.tenantId || ''

    const response = await axiosV6.post(
      '/connector/oauth/authorize',
      payload,
      {
        headers: {
          'X-Tenant-Id': tenantId,
        },
      },
    )
    const { data, status } = response

    if (status !== 200 && status !== 201) {
      throw new Error('invalid status code')
    }

    const authorizeUrl = extractAuthorizeUrl(data)
    if (!authorizeUrl) {
      throw new Error('authorize url missing in response')
    }

    _response.payload = authorizeUrl
  } catch (e: any) {
    console.error(e)
    _response.error =
      e?.response?.data?.message ||
      e?.message ||
      'error authorizing oauth connector'
  }

  return _response
}

export interface ConnectorDetails {
  createdAtUtc?: string
  createdBy?: string
  createdByEmail?: string
  externalAccountEmail?: string | null
  id: string
  isDefault?: boolean
  isDeleted?: boolean
  modifiedAtUtc?: string
  modifiedBy?: string | null
  modifiedByEmail?: string
  name?: string
  oAuthStatus?: string
  providerCode?: string
  tenantId?: string
  tokenExpiresAtUtc?: string
}

export const getConnectorById = async (connectorId: string) => {
  const _response = {
    error: '',
    payload: null as ConnectorDetails | null,
  }

  try {
    const store = authUserStore.getState()
    const tenantId = store.session?.tenantId || ''

    const response = await axiosV6.get(`/connector/${connectorId}`, {
      headers: {
        'X-Tenant-Id': tenantId,
      },
    })
    const { data, status } = response

    if (status !== 200) {
      throw new Error('invalid status code')
    }

    const details =
      data?.data && typeof data.data === 'object' ? data.data : data

    if (!details?.id) {
      throw new Error('connector details missing')
    }

    _response.payload = details as ConnectorDetails
  } catch (e: any) {
    console.error(e)
    _response.error =
      e?.response?.data?.message ||
      e?.message ||
      'error fetching connector details'
  }

  return _response
}

export const connectorApi = {
  addConnector,
  authorizeOAuth,
  getConnection,
  getConnectorById,
}

export default connectorApi
