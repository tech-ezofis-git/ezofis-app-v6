import authUserStore from '../../stores/authUserStore'
import { setToLocalStorage } from '../../utils/local-storage'
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

export const login = async (payload: {
  email: string
  password: string
  tenantId: string
}) => {
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
      url: `/auth/ezofis/login`,
    })

    if (status !== 200) throw new Error('invalid status code')

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
      'Invalid email or password.',
    )
  }
  return response
}

export const getSession = async () => {
  const response: any = { data: null, error: '' }
  try {
    const { data, status } = await axiosV6({
      method: 'GET',
      url: `/userSession`,
    })
    if (status !== 200) throw new Error('invalid status code')

    if (data) {
      setToLocalStorage(data, 'session')
      const { setSession } = authUserStore.getState()
      setSession(data)
      response.data = data
    }
  } catch (e: any) {
    console.error(e)
    response.error = getV6ApiErrorMessage(
      e?.response?.data,
      'error fetching session',
    )
  }
  return response
}

export const socialLogin = async (payload: {
  email: string
  provider: string
  tenantId: string
}) => {
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
      url: `/auth/social/login`,
    })

    if (status !== 200) throw new Error('invalid status code')

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
  getSharePreview,
  getTenants,
  setSharePassword,
}

export default authApiV6
