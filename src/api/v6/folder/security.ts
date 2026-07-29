import { axiosV6 } from '../../axios'

export interface FolderPermissionFlags {
  view: boolean
  upload: boolean
  download: boolean
  print: boolean
  delete: boolean
  editMetadata: boolean
  editDocument: boolean
  checkOut: boolean
  checkIn: boolean
  sendForSignature: boolean
}

export interface FolderSecurityPolicy {
  userIds: string[]
  groupIds: string[]
  permissions: FolderPermissionFlags
  folderId?: string | null
}

export interface GetFolderSecurityResponse {
  repositoryId: string
  policies: FolderSecurityPolicy[]
}

export interface PutFolderSecurityPayload {
  folderId: null
  policies: FolderSecurityPolicy[]
}

export interface DocumentSecurityCondition {
  field: string
  op: string
  value: string
}

export interface DocumentSecurityRule {
  action: 'grant' | 'hide' | string
  match: 'all' | 'any' | string
  conditions: DocumentSecurityCondition[]
  userIds: string[]
  groupIds: string[]
}

export interface GetDocumentSecurityResponse {
  repositoryId: string
  rules: DocumentSecurityRule[]
}

export interface PutDocumentSecurityPayload {
  rules: DocumentSecurityRule[]
}

const sanitizeGuid = (id: string): string => {
  if (!id) return ''
  return id.replace(/[{}]/g, '').trim()
}

export const sanitizeGuidArray = (ids: string[]): string[] => {
  if (!Array.isArray(ids)) return []
  return ids.map(sanitizeGuid).filter(Boolean)
}

export async function getFolderSecurity(repositoryId: string) {
  try {
    const cleanRepoId = sanitizeGuid(repositoryId)
    const { data, status } = await axiosV6.get<GetFolderSecurityResponse>(
      `/repositories/${cleanRepoId}/security/folder`,
    )
    return { data, error: null, status }
  } catch (err: any) {
    const status = err.response?.status
    const message =
      err.response?.data?.message ||
      err.response?.data?.title ||
      err.message ||
      'Failed to load folder security policies'
    return { data: null, error: message, status }
  }
}

export async function putFolderSecurity(
  repositoryId: string,
  payload: PutFolderSecurityPayload,
) {
  try {
    const cleanRepoId = sanitizeGuid(repositoryId)
    const sanitizedPayload: PutFolderSecurityPayload = {
      folderId: null,
      policies: (payload.policies || []).map((policy) => ({
        ...policy,
        groupIds: sanitizeGuidArray(policy.groupIds || []),
        userIds: sanitizeGuidArray(policy.userIds || []),
      })),
    }

    const { data, status } = await axiosV6.put(
      `/repositories/${cleanRepoId}/security/folder`,
      sanitizedPayload,
    )
    return { data, error: null, status }
  } catch (err: any) {
    const status = err.response?.status
    const message =
      err.response?.data?.message ||
      err.response?.data?.title ||
      err.message ||
      'Failed to update folder security policies'
    return { data: null, error: message, status }
  }
}

export async function getDocumentSecurity(repositoryId: string) {
  try {
    const cleanRepoId = sanitizeGuid(repositoryId)
    const { data, status } = await axiosV6.get<GetDocumentSecurityResponse>(
      `/repositories/${cleanRepoId}/security/documents`,
    )
    return { data, error: null, status }
  } catch (err: any) {
    const status = err.response?.status
    const message =
      err.response?.data?.message ||
      err.response?.data?.title ||
      err.message ||
      'Failed to load document security rules'
    return { data: null, error: message, status }
  }
}

export async function putDocumentSecurity(
  repositoryId: string,
  payload: PutDocumentSecurityPayload,
) {
  try {
    const cleanRepoId = sanitizeGuid(repositoryId)
    const sanitizedPayload: PutDocumentSecurityPayload = {
      rules: (payload.rules || []).map((rule) => ({
        ...rule,
        action: String(rule.action || 'grant').toLowerCase(),
        conditions: (rule.conditions || []).map((cond) => ({
          field: String(cond.field || '').trim(),
          op: String(cond.op || 'equals').toLowerCase(),
          value: cond.value !== undefined && cond.value !== null ? String(cond.value) : '',
        })),
        groupIds: sanitizeGuidArray(rule.groupIds || []),
        match: String(rule.match || 'all').toLowerCase(),
        userIds: sanitizeGuidArray(rule.userIds || []),
      })),
    }

    const { data, status } = await axiosV6.put(
      `/repositories/${cleanRepoId}/security/documents`,
      sanitizedPayload,
    )
    return { data, error: null, status }
  } catch (err: any) {
    const status = err.response?.status
    const message =
      err.response?.data?.message ||
      err.response?.data?.title ||
      err.message ||
      'Failed to update document security rules'
    return { data: null, error: message, status }
  }
}

export async function getFilterFields() {
  try {
    const { data, status } = await axiosV6.get<string[]>(
      '/items/filter-fields',
    )
    return { data: Array.isArray(data) ? data : [], error: null, status }
  } catch (err: any) {
    return { data: [], error: err.message, status: err.response?.status }
  }
}
