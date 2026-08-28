export const PORTAL_CONFIG_STORAGE_KEY = 'ezofis_portal_configurations'

export type PortalLoginType =
  | 'applicationLogin'
  | 'emailOtp'
  | 'masterLogin'

export type PortalPasswordType = 'OTP' | 'PASSWORD'

export type PortalAuthentication = {
  firstnameField: string
  formId: number | string
  loginType: string
  mailContent: { content: string; text: string }
  mailSubject: { content: string; text: string }
  noSignInValue: boolean
  notification: boolean
  passwordField: string
  passwordTypes: PortalPasswordType
  signInType: boolean
  socialLogin: string[]
  usernameField: string[]
}

export type PortalWorkflowLink = {
  category: unknown[]
  categoryFieldId: string
  categoryFieldMasterSync: unknown[]
  id: number | string
  name: string
  processInfo: unknown[]
}

export type PortalBrandingSnapshot = {
  applySurfaceBackground?: boolean
  brandName?: string
  colorPreferences?: {
    dark?: Record<string, string>
    light?: Record<string, string>
  }
  favicon?: string
  logo?: string
}

export type PortalConfig = {
  authentication: PortalAuthentication
  branding?: PortalBrandingSnapshot
  createdAt: string
  createdBy: string
  createdByEmail: string
  description: string
  displayValues: string
  howItWorks: unknown[]
  id: number
  isDeleted: boolean
  loginType: PortalLoginType
  modifiedAt: string | null
  modifiedBy: string
  modifiedByEmail: string | null
  name: string
  superUser: string
  tenantId?: string
  workflow: string
  workflowId: number | string
  workflows: PortalWorkflowLink[]
}

type StoredPortalRecord = {
  contentJson?: string
  createdAt?: string
  createdBy?: string
  createdByEmail?: string
  description?: string
  displayValues?: string
  id?: number
  isDeleted?: boolean
  modifiedAt?: string | null
  modifiedBy?: string
  modifiedByEmail?: string | null
  name?: string
  settingsJson?: string
  superUser?: string
  workflow?: string
  workflowId?: number | string
}

const emptyMail = { content: '', text: '' }

export const emptyPortalAuthentication = (): PortalAuthentication => ({
  firstnameField: '',
  formId: 0,
  loginType: 'EMAIL_LOGIN',
  mailContent: { ...emptyMail },
  mailSubject: { ...emptyMail },
  noSignInValue: false,
  notification: false,
  passwordField: '',
  passwordTypes: 'OTP',
  signInType: false,
  socialLogin: [],
  usernameField: [],
})

export const emptyPortalConfig = (): PortalConfig => ({
  authentication: emptyPortalAuthentication(),
  branding: {},
  createdAt: '',
  createdBy: '',
  createdByEmail: '',
  description: '',
  displayValues: '',
  howItWorks: [],
  id: 0,
  isDeleted: false,
  loginType: 'emailOtp',
  modifiedAt: null,
  modifiedBy: '0',
  modifiedByEmail: null,
  name: '',
  superUser: '',
  tenantId: '',
  workflow: '',
  workflowId: '',
  workflows: [],
})

const SEED_PORTAL: PortalConfig = {
  authentication: {
    firstnameField: '',
    formId: 0,
    loginType: 'EMAIL_LOGIN',
    mailContent: { ...emptyMail },
    mailSubject: { ...emptyMail },
    noSignInValue: false,
    notification: false,
    passwordField: '',
    passwordTypes: 'OTP',
    signInType: false,
    socialLogin: [],
    usernameField: [],
  },
  createdAt: '2026-06-04T04:19:41.41Z',
  createdBy: '1',
  createdByEmail: 'seth@ezofis.com',
  description: '',
  displayValues: '',
  howItWorks: [],
  id: 69,
  isDeleted: false,
  loginType: 'emailOtp',
  modifiedAt: null,
  modifiedBy: '0',
  modifiedByEmail: null,
  name: 'Access2Pay Portal',
  superUser: '',
  workflow: 'ACCESS2PAY_WF',
  workflowId: 104,
  workflows: [
    {
      category: [],
      categoryFieldId: '',
      categoryFieldMasterSync: [],
      id: 104,
      name: 'ACCESS2PAY_WF',
      processInfo: [],
    },
  ],
}

