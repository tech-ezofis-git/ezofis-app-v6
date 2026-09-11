import apiRouter from './apiRouter'
import { getUserSessionV5, loginV5, type V5Identity } from './v5Auth'

export interface DualAuthResult {
  v5: {
    data?: V5Identity | null
    error?: string
    identity?: V5Identity
    session?: any
    status?: number
    success: boolean
    tenants?: any[]
  }
  v6: {
    data?: any
    error?: string
    status?: number
    success: boolean
    tenants?: any[]
  }
}

/**
 * Checks domain eligibility for Dual V5/V6 Authentication
 */
export const isDualAuthEnabledDomain = (): boolean => {
  if (import.meta.env.VITE_ENABLE_DUAL_AUTH === 'true') {
    return true
  }

  const origin =
    globalThis.window === undefined ? '' : globalThis.location.origin

  // Dual auth runs on cloud.ezofis.com, app.ezofis.com, or localhost during development
  return (
    origin === 'https://cloud.ezofis.com' ||
    origin === 'https://app.ezofis.com' ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1')
  )
}

/**
 * Verifies user credentials against both V6 API and V5 API concurrently
 */
export const verifyDualAuth = async (
  payload: { email: string; password: string; loggedFrom?: string },
  tenantId?: number | string,
): Promise<DualAuthResult> => {
  const loginPayload = {
    email: payload.email,
    loggedFrom: payload.loggedFrom || 'WEB',
    password: payload.password,
  }

  // Execute both authentication calls in parallel
  const [v6Result, v5Result] = await Promise.allSettled([
    apiRouter.login(loginPayload, tenantId, { persistIdentity: false }),
    loginV5(loginPayload, tenantId),
  ])

  const result: DualAuthResult = {
    v5: { success: false },
    v6: { success: false },
  }

  // Evaluate V6 Auth
  if (v6Result.status === 'fulfilled') {
    const res = v6Result.value
    if (!res.error && res.data && res.status !== 300) {
      result.v6 = {
        data: res.data,
        status: res.status,
        success: true,
      }
    } else {
      result.v6 = {
        data: res.data,
        error: res.error,
        status: res.status,
        success: false,
        tenants: res.status === 300 && Array.isArray(res.data) ? res.data : undefined,
      }
    }
  }

  // Evaluate V5 Auth
  if (v5Result.status === 'fulfilled') {
    const res = v5Result.value
    if (res.status === 200 && res.data) {
      const identity = {
        ...res.data,
        rawTokenData: res.rawTokenData,
      }
      // Retrieve V5 User Session details
      const sessionRes = await getUserSessionV5(res.data)

      result.v5 = {
        data: identity,
        identity,
        session: sessionRes.data || null,
        status: 200,
        success: true,
      }
    } else {
      result.v5 = {
        error: res.error,
        status: res.status,
        success: false,
        tenants: res.tenants,
      }
    }
  }

  return result
}

export default {
  isDualAuthEnabledDomain,
  verifyDualAuth,
}
