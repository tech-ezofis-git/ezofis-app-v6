import type { CreateV6UserPayload, UpdateV6UserPayload } from '@/api/v6/user'
import type { SettingsUser } from './userGroupMappers'

export type DraftSettingsUser = SettingsUser & {
  password: string
}

const mapAuthStrategy = (loginType: string) => {
  switch (loginType) {
    case 'Google':
      return 'Google'
    case 'Microsoft':
      return 'Microsoft'
    case 'Active Directory':
      return 'ActiveDirectory'
    default:
      return 'Ezofis'
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
    'Bussiness Unit': user.businessUnit,
    'Employee Id': user.employeeId,
    'Job Title': user.jobTitle,
    'MFA Methods': user.mfaMethods.join(', '),
    LoginType: user.loginType,
    MFAuthentication: user.mfaEnabled ? 'Yes' : 'No',
    Manager: user.manager,
    accountExpiryDate: toIsoDate(user.accountExpiryDate),
    authStrategy: mapAuthStrategy(user.loginType),
    department: user.department,
    displayName,
    email: user.email,
    firstName: user.firstName,
    forcePasswordResetOnLogin: user.forcePasswordReset ? 'Yes' : 'No',
    group: user.groups,
    lastName: user.lastName,
    location: user.location,
    passwordExpiryDays: user.passwordExpiryDays,
    role: user.role,
    userName: user.username || user.email.split('@')[0] || '',
  }

  if (user.loginType === 'Password' && user.password.trim()) {
    payload.password = user.password
  }

  return payload
}

const getDisplayName = (user: DraftSettingsUser) =>
  `${user.firstName} ${user.lastName}`.trim() ||
  user.firstName ||
  user.username

const normalizeField = (value: string) => {
  const trimmed = value.trim()
  return trimmed === '—' ? '' : trimmed
}

export const mapDraftUserToUpdatePayload = (
  current: DraftSettingsUser,
  original: DraftSettingsUser,
): UpdateV6UserPayload => {
  const payload: UpdateV6UserPayload = {}

  if (normalizeField(current.firstName) !== normalizeField(original.firstName)) {
    payload.firstName = current.firstName
  }

  if (normalizeField(current.lastName) !== normalizeField(original.lastName)) {
    payload.lastName = current.lastName
  }

  if (getDisplayName(current) !== getDisplayName(original)) {
    payload.displayName = getDisplayName(current)
  }

  if (normalizeField(current.role) !== normalizeField(original.role)) {
    payload.role = current.role
  }

  if (normalizeField(current.department) !== normalizeField(original.department)) {
    payload.department = current.department
  }

  if (normalizeField(current.jobTitle) !== normalizeField(original.jobTitle)) {
    payload.jobTitle = current.jobTitle
  }

  return payload
}
