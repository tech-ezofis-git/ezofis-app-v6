import type { PortalConfig } from '@/pages/settings/helpers/portalConfigStorage'
import {
  emptyPortalAuthentication,
  emptyPortalConfig,
} from '@/pages/settings/helpers/portalConfigStorage'
import { getClassicTenantLogoUrl } from '@/api/v5/classicPortal'

export type ClassicPortalLoginType =
  | 'APP_LOGIN'
  | 'EMAIL_LOGIN'
  | 'MASTER_LOGIN'
  | 'MOBILE_LOGIN'

export type ClassicPortalPasswordType = 'OTP' | 'PASSWORD' | 'SOCIAL_LOGIN'

export type ClassicPortalAuthSettings = {
  firstnameField: string
  formId: number | string
  loginType: ClassicPortalLoginType
  passwordField: string
  passwordTypes: ClassicPortalPasswordType
  signInType: boolean
  socialLogin: string[]
  usernameField: string[]
}

const asAuth = (settings: Record<string, unknown>) =>
  settings.authentication &&
  typeof settings.authentication === 'object' &&
  !Array.isArray(settings.authentication)
    ? (settings.authentication as Record<string, unknown>)
    : {}

const asStringArray = (value: unknown) => {
  if (Array.isArray(value)) return value.map((item) => String(item))
  if (typeof value === 'string' && value) return [value]
  return []
}

const normalizeSocialLogin = (value: unknown) => {
  const providers = new Set<'Google' | 'Microsoft'>()
  for (const item of asStringArray(value)) {
    const lower = item.toLowerCase()
    if (lower.includes('google')) providers.add('Google')
    if (lower.includes('microsoft')) providers.add('Microsoft')
  }
  return [...providers]
}

export const classicAuthFromSettings = (
  settings: Record<string, unknown>,
): ClassicPortalAuthSettings => {
  const auth = asAuth(settings)
  const loginType = String(auth.loginType || 'EMAIL_LOGIN') as ClassicPortalLoginType
  const passwordTypes = String(
    auth.passwordTypes || 'OTP',
  ) as ClassicPortalPasswordType

  return {
    firstnameField: String(auth.firstnameField || ''),
    formId: (auth.formId as number | string) || 0,
    loginType: ['MASTER_LOGIN', 'EMAIL_LOGIN', 'MOBILE_LOGIN', 'APP_LOGIN'].includes(
      loginType,
    )
      ? loginType
      : 'EMAIL_LOGIN',
    passwordField: String(auth.passwordField || ''),
    passwordTypes: ['PASSWORD', 'OTP', 'SOCIAL_LOGIN'].includes(passwordTypes)
      ? passwordTypes
      : 'OTP',
    signInType: Boolean(auth.signInType),
    socialLogin: normalizeSocialLogin(auth.socialLogin),
    usernameField: asStringArray(auth.usernameField),
  }
}

export const classicPortalToConfig = ({
  description,
  name,
  portalId,
  settings,
  tenantId,
}: {
  description: string
  name: string
  portalId: string
  settings: Record<string, unknown>
  tenantId: string
}): PortalConfig => {
  const auth = classicAuthFromSettings(settings)
  const loginType =
    auth.loginType === 'APP_LOGIN'
      ? 'applicationLogin'
      : auth.loginType === 'MASTER_LOGIN'
        ? 'masterLogin'
        : 'emailOtp'

  return {
    ...emptyPortalConfig(),
    authentication: {
      ...emptyPortalAuthentication(),
      firstnameField: auth.firstnameField,
      formId: auth.formId,
      loginType: auth.loginType,
      passwordField: auth.passwordField,
      passwordTypes: auth.passwordTypes === 'PASSWORD' ? 'PASSWORD' : 'OTP',
      signInType: auth.signInType || auth.socialLogin.length > 0,
      socialLogin: auth.socialLogin,
      usernameField: auth.usernameField,
    },
    branding: {
      brandName: name || 'EZOFIS',
      logo: getClassicTenantLogoUrl(tenantId),
    },
    description,
    displayValues: name ? `Welcome to ${name}` : '',
    id: Number(portalId) || 0,
    loginType,
    name,
    tenantId,
  }
}
