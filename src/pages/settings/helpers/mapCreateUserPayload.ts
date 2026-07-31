import type { CreateV6UserPayload, UpdateV6UserPayload } from '@/api/v6/user'
import { getDialCodeFromCountryValue } from './countryDialCodes'
import type { SettingsUser } from './userGroupMappers'

export type DraftSettingsUser = SettingsUser & {
  password: string
  resetPassword?: boolean
}

const mapAuthStrategy = (loginType: string) => {
  switch (loginType) {
    case 'GoogleSSO':
      return 'Google'
    case 'MS Entra ID':
      return 'Microsoft'
    case 'LDAP/AD':
      return 'ActiveDirectory'
    default:
      return 'Ezofis'
  }
}

const mapLoginTypeToApi = (loginType: string) => {
  switch (loginType) {
    case 'GoogleSSO':
      return 'GoogleSSO'
    case 'MS Entra ID':
      return 'MS Entra ID'
    case 'LDAP/AD':
      return 'LDAP/AD'
    default:
      return 'Password'
  }
}

const toIsoDate = (value: string) => {
  if (!value) return ''

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toISOString()
}

export const mapDraftUserToCreatePayload = (
  user: DraftSettingsUser,
): CreateV6UserPayload => {
  const displayName =
    `${user.firstName} ${user.lastName}`.trim() ||
    user.firstName ||
    user.username

  const payload: CreateV6UserPayload = {
    'accountExpiryDate': toIsoDate(user.accountExpiryDate),
    'authStrategy': mapAuthStrategy(user.loginType),
    'Bussiness Unit': user.businessUnit,
    'countryCode': getDialCodeFromCountryValue(user.countryCode),
    'department': user.department,
    displayName,
    'email': user.email,
    'Employee Id': user.employeeId,
    'firstName': user.firstName,
    'forcePasswordResetOnLogin': user.forcePasswordReset ? 'Yes' : 'No',
    'group': user.groups,
    'Job Title': user.jobTitle,
    'lastName': user.lastName,
    'location': user.location,
    'LoginType': mapLoginTypeToApi(user.loginType),
    'Manager': user.manager,
    'MFA Methods': user.mfaMethods.join(', '),
    'MFAuthentication': user.mfaEnabled ? 'Yes' : 'No',
    'passwordExpiryDays': user.passwordExpiryDays,
    'phoneNo': user.phoneNumber,
    'role': user.role,
    'userName': user.username || user.email.split('@')[0] || '',
  }

  if (user.loginType === 'Password' && user.password.trim()) {
    payload.password = user.password
  }

  return payload
}

export const mapDraftUserToUpdatePayload = (
  current: DraftSettingsUser,
  _original?: DraftSettingsUser,
): UpdateV6UserPayload => {
  const payload = mapDraftUserToCreatePayload(current)

  // Password is not returned from the API; only send it when reset is enabled.
  if (!(current.resetPassword && current.password.trim())) {
    delete payload.password
  }

  return {
    ...payload,
    jobTitle: current.jobTitle,
  }
}
