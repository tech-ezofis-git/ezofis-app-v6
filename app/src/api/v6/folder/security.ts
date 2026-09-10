import axios from 'axios'
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

const memoryCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes TTL

export function clearSecurityCache(repositoryId?: string) {
  if (repositoryId) {
    const cleanRepoId = sanitizeGuid(repositoryId)
    for (const key of [...memoryCache.keys()]) {
      if (
        key === `folder_${cleanRepoId}` ||
        key.startsWith(`folder_${cleanRepoId}:`) ||
        key === `doc_${cleanRepoId}` ||
        key === `filter_fields_${cleanRepoId}`
      ) {
        memoryCache.delete(key)
      }
    }
  } else {
    memoryCache.clear()
  }
}

const sanitizeGuid = (id: string): string => {
  if (!id) return ''
  return id.replace(/[{}]/g, '').trim()
}

export const sanitizeGuidArray = (ids: string[]): string[] => {
  if (!Array.isArray(ids)) return []
  return ids.map(sanitizeGuid).filter(Boolean)
}

const isRequestCanceled = (err: any): boolean => {
  return (
    axios.isCancel(err) ||
    err?.name === 'CanceledError' ||
    err?.code === 'ERR_CANCELED' ||
    String(err?.message || '').toLowerCase().includes('canceled')
  )
}

export const FOLDER_PERMISSIONS_ALLOW_ALL: FolderPermissionFlags = {
  view: true,
  upload: true,
  download: true,
  print: true,
  delete: true,
  editMetadata: true,
  editDocument: true,
  checkOut: true,
  checkIn: true,
  sendForSignature: true,
}

export const FOLDER_PERMISSIONS_VIEW_ONLY: FolderPermissionFlags = {
  view: true,
  upload: false,
  download: false,
  print: false,
  delete: false,
  editMetadata: false,
  editDocument: false,
  checkOut: false,
  checkIn: false,
  sendForSignature: false,
}

const normalizePolicyFolderId = (folderId?: string | null) => {
  const cleaned = sanitizeGuid(String(folderId || ''))
  return cleaned || null
}

const policyAppliesToUser = (
  policy: FolderSecurityPolicy,
  userId: string,
  userGroupIds: string[] = [],
) => {
  const userIds = sanitizeGuidArray(policy.userIds || [])
  const groupIds = sanitizeGuidArray(policy.groupIds || [])
  if (!userIds.length && !groupIds.length) return false
  if (userId && userIds.includes(userId)) return true
  if (
    userGroupIds.length &&
    groupIds.some((groupId) => userGroupIds.includes(groupId))
  ) {
    return true
  }
  return false
}

const mergePermissionFlags = (
  flags: FolderPermissionFlags[],
): FolderPermissionFlags => {
  if (!flags.length) return { ...FOLDER_PERMISSIONS_VIEW_ONLY }
  return flags.reduce<FolderPermissionFlags>(
    (acc, next) => ({
      view: acc.view || Boolean(next.view),
      upload: acc.upload || Boolean(next.upload),
      download: acc.download || Boolean(next.download),
      print: acc.print || Boolean(next.print),
      delete: acc.delete || Boolean(next.delete),
      editMetadata: acc.editMetadata || Boolean(next.editMetadata),
      editDocument: acc.editDocument || Boolean(next.editDocument),
      checkOut: acc.checkOut || Boolean(next.checkOut),
      checkIn: acc.checkIn || Boolean(next.checkIn),
      sendForSignature:
        acc.sendForSignature || Boolean(next.sendForSignature),
    }),
    { ...FOLDER_PERMISSIONS_VIEW_ONLY },
  )
}

/**
 * Resolve the current user's effective folder permissions from security policies.
 * Prefers folder-scoped policies over repository-wide (`folderId: null`) ones.
 */
export function resolveEffectiveFolderPermissions(args: {
  policies?: FolderSecurityPolicy[] | null
  userId?: string | null
  userGroupIds?: string[]
  folderId?: string | null
  /** When true (e.g. admin), grant full access. */
  allowAll?: boolean
}): FolderPermissionFlags {
  if (args.allowAll) return { ...FOLDER_PERMISSIONS_ALLOW_ALL }

  const policies = Array.isArray(args.policies) ? args.policies : []
  if (!policies.length) return { ...FOLDER_PERMISSIONS_ALLOW_ALL }

  const userId = sanitizeGuid(String(args.userId || ''))
  const userGroupIds = sanitizeGuidArray(args.userGroupIds || [])
  const targetFolderId = normalizePolicyFolderId(args.folderId)

  const matching = policies.filter((policy) =>
    policyAppliesToUser(policy, userId, userGroupIds),
  )
  if (!matching.length) return { ...FOLDER_PERMISSIONS_VIEW_ONLY }

  const folderScoped = matching.filter(
    (policy) => normalizePolicyFolderId(policy.folderId) === targetFolderId,
  )
  const repoScoped = matching.filter(
    (policy) => normalizePolicyFolderId(policy.folderId) == null,
  )

  const selected =
    targetFolderId && folderScoped.length
      ? folderScoped
      : folderScoped.length
        ? folderScoped
        : repoScoped.length
          ? repoScoped
          : matching

  return mergePermissionFlags(
    selected.map(
      (policy) => policy.permissions || FOLDER_PERMISSIONS_VIEW_ONLY,
    ),
  )
}

