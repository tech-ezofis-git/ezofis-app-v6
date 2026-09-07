export type SettingsGroup = {
  created: string
  createdBy: string
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

export type SettingsUser = {
  accountExpiryDate: string
  businessUnit: string
  countryCode: string
  created: string
  createdBy: string
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
  phoneNumber: string
  role: string
  status: 'active' | 'inactive' | 'pending' | 'draft'
  username: string
  wizardDraftId?: string
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
  if (
    text === 'inactive' ||
    text === 'disabled' ||
    text === 'false' ||
    text === '0'
  ) {
    return 'inactive'
  }
  if (text === 'pending') return 'pending'
  if (text === 'draft') return 'draft'
  return 'active'
}

const mapAuthStrategyToLoginType = (authStrategy: string) => {
  switch (String(authStrategy || '').trim().toLowerCase()) {
    case 'googlesso':
    case 'google':
    case 'google sso':
      return 'GoogleSSO'
    case 'ms entra id':
    case 'microsoft':
    case 'entra':
    case 'azuread':
    case 'ms_entra_id':
      return 'MS Entra ID'
    case 'ldap/ad':
    case 'ldap':
    case 'activedirectory':
    case 'active directory':
    case 'active_directory':
      return 'LDAP/AD'
    case 'ezofis':
    case 'password':
    case '':
      return 'Password'
    default:
      return 'Password'
  }
}

/** Normalize API login type / auth strategy values for UI display. */
export const normalizeLoginType = (value: unknown) =>
  mapAuthStrategyToLoginType(String(value || ''))

const normalizeOptionalText = (value: unknown) => {
  const text = String(value ?? '').trim()
  return !text || text === '—' ? '' : text
}

const pickRawText = (raw: Record<string, any>, keys: string[]) => {
  for (const key of keys) {
    if (raw[key] == null) continue
    const text = String(raw[key]).trim()
    if (text && text !== '—') return text
  }
  return ''
}

const pickCreatedBy = (raw: Record<string, any>) =>
  pickRawText(raw, [
    'createdByName',
    'CreatedByName',
    'createdBy',
    'CreatedBy',
    'createdByUserName',
    'createdByEmail',
    'createdByUser',
    'ownerName',
  ])

const normalizeYesNoFlag = (value: unknown) => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1

  const text = String(value ?? '')
    .trim()
    .toLowerCase()

  return (
    text === 'yes' ||
    text === 'true' ||
    text === '1' ||
    text === 'y' ||
    text === 'on'
  )
}

const extractMfaMethods = (raw: Record<string, any>): string[] => {
  const candidates = [
    raw.mfaMethods,
    raw['MFA Methods'],
    raw.MFAMethods,
    raw.mfaMethod,
  ]

  for (const candidate of candidates) {
    if (candidate == null || candidate === '') continue

    if (Array.isArray(candidate)) {
      const mapped = candidate.map(String).map((item) => item.trim()).filter(Boolean)
      if (mapped.length) return mapped
      continue
    }

    if (typeof candidate === 'string') {
      const mapped = candidate
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)
      if (mapped.length) return mapped
    }
  }

  return []
}

const extractUserGroups = (raw: Record<string, any>): string[] => {
  const candidates = [
    raw.groups,
    raw.group,
    raw.Groups,
    raw.Group,
    raw.groupNames,
    raw.groupList,
    raw.groupName,
  ]

  for (const candidate of candidates) {
    if (candidate == null || candidate === '') continue

    if (Array.isArray(candidate)) {
      const mapped = candidate
        .map((group) => {
          if (typeof group === 'string' || typeof group === 'number') {
            return String(group).trim()
          }
          if (!group || typeof group !== 'object') return ''
          return String(
            group.groupName ||
              group.name ||
              group.value ||
              group.groupId ||
              group.id ||
              '',
          ).trim()
        })
        .filter(Boolean)

      if (mapped.length) return Array.from(new Set(mapped))
      continue
    }

    if (typeof candidate === 'string') {
      const mapped = candidate
        .split(',')
        .map((part) => part.trim())
        .filter((part) => part && part !== '—')
      if (mapped.length) return Array.from(new Set(mapped))
    }
  }

  return []
}

