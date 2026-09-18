import axios from 'axios'
import { getV5ApiBaseUrl } from '@/lib/classic-gateway'

const getClient = () =>
  axios.create({
    baseURL: getV5ApiBaseUrl(),
    headers: { 'Content-Type': 'application/json' },
    timeout: 4000,
  })

const decodeBase64Json = (data: unknown) => {
  if (typeof data !== 'string' || !data) return null
  try {
    const json = atob(data)
    return JSON.parse(json) as unknown
  } catch {
    return null
  }
}

const asErrorMessage = (data: unknown, fallback: string) => {
  if (typeof data === 'string' && data.trim()) return data
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>
    if (typeof record.error === 'string') return record.error
    if (typeof record.message === 'string') return record.message
  }
  return fallback
}

export type ClassicLoginResult = {
  data: unknown
  error: string
  mfa: boolean
  status: number
}

export const loginClassic = async (
  payload: { email: string; password: string },
  tenantId?: number | string,
): Promise<ClassicLoginResult> => {
  const response: ClassicLoginResult = {
    data: null,
    error: '',
    mfa: false,
    status: 0,
  }

  try {
    const { data, status } = await getClient()({
      data: JSON.stringify({
        email: payload.email,
        loggedFrom: 'WEB',
        password: payload.password,
      }),
      headers: {
        Token: tenantId ? `tenantId ${tenantId}` : `email ${payload.email}`,
      },
      method: 'POST',
      url: '/authentication/login',
    })

    response.status = status

    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const record = data as { mfa?: number }
      if (record.mfa === 1 || record.mfa === 2 || record.mfa === 3) {
        response.mfa = true
        response.data = data
        return response
      }
    }

    const identity = decodeBase64Json(data)
    if (!identity) {
      response.error = 'error logging in'
      return response
    }

    response.data = identity
  } catch (e) {
    const status = axios.isAxiosError(e) ? e.response?.status : 0
    response.status = status || 0

    if (status === 300 && axios.isAxiosError(e)) {
      response.data = e.response?.data
      return response
    }

    response.error = asErrorMessage(
      axios.isAxiosError(e) ? e.response?.data : undefined,
      status === 404 ? 'user account not found' : 'error logging in',
    )
  }

  return response
}

export const socialLoginClassic = async (
  payload: { email: string; loginType: string },
  tenantId?: number | string,
): Promise<ClassicLoginResult> => {
  const response: ClassicLoginResult = {
    data: null,
    error: '',
    mfa: false,
    status: 0,
  }

  try {
    const { data, status } = await getClient()({
      data: JSON.stringify({
        email: payload.email,
        loggedFrom: 'WEB',
        loginType: payload.loginType,
      }),
      headers: {
        Token: tenantId ? `tenantId ${tenantId}` : `email ${payload.email}`,
      },
      method: 'POST',
      url: '/authentication/socialLogin',
    })

    response.status = status

    const identity = decodeBase64Json(data)
    if (!identity) {
      response.error = 'error logging in'
      return response
    }

    response.data = identity
  } catch (e) {
    const status = axios.isAxiosError(e) ? e.response?.status : 0
    response.status = status || 0

    if (status === 300 && axios.isAxiosError(e)) {
      response.data = e.response?.data
      return response
    }

    response.error = asErrorMessage(
      axios.isAxiosError(e) ? e.response?.data : undefined,
      status === 404 ? 'user account not found' : 'error logging in',
    )
  }

  return response
}