export async function getFolderSecurity(
  repositoryId: string,
  useCache = true,
  folderId?: string | null,
) {
  const cleanRepoId = sanitizeGuid(repositoryId)
  const cleanFolderId = normalizePolicyFolderId(folderId)
  const cacheKey = cleanFolderId
    ? `folder_${cleanRepoId}:${cleanFolderId}`
    : `folder_${cleanRepoId}`

  if (useCache && memoryCache.has(cacheKey)) {
    const cached = memoryCache.get(cacheKey)!
    if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return {
        data: cached.data as GetFolderSecurityResponse,
        error: null,
        isCanceled: false,
        isFromCache: true,
        status: 200,
      }
    }
  }

  try {
    const { data, status } = await axiosV6.get<GetFolderSecurityResponse>(
      `/repositories/${cleanRepoId}/security/folder`,
      {
        params: cleanFolderId ? { folderId: cleanFolderId } : undefined,
      },
    )
    if (data) {
      memoryCache.set(cacheKey, { data, timestamp: Date.now() })
    }
    return { data, error: null, isCanceled: false, isFromCache: false, status }
  } catch (err: any) {
    if (isRequestCanceled(err)) {
      return {
        data: null,
        error: null,
        isCanceled: true,
        isFromCache: false,
        status: 0,
      }
    }
    const status = err.response?.status
    const message =
      err.response?.data?.message ||
      err.response?.data?.title ||
      err.message ||
      'Failed to load folder security policies'
    return {
      data: null,
      error: message,
      isCanceled: false,
      isFromCache: false,
      status,
    }
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
    clearSecurityCache(repositoryId)
    return { data, error: null, isCanceled: false, status }
  } catch (err: any) {
    if (isRequestCanceled(err)) {
      return { data: null, error: null, isCanceled: true, status: 0 }
    }
    const status = err.response?.status
    const message =
      err.response?.data?.message ||
      err.response?.data?.title ||
      err.message ||
      'Failed to update folder security policies'
    return { data: null, error: message, isCanceled: false, status }
  }
}

export async function getDocumentSecurity(repositoryId: string, useCache = true) {
  const cleanRepoId = sanitizeGuid(repositoryId)
  const cacheKey = `doc_${cleanRepoId}`

  if (useCache && memoryCache.has(cacheKey)) {
    const cached = memoryCache.get(cacheKey)!
    if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return { data: cached.data as GetDocumentSecurityResponse, error: null, isCanceled: false, isFromCache: true, status: 200 }
    }
  }

  try {
    const { data, status } = await axiosV6.get<GetDocumentSecurityResponse>(
      `/repositories/${cleanRepoId}/security/documents`,
    )
    if (data) {
      memoryCache.set(cacheKey, { data, timestamp: Date.now() })
    }
    return { data, error: null, isCanceled: false, isFromCache: false, status }
  } catch (err: any) {
    if (isRequestCanceled(err)) {
      return { data: null, error: null, isCanceled: true, isFromCache: false, status: 0 }
    }
    const status = err.response?.status
    const message =
      err.response?.data?.message ||
      err.response?.data?.title ||
      err.message ||
      'Failed to load document security rules'
    return { data: null, error: message, isCanceled: false, isFromCache: false, status }
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
    clearSecurityCache(repositoryId)
    return { data, error: null, isCanceled: false, status }
  } catch (err: any) {
    if (isRequestCanceled(err)) {
      return { data: null, error: null, isCanceled: true, status: 0 }
    }
    const status = err.response?.status
    const message =
      err.response?.data?.message ||
      err.response?.data?.title ||
      err.message ||
      'Failed to update document security rules'
    return { data: null, error: message, isCanceled: false, status }
  }
}

export async function getFilterFields(repositoryId: string) {
  const cleanRepoId = sanitizeGuid(repositoryId)
  if (!cleanRepoId) {
    return {
      data: [] as string[],
      error: 'Repository id is required',
      isCanceled: false,
      isFromCache: false,
      status: 0,
    }
  }

  const cacheKey = `filter_fields_${cleanRepoId}`
  if (memoryCache.has(cacheKey)) {
    const cached = memoryCache.get(cacheKey)!
    if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return {
        data: cached.data as string[],
        error: null,
        isCanceled: false,
        isFromCache: true,
        status: 200,
      }
    }
  }

  try {
    const { data, status } = await axiosV6.get(
      `/repositories/${cleanRepoId}/items/filter-fields`,
    )

    const payload = data?.data ?? data
    let result: string[] = []

    if (Array.isArray(payload)) {
      result = payload
        .map((item) => {
          if (typeof item === 'string') return item.trim()
          return String(
            item?.sqlColumnName || item?.name || item?.label || '',
          ).trim()
        })
        .filter(Boolean)
    } else if (Array.isArray(payload?.fields)) {
      result = payload.fields
        .map((field: { sqlColumnName?: string; name?: string; label?: string }) =>
          String(field?.sqlColumnName || field?.name || field?.label || '').trim(),
        )
        .filter(Boolean)
    }

    result = Array.from(new Set(result))

    if (result.length > 0) {
      memoryCache.set(cacheKey, { data: result, timestamp: Date.now() })
    }
    return {
      data: result,
      error: null,
      isCanceled: false,
      isFromCache: false,
      status,
    }
  } catch (err: any) {
    if (isRequestCanceled(err)) {
      return {
        data: [] as string[],
        error: null,
        isCanceled: true,
        isFromCache: false,
        status: 0,
      }
    }
    return {
      data: [] as string[],
      error: err.message,
      isCanceled: false,
      isFromCache: false,
      status: err.response?.status,
    }
  }
}
