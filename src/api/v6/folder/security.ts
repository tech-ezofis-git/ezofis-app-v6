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
    memoryCache.delete(`folder_${cleanRepoId}`)
    memoryCache.delete(`doc_${cleanRepoId}`)
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

export async function getFolderSecurity(repositoryId: string, useCache = true) {
  const cleanRepoId = sanitizeGuid(repositoryId)
  const cacheKey = `folder_${cleanRepoId}`

  if (useCache && memoryCache.has(cacheKey)) {
    const cached = memoryCache.get(cacheKey)!
    if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return { data: cached.data as GetFolderSecurityResponse, error: null, isCanceled: false, isFromCache: true, status: 200 }
    }
  }

  try {
    const { data, status } = await axiosV6.get<GetFolderSecurityResponse>(
      `/repositories/${cleanRepoId}/security/folder`,
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
      'Failed to load folder security policies'
    return { data: null, error: message, isCanceled: false, isFromCache: false, status }
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

export async function getFilterFields() {
  const cacheKey = 'filter_fields'
  if (memoryCache.has(cacheKey)) {
    const cached = memoryCache.get(cacheKey)!
    if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return { data: cached.data as string[], error: null, isCanceled: false, isFromCache: true, status: 200 }
    }
  }

  try {
    const { data, status } = await axiosV6.get<string[]>(
      '/items/filter-fields',
    )
    const result = Array.isArray(data) ? data : []
    if (result.length > 0) {
      memoryCache.set(cacheKey, { data: result, timestamp: Date.now() })
    }
    return { data: result, error: null, isCanceled: false, isFromCache: false, status }
  } catch (err: any) {
    if (isRequestCanceled(err)) {
      return { data: [], error: null, isCanceled: true, isFromCache: false, status: 0 }
    }
    return { data: [], error: err.message, isCanceled: false, isFromCache: false, status: err.response?.status }
  }
}
