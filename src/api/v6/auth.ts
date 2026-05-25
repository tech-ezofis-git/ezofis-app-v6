import authUserStore from '../../stores/authUserStore'
import { setToLocalStorage } from '../../utils/local-storage'
import { axiosV6 } from '../axios'

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
      throw 'invalid status code'
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
    response.error = e?.response?.data || 'error in sign up'
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
      throw 'invalid status code'
    if (data === 'OTP sent succeeded' || data === 'success') {
      response.data = 'success'
      response.status = status
    } else {
      response.error = 'error in verify mail'
    }
  } catch (e: any) {
    console.error(e)
    response.error = e?.response?.data || 'error in verify mail'
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
    if (status !== 201 && status !== 200) throw 'invalid status code'
    if (data === 'success') {
      response.data = 'Success'
    } else {
      response.error = 'error in verify mail'
    }
  } catch (e: any) {
    console.error(e)
    response.error = e?.response?.data || 'error in verify mail'
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
    if (status !== 200) throw 'invalid status code'
    response.data = data
  } catch (e: any) {
    console.error(e)
    response.error = e?.response?.data || 'error fetching tenants'
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

    if (status !== 200) throw 'invalid status code'

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
    response.error = e?.response?.data || 'error in login'
  }
  return response
}

export const authApiV6 = {
  login,
  sendMailOTP,
  signUp,
  verifyMailOTP,
  getTenants,
}

export default authApiV6