/** Fill user.groups from group memberships when the user payload omits them. */
export const applyGroupMembershipsToUsers = (
  users: SettingsUser[],
  groups: SettingsGroup[],
): SettingsUser[] => {
  if (!users?.length || !groups?.length) return users

  return users.map((user) => {
    if ((user.groups ?? []).length) return user

    const userId = String(user.id)
    const email = user.email.trim().toLowerCase()
    const fullName = `${user.firstName} ${user.lastName}`.trim().toLowerCase()
    const username = user.username.trim().toLowerCase()

    const memberships = groups
      .filter((group) => {
        const inIds = group.memberIds.some((id) => {
          const normalized = String(id).trim().toLowerCase()
          return (
            normalized === userId.toLowerCase() ||
            (email && normalized === email) ||
            (username && normalized === username)
          )
        })
        if (inIds) return true

        return group.members.some((member) => {
          const normalized = String(member).trim().toLowerCase()
          return (
            (email && normalized === email) ||
            (fullName && normalized === fullName) ||
            (username && normalized === username)
          )
        })
      })
      .map((group) => group.name)
      .filter(Boolean)

    return memberships.length
      ? { ...user, groups: Array.from(new Set(memberships)) }
      : user
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
  const firstName = String(
    raw.firstName || raw.FirstName || parsedName.firstName,
  )
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

  return {
    accountExpiryDate: String(
      raw.accountExpiryDate || raw.AccountExpiryDate || '',
    ),
    businessUnit: pickRawText(raw, [
      'Bussiness Unit',
      'Business Unit',
      'businessUnit',
      'BusinessUnit',
      'bussinessUnit',
    ]),
    countryCode: String(raw.countryCode || raw.CountryCode || ''),
    created: normalizeOptionalText(
      raw.createdAtUtc || raw.created || raw.createdAt || raw.createdDate,
    ),
    createdBy: pickCreatedBy(raw),
    department: pickRawText(raw, ['department', 'Department']),
    email: resolvedEmail,
    employeeId: pickRawText(raw, [
      'Employee Id',
      'Employee ID',
      'employeeId',
      'EmployeeId',
    ]),
    firstName,
    forcePasswordReset: normalizeYesNoFlag(
      raw.forcePasswordResetOnLogin ??
        raw.ForcePasswordResetOnLogin ??
        raw.forcePasswordReset ??
        raw.ForcePasswordReset,
    ),
    groups: extractUserGroups(raw),
    id:
      raw.id ??
      raw.userId ??
      raw.value ??
      loginName ??
      resolvedEmail ??
      `user-${index + 1}`,
    jobTitle: pickRawText(raw, [
      'Job Title',
      'jobTitle',
      'JobTitle',
      'designation',
      'Designation',
    ]),
    lastLogin: normalizeOptionalText(
      raw.lastLogin || raw.lastLoginDate || raw.lastAccessedAt,
    ),
    lastName,
    location: pickRawText(raw, ['location', 'Location']),
    loginType: normalizeLoginType(
      raw.loginType ||
        raw.LoginType ||
        raw.authStrategy ||
        '',
    ),
    manager: pickRawText(raw, ['Manager', 'manager']),
    mfaEnabled: normalizeYesNoFlag(
      raw.MFAuthentication ??
        raw.mfAuthentication ??
        raw.mfaEnabled ??
        raw.MfaEnabled ??
        true,
    ),
    mfaMethods: extractMfaMethods(raw),
    passwordExpiryDays: Number(
      raw.passwordExpiryDays || raw.PasswordExpiryDays || 90,
    ),
    phoneNumber: String(
      raw.phoneNo || raw.phoneNumber || raw.PhoneNO || raw.PhoneNo || '',
    ),
    role: String(
      raw.role ||
        raw.roleName ||
        raw.userType ||
        raw.UserType ||
        '',
    ).trim(),
    status: normalizeStatus(raw.status ?? raw.isActive),
    username: loginName || resolvedEmail.split('@')[0],
  }
}

export const mapUsersToManagerOptions = (
  users: SettingsUser[],
): SettingsOption[] => {
  return users.map((user) => ({
    id: String(user.id),
    name: user.email,
    value: user.email,
  }))
}

export const mapApiUsersToSettingsUsers = (data: unknown): SettingsUser[] => {
  return toArray(data).map((item, index) =>
    mapApiUserToSettingsUser(item, index),
  )
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
    created: String(
      raw.createdAtUtc || raw.created || raw.createdAt || raw.createdDate || '',
    ) || '—',
    createdBy: pickCreatedBy(raw),
    description: String(
      raw.description || raw.groupDescription || raw.caption || '',
    ),
    id: raw.groupId ?? raw.id ?? raw.value ?? index + 1,
    memberIds: memberIds.length
      ? memberIds
      : Array.from({ length: memberCount }, (_, memberIndex) =>
          String(memberIndex),
        ),
    members: members.length
      ? members
      : Array.from({ length: memberCount }, () => ''),
    name: String(
      raw.groupName || raw.name || raw.value || `Group ${index + 1}`,
    ),
    status: raw.isActive === false ? 'inactive' : 'active',
  }
}

export const mapApiGroupsToSettingsGroups = (
  data: unknown,
): SettingsGroup[] => {
  return toArray(data).map((item, index) =>
    mapApiGroupToSettingsGroup(item, index),
  )
}

export const mapUsersToOptions = (data: unknown): SettingsOption[] => {
  return mapApiUsersToSettingsUsers(data).map((user) => ({
    description: user.email,
    id: String(user.id),
    name: `${user.firstName} ${user.lastName}`.trim() || user.username,
    value: user.email,
  }))
}

export const mapGroupsToOptions = (data: unknown): SettingsOption[] => {
  return mapApiGroupsToSettingsGroups(data).map((group) => ({
    description: group.description,
    id: String(group.id),
    name: group.name,
    value: group.name,
  }))
}

export const mapRolesToOptions = (data: unknown): SettingsOption[] => {
  return toArray(data)
    .map((raw, index) => {
      const name = String(
        raw.roleName || raw.name || raw.value || `Role ${index + 1}`,
      ).trim()
      if (!name) return null

      return {
        description: String(raw.description || ''),
        id: String(raw.roleId || raw.id || name),
        name,
        value: name,
      } satisfies SettingsOption
    })
    .filter(Boolean) as SettingsOption[]
}