const parseJson = (raw: unknown) => {
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

const asStringArray = (value: unknown) =>
  Array.isArray(value) ? value.map((item) => String(item)) : []

export const loginTypeFromAuth = (
  authentication: PortalAuthentication,
): PortalLoginType => {
  if (authentication.loginType === 'MASTER_LOGIN') return 'masterLogin'
  if (authentication.loginType === 'APPLICATION_LOGIN') return 'applicationLogin'
  if (Number(authentication.formId) > 0) return 'masterLogin'
  return 'emailOtp'
}

export const applyLoginType = (
  loginType: PortalLoginType,
  authentication: PortalAuthentication,
): PortalAuthentication => {
  const allowSocial =
    loginType === 'masterLogin' || loginType === 'applicationLogin'

  return {
    ...authentication,
    formId: loginType === 'masterLogin' ? authentication.formId : 0,
    loginType:
      loginType === 'masterLogin'
        ? 'MASTER_LOGIN'
        : loginType === 'applicationLogin'
          ? 'APPLICATION_LOGIN'
          : 'EMAIL_LOGIN',
    passwordTypes:
      loginType === 'masterLogin' ? authentication.passwordTypes : 'OTP',
    signInType:
      allowSocial ? authentication.signInType : false,
    socialLogin: allowSocial && authentication.signInType
      ? authentication.socialLogin
      : [],
  }
}

const mapStoredRecord = (record: StoredPortalRecord): PortalConfig => {
  const settings = parseJson(record.settingsJson)
  const content = parseJson(record.contentJson)
  const authRaw = (settings.authentication || {}) as Record<string, unknown>
  const workflowsRaw = Array.isArray(content.workflows) ? content.workflows : []

  const authentication: PortalAuthentication = {
    ...emptyPortalAuthentication(),
    firstnameField: String(authRaw.firstnameField || ''),
    formId: (authRaw.formId as number | string) ?? 0,
    loginType: String(authRaw.loginType || 'EMAIL_LOGIN'),
    mailContent:
      authRaw.mailContent && typeof authRaw.mailContent === 'object'
        ? (authRaw.mailContent as PortalAuthentication['mailContent'])
        : { ...emptyMail },
    mailSubject:
      authRaw.mailSubject && typeof authRaw.mailSubject === 'object'
        ? (authRaw.mailSubject as PortalAuthentication['mailSubject'])
        : { ...emptyMail },
    noSignInValue: Boolean(authRaw.noSignInValue),
    notification: Boolean(authRaw.notification),
    passwordField: String(authRaw.passwordField || ''),
    passwordTypes:
      authRaw.passwordTypes === 'PASSWORD' ? 'PASSWORD' : 'OTP',
    signInType: Boolean(authRaw.signInType) || asStringArray(authRaw.socialLogin).length > 0,
    socialLogin: asStringArray(authRaw.socialLogin),
    usernameField: asStringArray(authRaw.usernameField),
  }

  const workflows: PortalWorkflowLink[] = workflowsRaw.map((item) => {
    const row = item as Record<string, unknown>
    return {
      category: Array.isArray(row.category) ? row.category : [],
      categoryFieldId: String(row.categoryFieldId || ''),
      categoryFieldMasterSync: Array.isArray(row.categoryFieldMasterSync)
        ? row.categoryFieldMasterSync
        : [],
      id: (row.id as number | string) ?? '',
      name: String(row.name || ''),
      processInfo: Array.isArray(row.processInfo) ? row.processInfo : [],
    }
  })

  const storedLoginType = String(settings.loginType || '')
  const storedMethods = asStringArray(settings.loginMethods)
  const loginType: PortalLoginType =
    storedLoginType === 'masterLogin' ||
    storedLoginType === 'applicationLogin' ||
    storedLoginType === 'emailOtp'
      ? storedLoginType
      : storedMethods.includes('masterLogin')
        ? 'masterLogin'
        : storedMethods.includes('applicationLogin')
          ? 'applicationLogin'
          : loginTypeFromAuth(authentication)

  const brandingRaw =
    settings.branding && typeof settings.branding === 'object'
      ? (settings.branding as PortalBrandingSnapshot)
      : {}

  return {
    authentication,
    branding: brandingRaw,
    createdAt: String(record.createdAt || ''),
    createdBy: String(record.createdBy || ''),
    createdByEmail: String(record.createdByEmail || ''),
    description: String(record.description || ''),
    displayValues: String(
      record.displayValues || settings.displayValues || '',
    ),
    howItWorks: Array.isArray(content.howItWorks) ? content.howItWorks : [],
    id: Number(record.id || 0),
    isDeleted: Boolean(record.isDeleted),
    loginType,
    modifiedAt: record.modifiedAt ?? null,
    modifiedBy: String(record.modifiedBy || '0'),
    modifiedByEmail: record.modifiedByEmail ?? null,
    name: String(record.name || ''),
    superUser: String(record.superUser || ''),
    tenantId: String(settings.tenantId || ''),
    workflow: String(record.workflow || workflows[0]?.name || ''),
    workflowId: record.workflowId ?? workflows[0]?.id ?? '',
    workflows,
  }
}

export const toStoredPortalRecord = (portal: PortalConfig): StoredPortalRecord => {
  const primaryWorkflow = portal.workflows[0]

  return {
    contentJson: JSON.stringify({
      howItWorks: portal.howItWorks,
      workflows: portal.workflows.map((workflow) => ({
        category: workflow.category,
        categoryFieldId: workflow.categoryFieldId,
        categoryFieldMasterSync: workflow.categoryFieldMasterSync,
        id: Number(workflow.id) || workflow.id,
        name: workflow.name,
        processInfo: workflow.processInfo,
      })),
    }),
    createdAt: portal.createdAt,
    createdBy: portal.createdBy,
    createdByEmail: portal.createdByEmail,
    description: portal.description,
    displayValues: portal.displayValues,
    id: portal.id,
    isDeleted: portal.isDeleted,
    modifiedAt: portal.modifiedAt,
    modifiedBy: portal.modifiedBy,
    modifiedByEmail: portal.modifiedByEmail,
    name: portal.name,
    settingsJson: JSON.stringify({
      authentication: portal.authentication,
      branding: portal.branding || {},
      displayValues: portal.displayValues,
      loginType: portal.loginType,
      tenantId: portal.tenantId || '',
    }),
    superUser: portal.superUser,
    workflow: primaryWorkflow?.name || portal.workflow,
    workflowId: primaryWorkflow?.id ?? portal.workflowId,
  }
}

const readRawList = (): StoredPortalRecord[] => {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(PORTAL_CONFIG_STORAGE_KEY)
    if (!stored) return []
    const parsed = JSON.parse(stored) as unknown
    return Array.isArray(parsed) ? (parsed as StoredPortalRecord[]) : []
  } catch {
    return []
  }
}

