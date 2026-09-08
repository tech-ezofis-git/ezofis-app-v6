import authUserStore from '../../stores/authUserStore'
import {
  getFromLocalStorage,
  setToLocalStorage,
} from '../../utils/local-storage'
import { axiosV6 } from '../axios'

export const getV6ApiErrorMessage = (
  data: unknown,
  fallback: string,
): string => {
  if (!data) return fallback
  if (typeof data === 'string') return data
  if (typeof data === 'object' && data !== null) {
    const record = data as Record<string, unknown>
    if (typeof record.error === 'string') return record.error
    if (typeof record.message === 'string') return record.message
    if (typeof record.title === 'string') return record.title
  }
  return fallback
}

/** One successful /userSession per page load (sign-in or browser refresh). */
let hasFetchedUserSession = false
let inFlightUserSession: Promise<{ data: any; error: string }> | null = null

const USER_SESSION_REDIRECT_FLAG = 'ezofis.userSessionFetched'

/** Clear the once-per-pageload gate (call on logout). */
export const resetUserSessionFetchGate = () => {
  hasFetchedUserSession = false
  inFlightUserSession = null
  try {
    globalThis.sessionStorage?.removeItem(USER_SESSION_REDIRECT_FLAG)
  } catch {
    // ignore
  }
}

/**
 * Keep the "already fetched" gate across a hard redirect after sign-in
 * so AppLayout does not call /userSession again on the next page load.
 */
export const markUserSessionFetchedForRedirect = () => {
  hasFetchedUserSession = true
  try {
    globalThis.sessionStorage?.setItem(USER_SESSION_REDIRECT_FLAG, '1')
  } catch {
    // ignore
  }
}

// The JSON structure required by V6 Signup
export interface V6SignupPayload {
  name: string
  appVersion?: string
  databaseName?: string | null
  email?: string
  firstName?: string
  lastName?: string
  licenseType?: number
  loginType?: string
  organizationName?: string
  password?: string
  platform?: string
  signupSource?: string
  tenantId?: string | null
}

const signUp = async (payload: V6SignupPayload) => {
  const response: any = {
    data: '',
    error: '',
  }

  try {
    const { data, status } = await axiosV6({
      data: JSON.stringify(payload),
      method: 'POST',
      url: `/Signup`,
    })

    if (status !== 201 && status !== 200) {
      throw new Error('invalid status code')
    }

    if (data) {
      // Assuming V6 returns unencrypted identity info directly
      setToLocalStorage(data, 'identity')
      const { setIdentity } = authUserStore.getState()
      setIdentity(data)
      response.data = 'Success'
    } else {
      response.error = 'No data returned'
    }
  } catch (e: any) {
    console.error(e)
    response.error = getV6ApiErrorMessage(e?.response?.data, 'error in sign up')
  }

  return response
}

export const sendMailOTP = async (payload: {
  email: string
  requiredOTP?: boolean
}) => {
  const response: any = { data: '', error: '' }
  try {
    const { data, status } = await axiosV6({
      data: JSON.stringify(payload),
      method: 'POST',
      url: `/tenant/checkAuthenticate`,
    })
    if (status !== 201 && status !== 200 && status !== 400)
      throw new Error('invalid status code')
    if (data === 'OTP sent succeeded' || data === 'success') {
      response.data = 'success'
      response.status = status
    } else {
      response.error = 'error in verify mail'
    }
  } catch (e: any) {
    console.error(e)
    response.error = getV6ApiErrorMessage(
      e?.response?.data,
      'error in verify mail',
    )
    response.status = e?.response?.status
  }
  return response
}

export const verifyMailOTP = async (payload: {
  email: string
  otp: string
}) => {
  const response: any = { data: '', error: '' }
  try {
    const { data, status } = await axiosV6({
      data: JSON.stringify(payload),
      method: 'POST',
      url: `/tenant/validateOTP`,
    })
    if (status !== 201 && status !== 200) throw new Error('invalid status code')
    if (data === 'success') {
      response.data = 'Success'
    } else {
      response.error = 'error in verify mail'
    }
  } catch (e: any) {
    console.error(e)
    response.error = getV6ApiErrorMessage(
      e?.response?.data,
      'error in verify mail',
    )
  }
  return response
}

