import axios from 'axios'

const V5_API_URL = import.meta.env.VITE_V5_API_URL || 'https://api.ezofis.com/api'

export interface V5Identity {
  iv: string
  key: string
  language?: string
  token: string
  twoFactorAuthentication?: boolean
  [key: string]: unknown
}

export interface V5LoginPayload {
  email: string
  loggedFrom: string
  password: string
}

export const decodeBase64Json = <T = unknown>(data: string): T | null => {
  try {
    const jsonStr = atob(data)
    return JSON.parse(jsonStr) as T
  } catch (err) {
    console.error('Failed to decode Base64 JSON from V5 API:', err)
    return null
  }
}

export interface V5LoginResponse {
  data?: V5Identity | null
  error?: string
  rawTokenData?: string
  status?: number
  tenants?: Array<{ id: number | string; name: string; email: string }>
}

/**
 * Executes V5 Authentication Login Request
 */
export const loginV5 = async (
  payload: V5LoginPayload,
  tenantId?: number | string,
): Promise<V5LoginResponse> => {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Token: tenantId ? `tenantId ${tenantId}` : `email ${payload.email}`,
    }

    const response = await axios.post(
      `${V5_API_URL}/authentication/login`,
      payload,
      { headers, validateStatus: () => true },
    )

    if (response.status === 200 && typeof response.data === 'string') {
      const decoded = decodeBase64Json<V5Identity>(response.data)
      if (decoded && decoded.token) {
        return {
          data: decoded,
          rawTokenData: response.data,
          status: 200,
        }
      }
      return { error: 'Invalid V5 identity payload received', status: response.status }
    }

    if (response.status === 300 && Array.isArray(response.data)) {
      return {
        data: null,
        status: 300,
        tenants: response.data.map((t: any) => ({
          email: t.email || payload.email,
          id: t.id,
          name: t.name || t.tenantName || `Tenant ${t.id}`,
        })),
      }
    }

    if (response.status === 404) {
      return { error: 'User account not found in V5', status: 404 }
    }

    const errorMsg =
      typeof response.data === 'string'
        ? response.data
        : response.data?.message || response.data?.error || 'V5 authentication failed'

    return { error: errorMsg, status: response.status }
  } catch (e: any) {
    console.error('V5 login API error:', e)
    return { error: e?.message || 'Unable to connect to V5 Auth API', status: 500 }
  }
}

/**
 * Fetches V5 User Session details using decoded identity tokens
 */
export const getUserSessionV5 = async (
  identity: V5Identity,
): Promise<{ data?: any; error?: string }> => {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Token: identity.token,
      key: identity.key,
      iv: identity.iv,
    }

    const response = await axios.post(
      `${V5_API_URL}/authentication/userSession`,
      {},
      { headers, validateStatus: () => true },
    )

    if (response.status === 200 && response.data) {
      return { data: response.data }
    }

    return { error: 'Failed to retrieve V5 user session' }
  } catch (e: any) {
    console.error('V5 userSession error:', e)
    return { error: e?.message || 'Error fetching V5 user session' }
  }
}

export default {
  decodeBase64Json,
  getUserSessionV5,
  loginV5,
}
