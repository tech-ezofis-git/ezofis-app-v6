import type { DraftSettingsUser } from './mapCreateUserPayload'

export const USER_DRAFT_STEP_KEYS = [
  'loginDetails',
  'businessDetail',
  'groupAssignment',
  'authentication',
  'review',
] as const

export const FOLDER_DRAFT_STEP_KEYS = [
  'folderDetails',
  'fields',
  'storage',
  'versioning',
  'integrations',
] as const

const PASSWORD_KEYS = new Set(['confirmPassword', 'password', 'resetPassword'])

export const omitPasswordFields = <T extends Record<string, unknown>>(
  value: T,
): T => {
  const next = { ...value }
  PASSWORD_KEYS.forEach((key) => {
    delete next[key]
  })
  return next
}

export const parseDraftJson = (raw: unknown): Record<string, unknown> => {
  if (!raw) return {}
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>
  }
  if (typeof raw !== 'string') return {}
  try {
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

export const buildUserDraftJson = (
  user: DraftSettingsUser,
  extras?: { confirmed?: boolean; editingUserId?: string | number | null },
) => {
  const safeUser = omitPasswordFields(
    user as unknown as Record<string, unknown>,
  )

  return {
    authentication: {
      accountExpiryDate: user.accountExpiryDate,
      forcePasswordReset: user.forcePasswordReset,
      mfaEnabled: Boolean(user.mfaEnabled),
      mfaMethods: user.mfaMethods,
      passwordExpiryDays: user.passwordExpiryDays,
    },
    businessDetail: {
      businessUnitId: user.businessUnit,
      department: user.department,
      departmentId: user.department,
      employeeId: user.employeeId,
      jobTitle: user.jobTitle,
      location: user.location,
      manager: user.manager,
      role: user.role,
    },
    editingUserId: extras?.editingUserId ?? null,
    form: safeUser,
    groupAssignment: {
      groupIds: user.groups ?? [],
    },
    loginDetails: {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      loginType: user.loginType,
      phoneCode: user.countryCode,
      phoneNumber: user.phoneNumber,
      username: user.username,
    },
    review: {
      confirmed: Boolean(extras?.confirmed),
    },
  }
}

export const hydrateUserFromDraft = (
  raw: unknown,
  fallback: DraftSettingsUser,
): {
  editingUserId: string | number | null
  stepIndex: number
  user: DraftSettingsUser
} => {
  const parsed = parseDraftJson(raw)
  const form = (parsed.form || {}) as Record<string, unknown>
  const login = (parsed.loginDetails || {}) as Record<string, unknown>
  const business = (parsed.businessDetail || {}) as Record<string, unknown>
  const groups = (parsed.groupAssignment || {}) as Record<string, unknown>
  const auth = (parsed.authentication || {}) as Record<string, unknown>

  const groupIds = Array.isArray(groups.groupIds)
    ? (groups.groupIds as string[])
    : Array.isArray(form.groups)
      ? (form.groups as string[])
      : fallback.groups

  const user: DraftSettingsUser = {
    ...fallback,
    ...(form as Partial<DraftSettingsUser>),
    accountExpiryDate: String(
      form.accountExpiryDate ||
        auth.accountExpiryDate ||
        fallback.accountExpiryDate,
    ),
    businessUnit: String(
      form.businessUnit || business.businessUnitId || fallback.businessUnit,
    ),
    countryCode: String(
      form.countryCode || login.phoneCode || fallback.countryCode,
    ),
    department: String(
      form.department || business.departmentId || business.department || '',
    ),
    email: String(form.email || login.email || fallback.email),
    employeeId: String(form.employeeId || business.employeeId || ''),
    firstName: String(form.firstName || login.firstName || fallback.firstName),
    forcePasswordReset: Boolean(
      form.forcePasswordReset ??
      auth.forcePasswordReset ??
      fallback.forcePasswordReset,
    ),
    groups: groupIds,
    jobTitle: String(form.jobTitle || business.jobTitle || ''),
    lastName: String(form.lastName || login.lastName || fallback.lastName),
    location: String(form.location || business.location || ''),
    loginType: (form.loginType ||
      login.loginType ||
      fallback.loginType) as DraftSettingsUser['loginType'],
    manager: String(form.manager || business.manager || ''),
    mfaEnabled:
      typeof form.mfaEnabled === 'boolean'
        ? form.mfaEnabled
        : typeof auth.mfaEnabled === 'boolean'
          ? auth.mfaEnabled
          : fallback.mfaEnabled,
    mfaMethods: Array.isArray(form.mfaMethods)
      ? (form.mfaMethods as string[])
      : Array.isArray(auth.mfaMethods)
        ? (auth.mfaMethods as string[])
        : fallback.mfaMethods,
    password: '',
    passwordExpiryDays: Number(
      form.passwordExpiryDays ??
        auth.passwordExpiryDays ??
        fallback.passwordExpiryDays,
    ),
    phoneNumber: String(
      form.phoneNumber || login.phoneNumber || fallback.phoneNumber,
    ),
    resetPassword: false,
    role: String(form.role || business.role || fallback.role),
    username: String(form.username || login.username || fallback.username),
  }

  const editingUserId =
    parsed.editingUserId == null || parsed.editingUserId === ''
      ? null
      : (parsed.editingUserId as string | number)

  return { editingUserId, stepIndex: 0, user }
}

export type FolderWizardSnapshot = {
  description: string
  displayMode?: string
  editingRepositoryId?: string | null
  fields: Array<{
    dataType?: string
    fieldName?: string
    folder?: boolean
    iconKey?: string
    id?: string
    includeInFolderStructure?: boolean
    isMandatory?: boolean
    level?: number
    mandatory?: boolean
    name?: string
    orderId?: number
    type?: string
  }>
  folderName: string
  integrations?: string
  piiRedactionEnabled?: boolean
  piiRedactionFieldIds?: string[]
  piiRedactionLevel?: 'high' | 'low' | 'medium'
  piiRedactionUserIds?: string[]
  piiRedactionUsers?: Array<{ password?: string; userId?: string }>
  source?: 'ai' | 'manual'
  storage: string
  storageConnectorId?: string | null
  storageConnectorLabel?: string | null
  storageDrive?: string | null
  versioning: string
}

const STORAGE_CODE_TO_OPTION_ID: Record<string, string> = {
  AZURE: 'Azure',
  EZOFIS: 'EZOFIS Drive',
  GOOGLE_DRIVE: 'Google Drive',
  ONE_DRIVE: 'One Drive',
}

export const toStorageProviderCode = (storage: string) => {
  const normalized = String(storage || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
  if (normalized.includes('ONE_DRIVE') || normalized === 'ONEDRIVE') {
    return 'ONE_DRIVE'
  }
  if (normalized.includes('GOOGLE')) return 'GOOGLE_DRIVE'
  if (normalized.includes('AZURE')) return 'AZURE'
  return 'EZOFIS'
}

const toStorageOptionId = (value: string) => {
  const code = toStorageProviderCode(value)
  return STORAGE_CODE_TO_OPTION_ID[code] || 'EZOFIS Drive'
}

export const buildFolderDraftJson = (snapshot: FolderWizardSnapshot) => ({
  editingRepositoryId: snapshot.editingRepositoryId ?? null,
  fields: (snapshot.fields || []).map((field) => ({
    folder: Boolean(field.includeInFolderStructure ?? field.folder),
    iconKey: field.iconKey,
    id: field.id,
    level: field.level,
    mandatory: Boolean(field.isMandatory ?? field.mandatory),
    name: field.fieldName || field.name || '',
    orderId: field.orderId,
    type: field.dataType || field.type || 'SHORT_TEXT',
  })),
  folderDetails: {
    description: snapshot.description,
    name: snapshot.folderName,
  },
  integrations: {
    erp:
      !snapshot.integrations || snapshot.integrations === 'None'
        ? null
        : snapshot.integrations,
    syncMapping: [],
  },
  piiRedaction: {
    enabled: Boolean(snapshot.piiRedactionEnabled),
    fieldIds: Array.isArray(snapshot.piiRedactionFieldIds)
      ? snapshot.piiRedactionFieldIds.map(String)
      : [],
    level: (() => {
      const raw = String(snapshot.piiRedactionLevel || 'medium')
        .trim()
        .toLowerCase()
      return raw === 'low' || raw === 'high' ? raw : 'medium'
    })(),
    userIds: Array.isArray(snapshot.piiRedactionUserIds)
      ? snapshot.piiRedactionUserIds.map(String)
      : Array.isArray(snapshot.piiRedactionUsers)
        ? snapshot.piiRedactionUsers
            .map((entry) => String(entry?.userId || '').trim())
            .filter(Boolean)
        : [],
    users: Array.isArray(snapshot.piiRedactionUsers)
      ? snapshot.piiRedactionUsers
          .map((entry) => ({
            password: String(entry?.password || ''),
            userId: String(entry?.userId || '').trim(),
          }))
          .filter((entry) => entry.userId)
      : Array.isArray(snapshot.piiRedactionUserIds)
        ? snapshot.piiRedactionUserIds.map((userId) => ({
            password: '',
            userId: String(userId),
          }))
        : [],
  },
  source: snapshot.source || 'manual',
  storage: {
    storageConnectorId: snapshot.storageConnectorId ?? null,
    storageConnectorLabel: snapshot.storageConnectorLabel ?? null,
    storageDrive: snapshot.storageDrive ?? null,
    storageOptionId: snapshot.storage,
    storageProviderCode: toStorageProviderCode(snapshot.storage),
  },
  versioning: {
    displayMode: snapshot.displayMode,
    strategy: snapshot.versioning,
  },
})

export const hydrateFolderFromDraft = (
  raw: unknown,
): Partial<FolderWizardSnapshot> & { step?: number } => {
  const parsed = parseDraftJson(raw)
  const form = (parsed.form || {}) as Partial<FolderWizardSnapshot>
  const details = (parsed.folderDetails || {}) as Record<string, unknown>
  const storage = (parsed.storage || {}) as Record<string, unknown>
  const versioning = (parsed.versioning || {}) as Record<string, unknown>
  const piiRedaction = (parsed.piiRedaction || {}) as Record<string, unknown>
  const integrations = (parsed.integrations || {}) as Record<string, unknown>
  const fieldsRaw = Array.isArray(parsed.fields)
    ? parsed.fields
    : Array.isArray(form.fields)
      ? form.fields
      : []

  const fields = fieldsRaw.map((field, index) => {
    const row = field as Record<string, unknown>
    return {
      dataType: String(row.dataType || row.type || 'SHORT_TEXT'),
      fieldName: String(row.fieldName || row.name || ''),
      iconKey: typeof row.iconKey === 'string' ? row.iconKey : undefined,
      id: String(row.id || crypto.randomUUID()),
      includeInFolderStructure: Boolean(
        row.includeInFolderStructure ?? row.folder,
      ),
      isMandatory: Boolean(row.isMandatory ?? row.mandatory),
      level: Number(row.level || 0),
      orderId: Number(row.orderId || index + 1),
    }
  })

  return {
    description: String(form.description || details.description || ''),
    displayMode:
      String(form.displayMode || versioning.displayMode || '') || undefined,
    editingRepositoryId: (() => {
      const value = form.editingRepositoryId ?? parsed.editingRepositoryId
      if (value == null || value === '') return null
      return String(value)
    })(),
    fields,
    folderName: String(form.folderName || details.name || ''),
    integrations: String(
      form.integrations || integrations.label || integrations.erp || '',
    ),
    piiRedactionEnabled: Boolean(
      form.piiRedactionEnabled ?? piiRedaction.enabled ?? false,
    ),
    piiRedactionFieldIds: Array.isArray(form.piiRedactionFieldIds)
      ? form.piiRedactionFieldIds.map(String)
      : Array.isArray(piiRedaction.fieldIds)
        ? piiRedaction.fieldIds.map(String)
        : [],
    piiRedactionLevel: (() => {
      const raw = String(
        form.piiRedactionLevel ?? piiRedaction.level ?? 'medium',
      )
        .trim()
        .toLowerCase()
      return (raw === 'low' || raw === 'high' ? raw : 'medium') as
        | 'high'
        | 'low'
        | 'medium'
    })(),
    piiRedactionUserIds: Array.isArray(form.piiRedactionUserIds)
      ? form.piiRedactionUserIds.map(String)
      : Array.isArray(piiRedaction.userIds)
        ? piiRedaction.userIds.map(String)
        : Array.isArray(piiRedaction.users)
          ? (piiRedaction.users as Array<{ userId?: string }>)
              .map((entry) => String(entry?.userId || '').trim())
              .filter(Boolean)
          : [],
    piiRedactionUsers: Array.isArray(form.piiRedactionUsers)
      ? form.piiRedactionUsers.map((entry) => ({
          password: String(entry?.password || ''),
          userId: String(entry?.userId || '').trim(),
        }))
      : Array.isArray(piiRedaction.users)
        ? (
            piiRedaction.users as Array<{ password?: string; userId?: string }>
          ).map((entry) => ({
            password: String(entry?.password || ''),
            userId: String(entry?.userId || '').trim(),
          }))
        : Array.isArray(form.piiRedactionUserIds)
          ? form.piiRedactionUserIds.map((userId) => ({
              password: '',
              userId: String(userId),
            }))
          : Array.isArray(piiRedaction.userIds)
            ? piiRedaction.userIds.map((userId) => ({
                password: '',
                userId: String(userId),
              }))
            : [],
    source: form.source || (parsed.source as FolderWizardSnapshot['source']),
    storage: toStorageOptionId(
      String(
        form.storage ||
          storage.storageOptionId ||
          storage.storageProviderCode ||
          'EZOFIS',
      ),
    ),
    storageConnectorId:
      form.storageConnectorId ??
      (typeof storage.storageConnectorId === 'string'
        ? storage.storageConnectorId
        : null),
    storageConnectorLabel:
      form.storageConnectorLabel ??
      (typeof storage.storageConnectorLabel === 'string'
        ? storage.storageConnectorLabel
        : null),
    storageDrive:
      form.storageDrive ??
      (typeof storage.storageDrive === 'string' ? storage.storageDrive : null),
    versioning: String(
      form.versioning || versioning.strategy || 'Incremental Version',
    ),
  }
}

export const folderStepKey = (step: number) =>
  FOLDER_DRAFT_STEP_KEYS[
    Math.max(0, Math.min(step - 1, FOLDER_DRAFT_STEP_KEYS.length - 1))
  ]

export const userStepKey = (stepIndex: number) =>
  USER_DRAFT_STEP_KEYS[Math.max(0, Math.min(stepIndex, 4))]

export const userStepIndexFromDraft = (
  currentStep?: number,
  currentStepKey?: string,
) => {
  if (currentStepKey) {
    const index = (USER_DRAFT_STEP_KEYS as readonly string[]).indexOf(
      currentStepKey,
    )
    if (index >= 0) return index
  }

  if (typeof currentStep === 'number' && currentStep >= 1) {
    return Math.min(currentStep, 5) - 1
  }

  return 0
}

export const folderStepFromDraft = (
  currentStep?: number,
  currentStepKey?: string,
) => {
  if (typeof currentStep === 'number' && currentStep >= 1) {
    return Math.min(currentStep, 6) as 1 | 2 | 3 | 4 | 5 | 6
  }

  if (currentStepKey) {
    const index = (FOLDER_DRAFT_STEP_KEYS as readonly string[]).indexOf(
      currentStepKey,
    )
    if (index >= 0) return (index + 1) as 1 | 2 | 3 | 4 | 5 | 6
  }

  return 1
}
