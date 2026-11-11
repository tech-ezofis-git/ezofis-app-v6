import { axiosV6 } from '../axios'
import { getV6ApiErrorMessage } from './auth'

// Portal "Master Login": the visitor is checked on the server against the
// portal's master form and receives an access token. These calls never send
// the signed-in app user's token (skipAuthToken), because the visitor is not
// an app user.

export type PortalMasterLoginResponse = {
  accessToken: string
  displayName: string
  email?: string | null
  entry: Record<string, unknown>
  expiresIn: number
  itemId?: number | null
  tokenType: string
  userId: string
  username: string
}

type PortalLoginIds = {
  portalId: number
  portalOwnerId: string
  tenantId: string
}

type Result<T> = { data: T | null; error: string }

const post = async <T>(
  url: string,
  tenantId: string,
  body: Record<string, unknown>,
  fallback: string,
): Promise<Result<T>> => {
  try {
    const { data } = await axiosV6.post<T>(url, body, {
      headers: { 'X-Tenant-Id': tenantId },
      skipAuthToken: true,
      skipCancellation: true,
    })
    return { data: (data ?? null) as T | null, error: '' }
  } catch (error) {
    const responseData = (error as { response?: { data?: unknown } })?.response
      ?.data
    return { data: null, error: getV6ApiErrorMessage(responseData, fallback) }
  }
}

export const portalMasterLogin = (
  ids: PortalLoginIds,
  username: string,
  password: string,
) =>
  post<PortalMasterLoginResponse>(
    '/portal-auth/master-login',
    ids.tenantId,
    {
      password,
      portalId: ids.portalId,
      portalOwnerId: ids.portalOwnerId,
      username,
    },
    'Unable to sign in',
  )

export const portalMasterSendOtp = (ids: PortalLoginIds, username: string) =>
  post<unknown>(
    '/portal-auth/master-login/otp/send',
    ids.tenantId,
    { portalId: ids.portalId, portalOwnerId: ids.portalOwnerId, username },
    'Failed to send OTP. Please try again.',
  )

export const portalMasterVerifyOtp = (
  ids: PortalLoginIds,
  username: string,
  otp: string,
) =>
  post<PortalMasterLoginResponse>(
    '/portal-auth/master-login/otp/verify',
    ids.tenantId,
    {
      otp,
      portalId: ids.portalId,
      portalOwnerId: ids.portalOwnerId,
      username,
    },
    'Invalid or expired code.',
  )
