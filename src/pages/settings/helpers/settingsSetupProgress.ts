import type { SettingsGroup, SettingsUser } from './userGroupMappers'

const isFilled = (value: string | number | null | undefined) =>
  Boolean(String(value ?? '').trim())

export function calculateUserSetupProgress(user: SettingsUser) {
  const checks = [
    isFilled(user.firstName),
    isFilled(user.lastName),
    isFilled(user.email),
    isFilled(user.username),
    isFilled(user.accountExpiryDate),
    isFilled(user.jobTitle),
    isFilled(user.employeeId),
    isFilled(user.department),
    isFilled(user.businessUnit),
    isFilled(user.manager),
    isFilled(user.location),
    user.groups.length > 0,
    !user.mfaEnabled || user.mfaMethods.length > 0,
  ]

  const filled = checks.filter(Boolean).length
  return Math.round((filled / checks.length) * 100)
}

export function calculateGroupSetupProgress(
  group: SettingsGroup,
  memberCount: number,
) {
  const checks = [
    isFilled(group.name),
    isFilled(group.description),
    memberCount > 0,
  ]

  const filled = checks.filter(Boolean).length
  return Math.round((filled / checks.length) * 100)
}

export function calculateMenuSetupProgress(
  menu: {
    key: string
    label: string
    routePath: string
    sortOrder: number
  },
  isEditing: boolean,
) {
  const checks = [
    isEditing || isFilled(menu.key),
    isFilled(menu.label),
    isFilled(menu.routePath),
    menu.sortOrder >= 0,
  ]

  const filled = checks.filter(Boolean).length
  return Math.round((filled / checks.length) * 100)
}

export function calculateRoleSetupProgress(
  roleName: string,
  description: string,
  selectedUserCount: number,
  enabledPermissionCount: number,
) {
  const checks = [
    isFilled(roleName),
    isFilled(description),
    selectedUserCount > 0,
    enabledPermissionCount > 0,
  ]

  const filled = checks.filter(Boolean).length
  return Math.round((filled / checks.length) * 100)
}

export function getSetupProgressStyle(progress: number) {
  if (progress >= 100) {
    return {
      barClassName: 'bg-[var(--green-9)]',
      textClassName: 'text-[var(--green-11)]',
    }
  }

  if (progress >= 67) {
    return {
      barClassName: 'bg-[var(--primary-9)]',
      textClassName: 'text-[var(--primary-11)]',
    }
  }

  if (progress >= 34) {
    return {
      barClassName: 'bg-[var(--orange-9)]',
      textClassName: 'text-[var(--orange-11)]',
    }
  }

  return {
    barClassName: 'bg-[var(--red-9)]',
    textClassName: 'text-[var(--red-11)]',
  }
}
