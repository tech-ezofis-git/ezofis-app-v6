import axios from 'axios'
import { getV5ApiBaseUrl } from '@/lib/classic-gateway'

const getClient = () =>
  axios.create({
    baseURL: getV5ApiBaseUrl(),
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000,
  })

const decodeBase64Json = (data: unknown) => {
  if (typeof data !== 'string' || !data) return null
  try {
    return JSON.parse(atob(data)) as unknown
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

export type ClassicPortalInfo = {
  description: string
  name: string
  settings: Record<string, unknown>
}

export type ClassicPortalAuthPayload = {
  email: string
  emailColumn?: string | string[]
  formId?: number | string
  hasNewUser?: boolean
  nameColumn?: string
  otp?: string
  password?: string
  passwordColumn?: string
  portalId: string
  socialLogin?: boolean
  tenantId: string
}

export type ClassicPortalResult = {
  data: unknown
  error: string
  otpSent?: boolean
  status: number
}

export const getClassicTenantLogoUrl = (tenantId: string) =>
  `${getV5ApiBaseUrl()}/tenant/logo/${encodeURIComponent(tenantId)}`

export const getClassicPortal = async (
  tenantId: string,
  portalId: string,
): Promise<{ data: ClassicPortalInfo | null; error: string }> => {
  try {
    const { data, status } = await getClient().get(
      `/portal/withoutToken/${encodeURIComponent(tenantId)}/${encodeURIComponent(portalId)}`,
    )
    if (status !== 200 || !data || typeof data !== 'object') {
      return { data: null, error: 'Error fetching portal' }
    }

    const record = data as {
      description?: string
      name?: string
      settingsJson?: string
    }
    let settings: Record<string, unknown> = {}
    if (record.settingsJson) {
      try {
        const parsed = JSON.parse(record.settingsJson) as unknown
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          settings = parsed as Record<string, unknown>
        }
      } catch {
        settings = {}
      }
    }

    return {
      data: {
        description: String(record.description || ''),
        name: String(record.name || ''),
        settings,
      },
      error: '',
    }
  } catch (e) {
    return {
      data: null,
      error: asErrorMessage(
        axios.isAxiosError(e) ? e.response?.data : undefined,
        'Error fetching portal',
      ),
    }
  }
}

const postPortalAuth = async (
  url: string,
  payload: ClassicPortalAuthPayload,
): Promise<ClassicPortalResult> => {
  const response: ClassicPortalResult = {
    data: null,
    error: '',
    status: 0,
  }

  try {
    const { data, status } = await getClient().post(url, JSON.stringify(payload), {
      headers: { Token: `tenantId ${payload.tenantId}` },
    })
    response.status = status

    if (data === 'Invalid OTP') {
      response.error = 'Invalid OTP'
      return response
    }

    if (status === 201) {
      response.otpSent = true
      response.data = data
      return response
    }

    if (status === 200) {
      const shouldHaveIdentity = Boolean(
        payload.otp ||
          (payload.password && payload.password.length > 0) ||
          payload.socialLogin,
      )
      if (shouldHaveIdentity) {
        const identity = decodeBase64Json(data)
        if (!identity) {
          response.error = 'error logging in'
          return response
        }
        response.data = identity
        return response
      }
      response.otpSent = true
      response.data = data
      return response
    }

    response.error = 'error logging in'
  } catch (e) {
    const status = axios.isAxiosError(e) ? e.response?.status : 0
    response.status = status || 0
    response.error = asErrorMessage(
      axios.isAxiosError(e) ? e.response?.data : undefined,
      'error logging in',
    )
  }

  return response
}

export const classicPortalMasterLogin = (payload: ClassicPortalAuthPayload) =>
  postPortalAuth('/portal/validateMaster', payload)

export const classicPortalOtpLogin = (payload: ClassicPortalAuthPayload) =>
  postPortalAuth('/portal/validateOTP', payload)