const writeRawList = (records: StoredPortalRecord[]) => {
  localStorage.setItem(PORTAL_CONFIG_STORAGE_KEY, JSON.stringify(records))
}

export const listPortalConfigs = (): PortalConfig[] => {
  const records = readRawList()
  if (!records.length) {
    writeRawList([toStoredPortalRecord(SEED_PORTAL)])
    return [SEED_PORTAL]
  }

  return records
    .map(mapStoredRecord)
    .filter((portal) => !portal.isDeleted)
}

export const savePortalConfig = (portal: PortalConfig) => {
  const records = readRawList()
  const nextRecord = toStoredPortalRecord(portal)
  const index = records.findIndex((item) => Number(item.id) === portal.id)

  if (index >= 0) {
    records[index] = { ...records[index], ...nextRecord }
  } else {
    records.unshift(nextRecord)
  }

  writeRawList(records)
  return portal
}

export const deletePortalConfig = (id: number | string) => {
  const records = readRawList()
  const next = records.filter((item) => Number(item.id) !== Number(id))
  writeRawList(next)
}

export const nextPortalId = () => {
  const records = readRawList()
  const maxId = records.reduce(
    (max, item) => Math.max(max, Number(item.id) || 0),
    69,
  )
  return maxId + 1
}

export const getPortalConfig = (id: string | number): PortalConfig | null => {
  const match = listPortalConfigs().find(
    (portal) => String(portal.id) === String(id),
  )
  return match || null
}

export const getPortalPublicUrl = (id: string | number) => {
  const path = `/portal/${id}`
  if (typeof window === 'undefined') return path
  return `${window.location.origin}${path}`
}