export const getTenants = async (email: string) => {
  const response: any = { data: null, error: '' }
  try {
    const { data, status } = await axiosV6({
      method: 'GET',
      skipAuthToken: true,
      url: `/auth/tenants?email=${encodeURIComponent(email)}`,
    })
    if (status !== 200) throw new Error('invalid status code')
    response.data = data
  } catch (e: any) {
    console.error(e)
    response.error = getV6ApiErrorMessage(
      e?.response?.data,
      'error fetching tenants',
    )
  }
  return response
}

export const login = async (
  payload: {
    email: string
    password: string
    tenantId: string
  },
  options?: { persistIdentity?: boolean },
) => {
  const response: any = { data: null, error: '' }
  try {
    const { data, status } = await axiosV6({
      data: JSON.stringify({
        email: payload.email,
        password: payload.password,
      }),
      headers: {
        'X-Tenant-Id': payload.tenantId,
      },
      method: 'POST',
      skipAuthToken: true,
      url: `/auth/ezofis/login`,
    })

    if (status !== 200) throw new Error('invalid status code')

    if (data) {
      const identityWithTenant = {
        ...data,
        tenantId: payload.tenantId,
      }
      if (options?.persistIdentity === false) {
        response.data = identityWithTenant
      } else {
        setToLocalStorage(identityWithTenant, 'identity')
        setToLocalStorage(String(payload.tenantId), 'tenantId', 'STRING')
        const { setIdentity } = authUserStore.getState()
        setIdentity(identityWithTenant)
        response.data = 'Success'
      }
    } else {
      response.error = 'No data returned'
    }
  } catch (e: any) {
    console.error(e)
    response.error = getV6ApiErrorMessage(
      e?.response?.data,
      'Invalid email or password.',
    )
  }
  return response
}

export const getSession = async (options?: { force?: boolean }) => {
  const force = Boolean(options?.force)

  // After sign-in (or a prior call this page load), reuse cached session — no extra API hit.
  if (!force && hasFetchedUserSession) {
    return {
      data: authUserStore.getState().session,
      error: '',
    }
  }

  // Hard redirect after login sets this so the next page load skips a duplicate fetch.
  if (!force) {
    try {
      if (globalThis.sessionStorage?.getItem(USER_SESSION_REDIRECT_FLAG) === '1') {
        globalThis.sessionStorage.removeItem(USER_SESSION_REDIRECT_FLAG)
        hasFetchedUserSession = true
        return {
          data: authUserStore.getState().session,
          error: '',
        }
      }
    } catch {
      // ignore
    }
  }

  // Deduplicate concurrent callers (Strict Mode / sign-in + AppLayout race).
  if (inFlightUserSession) {
    return inFlightUserSession
  }

  inFlightUserSession = (async () => {
    const response: { data: any; error: string } = { data: null, error: '' }
    try {
      const { data, status } = await axiosV6({
        method: 'GET',
        url: `/userSession`,
      })
      if (status !== 200) throw new Error('invalid status code')

      if (data) {
        const store = authUserStore.getState()
        const fallbackTenantId =
          (store.identity as any)?.tenantId ||
          (getFromLocalStorage('tenantId', 'STRING') as string) ||
          ''
        const sessionData = {
          ...data,
          tenantId: data.tenantId || fallbackTenantId || data.TenantId || '',
        }
        setToLocalStorage(sessionData, 'session')
        if (sessionData.tenantId) {
          setToLocalStorage(String(sessionData.tenantId), 'tenantId', 'STRING')
        }
        const { setSession } = authUserStore.getState()
        setSession(sessionData)
        response.data = sessionData
      }
      hasFetchedUserSession = true
    } catch (e: any) {
      console.error(e)
      response.error = getV6ApiErrorMessage(
        e?.response?.data,
        'error fetching session',
      )
    } finally {
      inFlightUserSession = null
    }
    return response
  })()

  return inFlightUserSession
}

/** Always re-fetch /userSession (e.g. after role permission changes). */
export const refreshUserSession = () => getSession({ force: true })


