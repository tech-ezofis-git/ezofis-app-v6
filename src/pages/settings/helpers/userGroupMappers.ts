export type SettingsUser = {
  accountExpiryDate: string
  businessUnit: string
  created: string
  department: string
  email: string
  employeeId: string
  firstName: string
  forcePasswordReset: boolean
  groups: string[]
  id: number | string
  jobTitle: string
  lastLogin: string
  lastName: string
  location: string
  loginType: string
  manager: string
  mfaEnabled: boolean
  mfaMethods: string[]
  passwordExpiryDays: number
  role: string
  status: 'active' | 'inactive' | 'pending'
  username: string
}

export type SettingsGroup = {
  created: string
  description: string
  id: number | string
  memberIds: string[]
  members: string[]
  name: string
  status: 'active' | 'inactive'
}

export type SettingsOption = {
  description?: string
  id: string
  name: string
  value?: string
}

const toArray = (value: unknown): any[] => {
  if (!value) return []
  if (Array.isArray(value)) return value
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    const nested =
      record.data ||
      record.payload ||
      record.items ||
      record.value ||
      record.groups ||
      record.users
    if (Array.isArray(nested)) return nested
  }
  return []
}

const splitName = (value: string) => {
  const parts = value.trim().split(/\s+/).filter(Boolean)
  return {
    firstName: parts[0] || 'User',
    lastName: parts.slice(1).join(' '),
  }
}

const normalizeStatus = (value: unknown): SettingsUser['status'] => {
  const text = String(value ?? '').toLowerCase()
  if (text === 'inactive' || text === 'disabled' || text === 'false' || text === '0') {
    return 'inactive'
  }
  if (text === 'pending') return 'pending'
  return 'active'
}

const mapAuthStrategyToLoginType = (authStrategy: string) => {
  switch (authStrategy) {
    case 'Google':
      return 'Google'
    case 'Microsoft':
      return 'Microsoft'
    case 'ActiveDirectory':
    case 'LDAP':
      return 'Active Directory'
    default:
      return 'Password'
  }
}

const formatDate = (value: unknown) => {
  if (!value) return '—'
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export const mapApiUserToSettingsUser = (
  raw: Record<string, any>,
  index: number,
): SettingsUser => {
  const displayName = String(
    raw.value ||
      raw.displayName ||
      raw.name ||
      raw.loginName ||
      raw.userName ||
      '',
  ).trim()

  const parsedName = splitName(displayName)
  const firstName = String(raw.firstName || raw.FirstName || parsedName.firstName)
  const lastName = String(raw.lastName || raw.LastName || parsedName.lastName)
  const loginName = String(
    raw.loginName || raw.userName || raw.username || raw.email || displayName,
  )
  const email = String(raw.email || raw.Email || '')
  const resolvedEmail = email.includes('@')
    ? email
    : loginName.includes('@')
      ? loginName
      : `${loginName || `user${index + 1}`}@company.com`

  const rawGroups = raw.groups || raw.groupNames || raw.groupList || []
  const groups = Array.isArray(rawGroups)
    ? rawGroups.map((group) =>
        typeof group === 'string'
          ? group
          : String(group.groupName || group.name || group.value || ''),
      ).filter(Boolean)
    : []

  return {
    accountExpiryDate: String(raw.accountExpiryDate || ''),
    businessUnit: String(raw.businessUnit || raw.BusinessUnit || '—'),
    created: formatDate(
      raw.createdAtUtc || raw.created || raw.createdAt || raw.createdDate,
    ),
    department: String(raw.department || raw.Department || '—'),
    email: resolvedEmail,
    employeeId: String(raw.employeeId || raw.EmployeeId || '—'),
    firstName,
    forcePasswordReset: Boolean(raw.forcePasswordReset),
    groups,
    id:
      raw.id ??
      raw.userId ??
      raw.value ??
      loginName ??
      resolvedEmail ??
      `user-${index + 1}`,
    jobTitle: String(raw.jobTitle || raw.JobTitle || raw.designation || '—'),
    lastLogin: formatDate(raw.lastLogin || raw.lastLoginDate || raw.lastAccessedAt),
    lastName,
    location: String(raw.location || raw.Location || '—'),
    loginType: String(
      raw.loginType ||
        raw.LoginType ||
        mapAuthStrategyToLoginType(String(raw.authStrategy || '')),
    ),
    manager: String(raw.manager || raw.Manager || '—'),
    mfaEnabled: Boolean(raw.mfaEnabled ?? true),
    mfaMethods: Array.isArray(raw.mfaMethods) ? raw.mfaMethods.map(String) : [],
    passwordExpiryDays: Number(raw.passwordExpiryDays || 90),
    role: String(raw.role || raw.roleName || raw.userType || raw.UserType || 'Business User'),
    status: normalizeStatus(raw.status ?? raw.isActive),
    username: loginName || resolvedEmail.split('@')[0],
  }
}

export const mapUsersToManagerOptions = (users: SettingsUser[]): SettingsOption[] => {
  return users.map((user) => ({
    id: String(user.id),
    name: user.email,
    value: user.email,
  }))
}

export const mapApiUsersToSettingsUsers = (data: unknown): SettingsUser[] => {
  return toArray(data).map((item, index) => mapApiUserToSettingsUser(item, index))
}

export const mapApiGroupToSettingsGroup = (
  raw: Record<string, any>,
  index: number,
): SettingsGroup => {
  const membersSource = raw.members || raw.users || raw.userList || []
  const members = Array.isArray(membersSource)
    ? membersSource
        .map((member) => {
          if (typeof member === 'string') return member
          return String(
            member.displayName ||
              member.value ||
              member.name ||
              member.loginName ||
              member.email ||
              member.id ||
              '',
          )
        })
        .filter(Boolean)
    : []

  const memberIds = Array.isArray(membersSource)
    ? membersSource
        .map((member, memberIndex) =>
          String(
            typeof member === 'object'
              ? member.id || member.userId || member.value || memberIndex
              : member,
          ),
        )
        .filter(Boolean)
    : []

  const memberCount =
    members.length ||
    memberIds.length ||
    Number(raw.userCount ?? raw.memberCount ?? 0)

  return {
    created: formatDate(
      raw.createdAtUtc || raw.created || raw.createdAt || raw.createdDate,
    ),
    description: String(
      raw.description || raw.groupDescription || raw.caption || '—',
    ),
    id: raw.id ?? raw.groupId ?? raw.value ?? index + 1,
    memberIds: memberIds.length
      ? memberIds
      : Array.from({ length: memberCount }, (_, memberIndex) =>
          String(memberIndex),
        ),
    members: members.length
      ? members
      : Array.from({ length: memberCount }, () => ''),
    name: String(raw.groupName || raw.name || raw.value || `Group ${index + 1}`),
    status: raw.isActive === false ? 'inactive' : 'active',
  }
}

export const mapApiGroupsToSettingsGroups = (data: unknown): SettingsGroup[] => {
  return toArray(data).map((item, index) => mapApiGroupToSettingsGroup(item, index))
}

export const mapUsersToOptions = (data: unknown): SettingsOption[] => {
  return mapApiUsersToSettingsUsers(data).map((user) => ({
    id: String(user.id),
    name: `${user.firstName} ${user.lastName}`.trim() || user.username,
    value: user.email,
    description: user.email,
  }))
}

export const mapGroupsToOptions = (data: unknown): SettingsOption[] => {
  return mapApiGroupsToSettingsGroups(data).map((group) => ({
    id: String(group.id),
    name: group.name,
    value: group.name,
    description: group.description,
  }))
}
