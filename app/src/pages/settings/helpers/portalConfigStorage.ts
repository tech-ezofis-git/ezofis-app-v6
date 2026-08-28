import {
  createPortalJson,
  getPortalJson,
  type PortalJsonIds,
  updatePortalJson,
} from '@/api/v6/portalJson'

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

export type PortalLoginType = 'applicationLogin' | 'emailOtp' | 'masterLogin'

export type PortalPasswordType = 'OTP' | 'PASSWORD'

export type PortalWorkflowLink = {
  category: unknown[]
  categoryFieldId: string
  categoryFieldMasterSync: unknown[]
  id: number | string
  name: string
  processInfo: unknown[]
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
  if (authentication.loginType === 'APPLICATION_LOGIN')
    return 'applicationLogin'
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
    signInType: allowSocial ? authentication.signInType : false,
    socialLogin:
      allowSocial && authentication.signInType
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
    passwordTypes: authRaw.passwordTypes === 'PASSWORD' ? 'PASSWORD' : 'OTP',
    signInType:
      Boolean(authRaw.signInType) ||
      asStringArray(authRaw.socialLogin).length > 0,
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
      name: String(
        row.name || row.title || row.workflowName || row.workflow || '',
      ),
      processInfo: Array.isArray(row.processInfo) ? row.processInfo : [],
    }
  })

  if (workflows[0] && !workflows[0].name) {
    workflows[0] = {
      ...workflows[0],
      name: String(record.workflow || record.workflowId || workflows[0].id),
    }
  }

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
    displayValues: String(record.displayValues || settings.displayValues || ''),
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

export const toStoredPortalRecord = (
  portal: PortalConfig,
): StoredPortalRecord => {
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
    superUser: portal.superUser,
    workflow: primaryWorkflow?.name || portal.workflow,
    workflowId: primaryWorkflow?.id ?? portal.workflowId,
    settingsJson: JSON.stringify({
      authentication: portal.authentication,
      branding: portal.branding || {},
      displayValues: portal.displayValues,
      loginType: portal.loginType,
      tenantId: portal.tenantId || '',
    }),
  }
}

const parseStoredRecords = (portalJson: string): StoredPortalRecord[] => {
  if (!portalJson) return []
  try {
    const parsed = JSON.parse(portalJson) as unknown
    if (Array.isArray(parsed)) return parsed as StoredPortalRecord[]
    if (parsed && typeof parsed === 'object') {
      const record = parsed as Record<string, unknown>
      if (Array.isArray(record.portals)) {
        return record.portals as StoredPortalRecord[]
      }
      if (Array.isArray(record.records)) {
        return record.records as StoredPortalRecord[]
      }
      if (
        'contentJson' in record ||
        'settingsJson' in record ||
        'id' in record
      ) {
        return [parsed as StoredPortalRecord]
      }
    }
  } catch {
    return []
  }
  return []
}

const toPortalConfigs = (records: StoredPortalRecord[]) =>
  records.map(mapStoredRecord).filter((portal) => !portal.isDeleted)

let remoteRecordExists = false

const persistRecords = async (
  records: StoredPortalRecord[],
  ids?: PortalJsonIds,
) => {
  const portalJson = JSON.stringify(records)
  const result = remoteRecordExists
    ? await updatePortalJson(portalJson, ids)
    : await createPortalJson(portalJson, ids)

  if (!result.error) remoteRecordExists = true
  return result
}

export const listPortalConfigs = async (ids?: PortalJsonIds) => {
  const response: { data: PortalConfig[]; error: string } = {
    data: [],
    error: '',
  }

  const result = await getPortalJson(ids)
  if (result.error) {
    response.error = result.error
    return response
  }

  if (result.notFound) {
    remoteRecordExists = false
    return response
  }

  const records = parseStoredRecords(result.data?.portalJson || '')
  remoteRecordExists = true
  response.data = toPortalConfigs(records)
  return response
}

export const savePortalConfig = async (
  portal: PortalConfig,
  ids?: PortalJsonIds,
) => {
  const listedResult = await getPortalJson(ids)
  if (listedResult.error) return { error: listedResult.error }

  const records = listedResult.notFound
    ? []
    : parseStoredRecords(listedResult.data?.portalJson || '')
  remoteRecordExists = !listedResult.notFound

  const nextRecord = toStoredPortalRecord(portal)
  const index = records.findIndex((item) => Number(item.id) === portal.id)

  if (index >= 0) {
    records[index] = { ...records[index], ...nextRecord }
  } else {
    records.unshift(nextRecord)
  }

  const persisted = await persistRecords(records, ids)
  return { error: persisted.error }
}

export const deletePortalConfig = async (
  id: number | string,
  ids?: PortalJsonIds,
) => {
  const listedResult = await getPortalJson(ids)
  if (listedResult.error) return { error: listedResult.error }

  const records = listedResult.notFound
    ? []
    : parseStoredRecords(listedResult.data?.portalJson || '')
  remoteRecordExists = !listedResult.notFound

  const next = records.filter((item) => Number(item.id) !== Number(id))
  if (next.length === records.length) return { error: '' }

  const persisted = await persistRecords(next, ids)
  return { error: persisted.error }
}

export const nextPortalId = (portals: Array<{ id?: number }> = []) => {
  const maxId = portals.reduce(
    (max, item) => Math.max(max, Number(item.id) || 0),
    0,
  )
  return maxId + 1
}

export const getPortalConfig = async (
  id: string | number,
  ids?: PortalJsonIds,
) => {
  const listed = await listPortalConfigs(ids)
  if (listed.error) {
    return { data: null as PortalConfig | null, error: listed.error }
  }

  const match =
    listed.data.find((portal) => String(portal.id) === String(id)) || null
  return { data: match, error: '' }
}

export const getPortalPublicUrl = (
  id: string | number,
  ids?: PortalJsonIds,
) => {
  const path = `/portal/${id}`
  const params = new URLSearchParams()
  if (ids?.tenantId) params.set('tenantId', ids.tenantId)
  if (ids?.userId) params.set('userId', ids.userId)
  const query = params.toString()
  const suffix = query ? `?${query}` : ''

  if (typeof window === 'undefined') return `${path}${suffix}`
  return `${window.location.origin}${path}${suffix}`
}