export const socialLogin = async (
  payload: {
    email: string
    provider: string
    tenantId: string
  },
  options?: { persistIdentity?: boolean },
) => {
  const response: any = { data: null, error: '' }
  try {
    const { data, status } = await axiosV6({
      data: JSON.stringify({
        email: payload.email,
        provider: payload.provider,
      }),
      headers: {
        'X-Tenant-Id': payload.tenantId,
      },
      method: 'POST',
      skipAuthToken: true,
      url: `/auth/social/login`,
    })

    if (status !== 200) throw new Error('invalid status code')

    if (data) {
      const identityWithTenant = {
        ...data,
        tenantId: payload.tenantId,
      }
      if (options?.persistIdentity === false) {
        response.data = identityWithTenant
      } else {
        setToLocalStorage(identityWithTenant, 'identity')
        setToLocalStorage(String(payload.tenantId), 'tenantId', 'STRING')
        const { setIdentity } = authUserStore.getState()
        setIdentity(identityWithTenant)
        response.data = 'Success'
      }
    } else {
      response.error = 'No data returned'
    }
  } catch (e: any) {
    console.error(e)
    response.error = getV6ApiErrorMessage(
      e?.response?.data,
      'error in social login',
    )
  }
  return response
}

export const getSharePreview = async (shareToken: string) => {
  const response: any = { data: null, error: '' }
  try {
    const { data, status } = await axiosV6({
      method: 'GET',
      url: `/repositories/share/${shareToken}/preview`,
    })
    if (status !== 200) throw new Error('invalid status code')
    response.data = data
  } catch (e: any) {
    console.error(e)
    response.error = getV6ApiErrorMessage(
      e?.response?.data,
      'error fetching share preview',
    )
  }
  return response
}

export const setSharePassword = async (payload: {
  email: string
  password: string
  shareToken: string
  tenantId?: string
}) => {
  const response: any = { data: null, error: '' }
  try {
    const { data, status } = await axiosV6({
      data: JSON.stringify({
        email: payload.email,
        password: payload.password,
        shareToken: payload.shareToken,
      }),
      headers: payload.tenantId
        ? { 'X-Tenant-Id': payload.tenantId }
        : undefined,
      method: 'POST',
      url: `/auth/share/set-password`,
    })

    if (status !== 200 && status !== 201) throw new Error('invalid status code')

    if (data) {
      setToLocalStorage(data, 'identity')
      const { setIdentity } = authUserStore.getState()
      setIdentity(data)
      response.data = 'Success'
    } else {
      response.error = 'No data returned'
    }
  } catch (e: any) {
    console.error(e)
    response.error = getV6ApiErrorMessage(
      e?.response?.data,
      'Failed to set password',
    )
  }
  return response
}

export const shareSocialLogin = async (payload: {
  email: string
  provider: string
  shareToken: string
  tenantId?: string
}) => {
  const response: any = { data: null, error: '' }
  try {
    const { data, status } = await axiosV6({
      data: JSON.stringify({
        email: payload.email,
        provider: payload.provider,
        shareToken: payload.shareToken,
      }),
      headers: payload.tenantId
        ? { 'X-Tenant-Id': payload.tenantId }
        : undefined,
      method: 'POST',
      url: `/auth/share/social-login`,
    })

    if (status !== 200 && status !== 201) throw new Error('invalid status code')

    if (data) {
      setToLocalStorage(data, 'identity')
      const { setIdentity } = authUserStore.getState()
      setIdentity(data)
      response.data = 'Success'
    } else {
      response.error = 'No data returned'
    }
  } catch (e: any) {
    console.error(e)
    response.error = getV6ApiErrorMessage(
      e?.response?.data,
      'error in social login',
    )
  }
  return response
}

export const emailValidate = async (
  tenantId: number | string,
  payload: any,
) => {
  const response: any = { data: '', error: '' }
  try {
    const { data, status } = await axiosV6({
      data: JSON.stringify(payload),
      method: 'POST',
      url: `/activeDirectory/verifyUser/${tenantId}`,
    })
    if (status !== 200) throw new Error('invalid status code')
    response.data = data
  } catch (e: any) {
    console.error(e)
    response.error = 'error logging in'
    if (e?.response?.status === 404) {
      response.error = 'user account not found'
    } else {
      response.error = getV6ApiErrorMessage(
        e?.response?.data,
        'error logging in',
      )
    }
  }
  return response
}

export const authApiV6 = {
  emailValidate,
  login,
  sendMailOTP,
  shareSocialLogin,
  signUp,
  socialLogin,
  verifyMailOTP,
  getSession,
  refreshUserSession,
  getSharePreview,
  getTenants,
  setSharePassword,
  resetUserSessionFetchGate,
  markUserSessionFetchedForRedirect,
}

export default authApiV6
