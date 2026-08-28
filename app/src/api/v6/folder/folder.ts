import axios from 'axios'
import authUserStore from '../../../stores/authUserStore'
import { setToLocalStorage } from '../../../utils/local-storage'
import { axiosV6 } from '../../axios'

const isRequestCanceled = (error: unknown) => {
  const err = error as { code?: string; name?: string; message?: string }
  return (
    axios.isCancel(error) ||
    err?.name === 'CanceledError' ||
    err?.code === 'ERR_CANCELED' ||
    /cancel/i.test(String(err?.message || ''))
  )
}

export interface BrowseChildGroupDto {
  name: string
  dateModified?: string | null
  itemCount?: number
}

export interface BrowseChildrenDto {
  level: number
  data?: Record<string, any>[]
  files?: PagedDto<Record<string, any>>
  groupField?: string
  groupFieldName?: string
  groups?: PagedDto<BrowseChildGroupDto>
  isLeafLevel?: boolean
  items?: PagedDto<Record<string, any>>
  parentFilters?: Record<string, string>
  pathId?: string
  pathLabel?: string
}

export interface BrowseFolderFieldDto {
  level: number
  name: string
  sqlColumnName: string
}

export interface BrowsePathDto {
  fieldOrder: string[]
  id: string
  label: string
}

export interface BrowseStructureDto {
  browsePaths: BrowsePathDto[]
  folderFields: BrowseFolderFieldDto[]
}

export interface PagedDto<T> {
  data?: T[]
  hasMore?: boolean
  nextCursor?: string | null
  page?: number
  pageSize?: number
  totalCount?: number
  totalPages?: number
  totalSkipped?: boolean
}

export interface RepositoryDto {
  id: string
  name: string
  createdAtUtc?: any
  createdBy?: any
  createdByName?: any
  description?: string
  fields?: RepositoryFieldDto[]
  itemsTableName?: string
  modifiedBy?: any
  modifiedByName?: any
  stageTableName?: string
  storageDrive?: string
  storageProviderId?: string
  fileCount?: any
}

export interface RepositoryFieldDto {
  dataType: string
  id: string
  includeInFolderStructure: boolean
  isMandatory: boolean
  level: number
  name: string
  sqlColumnName: string
  iconKey?: string
  orderId?: number
}

export interface V6SignupPayload {
  name: string
  appVersion?: string
  databaseName?: string | null
  email?: string
  firstName?: string
  lastName?: string
  licenseType?: number
  loginType?: string
  organizationName?: string
  password?: string
  platform?: string
  signupSource?: string
  tenantId?: string | null
}

const unwrap = (payload: any) => payload ?? payload

const signUp = async (payload: V6SignupPayload) => {
  const response: any = { data: '', error: '' }

  try {
    const { data, status } = await axiosV6({
      data: JSON.stringify(payload),
      method: 'POST',
      url: `/Signup`,
    })

    if (status !== 201 && status !== 200) throw 'invalid status code'

    if (data) {
      setToLocalStorage(data, 'identity')
      const { setIdentity } = authUserStore.getState()
      setIdentity(data)
      response.data = 'Success'
    } else {
      response.error = 'No data returned'
    }
  } catch (e: any) {
    console.error(e)
    response.error = e?.response?.data || 'error in sign up'
  }

  return response
}

export const sendMailOTP = async (payload: {
  email: string
  requiredOTP?: boolean
}) => {
  const response: any = { data: '', error: '' }

  try {
    const { data, status } = await axiosV6({
      data: JSON.stringify(payload),
      method: 'POST',
      url: `/tenant/checkAuthenticate`,
    })

    if (status !== 201 && status !== 200 && status !== 400)
      throw 'invalid status code'

    if (data === 'OTP sent succeeded' || data === 'success') {
      response.data = 'success'
      response.status = status
    } else {
      response.error = 'error in verify mail'
    }
  } catch (e: any) {
    console.error(e)
    response.error = e?.response?.data || 'error in verify mail'
    response.status = e?.response?.status
  }

  return response
}

export const verifyMailOTP = async (payload: {
  email: string
  otp: string
}) => {
  const response: any = { data: '', error: '' }

  try {
    const { data, status } = await axiosV6({
      data: JSON.stringify(payload),
      method: 'POST',
      url: `/tenant/validateOTP`,
    })

    if (status !== 201 && status !== 200) throw 'invalid status code'
    response.data = data === 'success' ? 'Success' : ''
    response.error = data === 'success' ? '' : 'error in verify mail'
  } catch (e: any) {
    console.error(e)
    response.error = e?.response?.data || 'error in verify mail'
  }

  return response
}

export const getRepositorys = async () => {
  const response: any = { data: null, error: '', canceled: false }

  try {
    const { data, status } = await axiosV6({
      method: 'GET',
      url: `/repositories`,
    })

    if (status !== 200) throw 'invalid status code'
    response.data = unwrap(data)
  } catch (e: any) {
    // Duplicate identical GETs are aborted by axios interceptors (e.g. Strict Mode).
    if (isRequestCanceled(e)) {
      response.canceled = true
      return response
    }
    console.error(e)
    response.error = e?.response?.data || 'error fetching repositories'
  }

  return response
}

export const getRepositoryById = async (id: string) => {
  const response: any = { data: null, error: '' }

  try {
    const { data, status } = await axiosV6({
      method: 'GET',
      // Folder explorer loads repository details + content in parallel; do not
      // abort one of those identical GETs or the UI surfaces a false error.
      skipCancellation: true,
      url: `/repositories/${id}`,
    })

    if (status !== 200) throw 'invalid status code'
    response.data = unwrap(data)
  } catch (e: any) {
    if (isRequestCanceled(e)) {
      response.canceled = true
      return response
    }
    console.error(e)
    response.error = e?.response?.data || 'error fetching repository'
  }

  return response
}

export const getRepositoryBrowseStructure = async (id: string) => {
  const response: any = { data: null, error: '' }

  try {
    const { data, status } = await axiosV6({
      method: 'GET',
      skipCancellation: true,
      url: `/repositories/${id}/browse/structure`,
    })

    if (status !== 200) throw 'invalid status code'
    response.data = unwrap(data)
  } catch (e: any) {
    if (isRequestCanceled(e)) {
      response.canceled = true
      return response
    }
    console.error(e)
    response.error =
      e?.response?.data || 'error fetching repository browse structure'
  }

  return response
}

export const getRepositoryBrowseChildren = async (payload: {
  id: string
  page?: number
  pageSize?: number
  parentFilters?: Record<string, string>
  pathId?: string
  search?: string
}) => {
  const response: any = { data: null, error: '' }

  try {
    const params: Record<string, any> = {
      Page: payload.page ?? 1,
      PageSize: payload.pageSize ?? 100,
    }

    if (payload.pathId) params.PathId = payload.pathId
    if (payload.search) params.Search = payload.search

    /*
      Key point:
      First level  => ParentFilters = {}
      Second level => ParentFilters = {"Supplier":"Acme Supplies"}
      Third level  => ParentFilters = {"Supplier":"Acme Supplies","DocumentType":"Invoice"}
    */
    params.ParentFilters = JSON.stringify(payload.parentFilters ?? {})

    const { data, status } = await axiosV6({
      method: 'GET',
      params,
      url: `/repositories/${payload.id}/browse/children`,
    })

    if (status !== 200) throw 'invalid status code'
    response.data = unwrap(data)
  } catch (e: any) {
    // Identical in-flight requests are aborted by axios; don't treat as failure.
    if (isRequestCanceled(e)) {
      response.canceled = true
      return response
    }
    console.error(e)
    response.error = e?.response?.data || 'error fetching repository children'
  }

  return response
}

export const login = async (payload: {
  email: string
  password: string
  tenantId: string
}) => {
  const response: any = { data: null, error: '' }

  try {
    const { data, status } = await axiosV6({
      data: JSON.stringify({
        email: payload.email,
        password: payload.password,
      }),
      headers: { 'X-Tenant-Id': payload.tenantId },
      method: 'POST',
      url: `/auth/ezofis/login`,
    })

    if (status !== 200) throw 'invalid status code'

    if (data) {
      setToLocalStorage(data, 'identity')
      const { setIdentity } = authUserStore.getState()
      setIdentity(data)
      response.data = 'Success'
    } else {
      response.error = 'No data returned'
    }
  } catch (e: any) {
    console.error(e)
    response.error = e?.response?.data || 'error in login'
  }

  return response
}

export const authApiV6 = {
  login,
  sendMailOTP,
  signUp,
  verifyMailOTP,
  getRepositoryBrowseChildren,
  getRepositoryBrowseStructure,
  getRepositoryById,
  getRepositorys,
}

export default authApiV6

export interface RepositoryItemsQuery {
  id: string
  cursor?: string | null
  dateFrom?: string
  dateTo?: string
  filters?: Record<string, string | string[]>
  page?: number
  pageSize?: number
  search?: string
  skipTotal?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc' | string
}

export interface RepositoryItemWorkspaceDto {
  fileName: string
  id: string
  DetailsRow?: Array<{
    fields?: Array<{ key: string; label: string; value: any }>
    sectionKey: string
    title: string
  }> | null
  fileSize?: number
  fileType?: string
  fileUrl?: string
  lineItems?: Array<Record<string, any>> | null
  storageProviderCode?: string
  storageProviderId?: string
}

const EXCLUDED_ITEM_FILTER_FIELD_DATA_TYPES = new Set([
  'FILE_UPLOAD',
  'DYNAMIC_TABLE',
  'TABLE',
])

export interface RepositoryItemFilterField {
  name: string
  sqlColumnName: string
  dataType: string
}

export interface RepositoryItemFilterFieldsResponse {
  fields: RepositoryItemFilterField[]
}

export const getRepositoryItemFilterFields = async (repositoryId: string) => {
  const response: {
    data: RepositoryItemFilterFieldsResponse | null
    error: string
  } = {
    data: null,
    error: '',
  }

  try {
    const { data, status } = await axiosV6({
      method: 'GET',
      skipCancellation: true,
      url: `/repositories/${repositoryId}/items/filter-fields`,
    })

    if (status !== 200) throw new Error('invalid status code')

    const payload = unwrap(data) as RepositoryItemFilterFieldsResponse
    const fields = Array.isArray(payload?.fields)
      ? payload.fields.filter(
        (field) =>
          Boolean(field?.sqlColumnName || field?.name) &&
          !EXCLUDED_ITEM_FILTER_FIELD_DATA_TYPES.has(
            String(field?.dataType || '').toUpperCase(),
          ),
      )
      : []

    response.data = { fields }
  } catch (e: any) {
    if (isRequestCanceled(e)) {
      return response
    }
    console.error(e)
    response.error =
      e?.response?.data || e?.message || 'error fetching item filter fields'
  }

  return response
}

export interface RepositoryItemFacet {
  value: string
  count: number
}

export const getRepositoryItemFacets = async (payload: {
  repositoryId: string
  fieldName: string
  limit?: number
  scopeFilters?: Record<string, string | string[]>
}) => {
  const response: { data: RepositoryItemFacet[]; error: string } = {
    data: [],
    error: '',
  }

  const repositoryId = String(payload.repositoryId || '').trim()
  const fieldName = String(payload.fieldName || '').trim()
  if (!repositoryId || !fieldName) {
    response.error = 'repositoryId and fieldName are required'
    return response
  }

  try {
    const params: Record<string, any> = {}
    if (payload.limit != null) params.limit = payload.limit
    if (payload.scopeFilters && Object.keys(payload.scopeFilters).length > 0) {
      params.scopeFilters = JSON.stringify(payload.scopeFilters)
    }

    const { data, status } = await axiosV6({
      method: 'GET',
      params,
      skipCancellation: true,
      url: `/repositories/${repositoryId}/items/facets/${encodeURIComponent(fieldName)}`,
    })

    if (status !== 200) throw new Error('invalid status code')

    const payloadData = unwrap(data)
    const rows = Array.isArray(payloadData)
      ? payloadData
      : Array.isArray(payloadData?.facets)
        ? payloadData.facets
        : Array.isArray(payloadData?.data)
          ? payloadData.data
          : []

    response.data = rows
      .map((row: any) => {
        const value = String(row?.value ?? '').trim()
        if (!value) return null
        const count = Number(row?.count)
        return {
          count: Number.isFinite(count) ? count : 0,
          value,
        } as RepositoryItemFacet
      })
      .filter(Boolean) as RepositoryItemFacet[]
  } catch (e: any) {
    if (isRequestCanceled(e)) {
      return response
    }
    console.error(e)
    response.error =
      e?.response?.data || e?.message || 'error fetching item facets'
  }

  return response
}

export const getRepositoryItems = async (payload: RepositoryItemsQuery) => {
  const response: any = { data: null, error: '' }

  try {
    const params: Record<string, any> = {
      Filters: JSON.stringify(payload.filters ?? {}),
      Page: payload.page ?? 1,
      PageSize: payload.pageSize ?? 50,
      SkipTotal: false,
    }

    if (payload.search) params.Search = payload.search
    if (payload.dateFrom) params.DateFrom = payload.dateFrom
    if (payload.dateTo) params.DateTo = payload.dateTo
    if (payload.sortBy) params.SortBy = payload.sortBy
    if (payload.sortOrder) params.SortOrder = payload.sortOrder
    // if (payload.cursor) params.Cursor = payload.cursor

    const { data, status } = await axiosV6({
      method: 'GET',
      params,
      url: `/repositories/${payload.id}/items`,
    })

    if (status !== 200) throw 'invalid status code'
    response.data = unwrap(data)
  } catch (e: any) {
    console.error(e)
    response.error = e?.response?.data || 'error fetching repository items'
  }

  return response
}

export const getRepositoryItemWorkspace = async (payload: {
  itemId: string
  repositoryId: string
  shareToken?: string
  tenantId?: string
}) => {
  const response: any = { data: null, error: '' }

  try {
    const headers: Record<string, string> = {}
    if (payload.tenantId) headers['X-Tenant-Id'] = payload.tenantId

    const { data, status } = await axiosV6({
      headers: Object.keys(headers).length ? headers : undefined,
      method: 'GET',
      params: payload.shareToken
        ? { sharedtoken: payload.shareToken }
        : undefined,
      url: `/repositories/${payload.repositoryId}/items/${payload.itemId}/workspace`,
    })

    if (status !== 200) throw 'invalid status code'
    response.data = unwrap(data)
  } catch (e: any) {
    console.error(e)
    response.error = e?.response?.data || 'error fetching document workspace'
  }

  return response
}

export type RepositoryShareAction = 0 | 1

export type RepositoryShareResult = {
  action?: number
  expiresAtUtc?: string
  guestUserId?: string
  isNew?: boolean
  permission?: string
  recipientEmail?: string
  requiresPasswordSetup?: boolean
  shareId?: string
  shareToken?: string
  shareUrl?: string
  sourceItemId?: string
  sourceRepositoryId?: string
  sourceTenantId?: string
}

export type SharedWithMeItem = {
  action?: number
  expiresAtUtc?: string
  fileName?: string
  permission?: string
  recipientEmail?: string
  shareId?: string
  shareToken?: string
  shareUrl?: string
  sharedAtUtc?: string
  sourceItemId?: string
  sourceOrganizationName?: string
  sourceRepositoryId?: string
  sourceTenantId?: string
}

const getFolderTenantHeaders = (tenantId?: string) => {
  const resolved =
    tenantId ||
    authUserStore.getState().session?.tenantId ||
    authUserStore.getState().identity?.tenantId ||
    ''
  return resolved ? { 'X-Tenant-Id': resolved } : undefined
}

const normalizeShareList = (payload: unknown): SharedWithMeItem[] => {
  if (Array.isArray(payload)) return payload as SharedWithMeItem[]
  if (!payload || typeof payload !== 'object') return []
  const record = payload as Record<string, unknown>
  if (Array.isArray(record.items)) return record.items as SharedWithMeItem[]
  if (Array.isArray(record.data)) return record.data as SharedWithMeItem[]
  if (Array.isArray(record.shares)) return record.shares as SharedWithMeItem[]
  return []
}

export const shareRepositoryItem = async (payload: {
  action: RepositoryShareAction
  email: string
  itemId: string
  message?: string
  repositoryId: string
  tenantId?: string
}) => {
  const response: { data: RepositoryShareResult | null; error: string } = {
    data: null,
    error: '',
  }

  try {
    const { data, status } = await axiosV6({
      data: JSON.stringify({
        action: payload.action,
        email: payload.email,
        message: payload.message || '',
      }),
      headers: getFolderTenantHeaders(payload.tenantId),
      method: 'POST',
      url: `/repositories/${payload.repositoryId}/items/${payload.itemId}/share`,
    })

    if (status !== 200 && status !== 201) throw 'invalid status code'
    response.data = (unwrap(data) || data) as RepositoryShareResult
  } catch (e: any) {
    console.error(e)
    response.error =
      e?.response?.data?.message ||
      e?.response?.data ||
      'error sharing repository item'
  }

  return response
}

/** People this file was shared with (sharer-side list). */
export const getRepositoryItemShares = async (payload: {
  itemId: string
  repositoryId: string
  tenantId?: string
}) => {
  const response: { data: SharedWithMeItem[] | null; error: string } = {
    data: null,
    error: '',
  }

  const headers = getFolderTenantHeaders(payload.tenantId)
  const urls = [
    `/repositories/${payload.repositoryId}/items/${payload.itemId}/shares`,
    `/repositories/${payload.repositoryId}/items/${payload.itemId}/share`,
  ]

  let lastError = ''
  for (const url of urls) {
    try {
      const { data, status } = await axiosV6({
        headers,
        method: 'GET',
        url,
      })
      if (status === 200) {
        response.data = normalizeShareList(unwrap(data) ?? data)
        return response
      }
    } catch (e: any) {
      const status = e?.response?.status
      lastError =
        e?.response?.data?.message ||
        e?.response?.data ||
        'error fetching item shares'
      if (status && status !== 404) {
        response.error = lastError
        return response
      }
    }
  }

  response.error = lastError || 'error fetching item shares'
  return response
}

export const getSharedWithMe = async (tenantId?: string) => {
  const response: { data: SharedWithMeItem[] | null; error: string } = {
    data: null,
    error: '',
  }

  try {
    const { data, status } = await axiosV6({
      headers: getFolderTenantHeaders(tenantId),
      method: 'GET',
      url: `/repositories/shared-with-me`,
    })

    if (status !== 200) throw 'invalid status code'
    response.data = normalizeShareList(unwrap(data) ?? data)
  } catch (e: any) {
    console.error(e)
    response.error =
      e?.response?.data?.message ||
      e?.response?.data ||
      'error fetching shared-with-me'
  }

  return response
}

export const revokeRepositoryShare = async (payload: {
  shareId: string
  tenantId?: string
}) => {
  const response: { data: boolean; error: string } = {
    data: false,
    error: '',
  }

  try {
    const { status } = await axiosV6({
      headers: getFolderTenantHeaders(payload.tenantId),
      method: 'DELETE',
      url: `/repositories/share/${payload.shareId}`,
    })

    if (status !== 200 && status !== 204) throw 'invalid status code'
    response.data = true
  } catch (e: any) {
    console.error(e)
    response.error =
      e?.response?.data?.message ||
      e?.response?.data ||
      'error revoking share'
  }

  return response
}

  // Keep the API object extensible for existing imports.
  ; (authApiV6 as any).getRepositoryItems = getRepositoryItems
  ; (authApiV6 as any).getRepositoryItemWorkspace = getRepositoryItemWorkspace
  ; (authApiV6 as any).shareRepositoryItem = shareRepositoryItem
  ; (authApiV6 as any).getRepositoryItemShares = getRepositoryItemShares
  ; (authApiV6 as any).getSharedWithMe = getSharedWithMe
  ; (authApiV6 as any).revokeRepositoryShare = revokeRepositoryShare

export interface RepositoryItemCommentsDto {
  comments?: Array<Record<string, any>>
  page?: number
  pageSize?: number
  totalCount?: number
}

export interface RepositoryItemTimelineDto {
  events?: Array<{
    actorName?: string
    actorType?: string
    createdAtUtc?: string
    description?: string | null
    eventType?: string
    id?: string
    isDerived?: boolean
    title: string
  }>
  totalCount?: number
}

export const getRepositoryItemTimeline = async (payload: {
  itemId: string
  repositoryId: string
}) => {
  const response: any = { data: null, error: '' }

  try {
    const { data, status } = await axiosV6({
      method: 'GET',
      url: `/repositories/${payload.repositoryId}/items/${payload.itemId}/timeline`,
    })

    if (status !== 200) throw 'invalid status code'
    response.data = unwrap(data)
  } catch (e: any) {
    console.error(e)
    response.error = e?.response?.data || 'error fetching document timeline'
  }

  return response
}

export const getRepositoryItemComments = async (payload: {
  itemId: string
  page?: number
  pageSize?: number
  repositoryId: string
}) => {
  const response: any = { data: null, error: '' }

  try {
    const { data, status } = await axiosV6({
      method: 'GET',
      params: {
        Page: payload.page ?? 1,
        PageSize: payload.pageSize ?? 50,
      },
      url: `/repositories/${payload.repositoryId}/items/${payload.itemId}/comments`,
    })

    if (status !== 200) throw 'invalid status code'
    response.data = unwrap(data)
  } catch (e: any) {
    console.error(e)
    response.error = e?.response?.data || 'error fetching document comments'
  }

  return response
}

export type RelatedDocumentItem = {
  createdAtUtc?: string | null
  documentType?: string | null
  fileName?: string | null
  fileSize?: number | null
  fileType?: string | null
  id: string
  invoiceNumber?: string | null
  matchCount?: number
  matchedFields?: string[]
  matchScore?: number
  poNumber?: string | null
  relatedItemId?: string
  relatedRepositoryId?: string
  repositoryId: string
  repositoryName?: string | null
  supplier?: string | null
}

export type RelatedDocumentsResponse = {
  data?: RelatedDocumentItem[]
  match?: Record<string, string>
  matchFields?: string[]
  page?: number
  pageSize?: number
  sourceItemId?: string
  sourceRepositoryId?: string
  totalCount?: number
}

export type RelatedSavedLinkItem = {
  fileName?: string
  itemId: string
  matchScore?: number
  repositoryId: string
  repositoryName?: string
}

const extractRelatedList = (payload: unknown): any[] => {
  const unwrapped = unwrap(payload)
  if (Array.isArray(unwrapped)) return unwrapped
  if (!unwrapped || typeof unwrapped !== 'object') return []
  const record = unwrapped as Record<string, unknown>
  if (Array.isArray(record.items)) return record.items
  if (Array.isArray(record.data)) return record.data
  const items = record.items as Record<string, unknown> | undefined
  if (items && Array.isArray(items.data)) return items.data
  const data = record.data as Record<string, unknown> | undefined
  if (data && Array.isArray(data.items)) return data.items
  if (data && Array.isArray(data.data)) return data.data
  return []
}

const mapRelatedSavedRow = (row: any): RelatedDocumentItem | null => {
  const relatedItemId = String(
    row?.relatedItemId || row?.itemId || row?.id || '',
  ).trim()
  const relatedRepositoryId = String(
    row?.relatedRepositoryId || row?.repositoryId || '',
  ).trim()
  if (!relatedItemId || !relatedRepositoryId) return null
  return {
    createdAtUtc: row?.createdAtUtc ?? null,
    documentType: row?.documentType ?? null,
    fileName: row?.fileName ?? null,
    fileSize: row?.fileSize ?? null,
    fileType: row?.fileType ?? null,
    id: relatedItemId,
    invoiceNumber: row?.invoiceNumber ?? null,
    matchCount: row?.matchCount,
    matchedFields: Array.isArray(row?.matchedFields) ? row.matchedFields : [],
    matchScore:
      typeof row?.matchScore === 'number' ? row.matchScore : undefined,
    poNumber: row?.poNumber ?? null,
    relatedItemId,
    relatedRepositoryId,
    repositoryId: relatedRepositoryId,
    repositoryName: row?.repositoryName ?? null,
    supplier: row?.supplier ?? null,
  }
}

const toRelatedDocumentsResponse = (
  payload: unknown,
  fallback: { page: number; pageSize: number },
): RelatedDocumentsResponse => {
  const rows = extractRelatedList(payload)
    .map(mapRelatedSavedRow)
    .filter((row): row is RelatedDocumentItem => Boolean(row))
  const record =
    payload && typeof payload === 'object'
      ? (payload as Record<string, unknown>)
      : {}
  return {
    data: rows,
    match: (record.match as Record<string, string>) || {},
    matchFields: Array.isArray(record.matchFields) ? record.matchFields : [],
    page: Number(record.page || fallback.page),
    pageSize: Number(record.pageSize || fallback.pageSize),
    sourceItemId: record.sourceItemId as string | undefined,
    sourceRepositoryId: record.sourceRepositoryId as string | undefined,
    totalCount: Number(record.totalCount || rows.length || 0),
  }
}

/** Linked/saved related docs shown on the Related Documents tab. */
export const getRepositoryItemRelatedSaved = async (payload: {
  itemId: string
  page?: number
  pageSize?: number
  repositoryId: string
}) => {
  const response: {
    data: RelatedDocumentsResponse | null
    error: unknown
  } = { data: null, error: '' }

  const page = payload.page ?? 1
  const pageSize = payload.pageSize ?? 50

  try {
    const { data, status } = await axiosV6({
      method: 'GET',
      params: {
        page,
        pageSize,
      },
      url: `/repositories/${payload.repositoryId}/items/${payload.itemId}/related-saved`,
    })

    if (status !== 200) throw 'invalid status code'
    response.data = toRelatedDocumentsResponse(unwrap(data), { page, pageSize })
  } catch (e: any) {
    console.error(e)
    response.error = e?.response?.data || 'error fetching saved related documents'
  }

  return response
}

/** Persist documents added from Find related documents. */
export const saveRepositoryItemRelated = async (payload: {
  itemId: string
  items: RelatedSavedLinkItem[]
  repositoryId: string
}) => {
  const response: {
    data: RelatedDocumentsResponse | null
    error: unknown
  } = { data: null, error: '' }

  try {
    const { data, status } = await axiosV6({
      data: {
        items: payload.items,
      },
      method: 'POST',
      url: `/repositories/${payload.repositoryId}/items/${payload.itemId}/related-saved`,
    })

    if (![200, 201, 202, 204].includes(status)) throw 'invalid status code'
    response.data = toRelatedDocumentsResponse(unwrap(data), {
      page: 1,
      pageSize: payload.items.length || 50,
    })
  } catch (e: any) {
    console.error(e)
    response.error = e?.response?.data || 'error saving related documents'
  }

  return response
}

/** Unlink a saved related document from the open file. */
export const deleteRepositoryItemRelatedSaved = async (payload: {
  itemId: string
  relatedItemId: string
  relatedRepositoryId: string
  repositoryId: string
}) => {
  const response: { data: unknown; error: unknown } = { data: null, error: '' }

  try {
    const { data, status } = await axiosV6({
      method: 'DELETE',
      params: {
        relatedItemId: payload.relatedItemId,
        relatedRepositoryId: payload.relatedRepositoryId,
      },
      url: `/repositories/${payload.repositoryId}/items/${payload.itemId}/related-saved`,
    })

    if (![200, 201, 202, 204].includes(status)) throw 'invalid status code'
    response.data = unwrap(data)
  } catch (e: any) {
    console.error(e)
    response.error = e?.response?.data || 'error removing related document'
  }

  return response
}


export const addRepositoryItemComment = async (payload: {
  body: string
  itemId: string
  repositoryId: string
}) => {
  const response: any = { data: null, error: '' }

  try {
    const { data, status } = await axiosV6({
      data: JSON.stringify({ body: payload.body }),
      method: 'POST',
      url: `/repositories/${payload.repositoryId}/items/${payload.itemId}/comments`,
    })

    if (status !== 200 && status !== 201) throw 'invalid status code'
    response.data = data
  } catch (e: any) {
    response.error = e?.response?.data || 'error posting comment'
  }

  return response
}

export const uploadForOcr = async (
  repositoryId: string,
  file: File,
  fields: string[],
) => {
  const response: any = { data: null, error: '' }

  const formData = new FormData()
  formData.append('file', file, file.name)
  formData.append('repositoryId', repositoryId)
  formData.append('fields', JSON.stringify(fields))

  const parseError = (e: any) => {
    const errorPayload = e?.response?.data
    return (
      (typeof errorPayload === 'string' ? errorPayload : null) ||
      errorPayload?.message ||
      errorPayload?.title ||
      errorPayload?.error ||
      e?.message ||
      'error running OCR extraction'
    )
  }

  try {
    const { data, status } = await axiosV6({
      data: formData,
      headers: {
        'Content-Type': undefined,
      },
      method: 'POST',
      transformRequest: [(payload) => payload],
      url: '/uploadAndIndex/uploadForOcr',
    })

    if (status !== 200 && status !== 201) {
      response.error = 'invalid status code'
      return response
    }

    response.data = typeof data === 'string' ? JSON.parse(data) : data
  } catch (e: any) {
    console.error(e)
    response.error = parseError(e)
  }

  return response
}

export const UploadFiles = async (repositoryId: string, formData: FormData) => {
  const response: any = { data: null, error: '' }

  try {
    const { data, status } = await axiosV6({
      data: formData,
      // important
      headers: {
        'Content-Type': undefined,
      },
      method: 'POST',

      // important if axiosV6 has JSON transform/interceptor
      transformRequest: [(data) => data],

      url: `/repositories/${repositoryId}/items/upload-archive`,
    })

    if (status !== 200 && status !== 201) {
      throw new Error('invalid status code')
    }

    response.data = data
  } catch (e: any) {
    console.error(e)
    response.error = e?.response?.data || 'error uploading file'
  }

  return response
}

/**
 * Uploads a Collabora-edited document back into a V6 repository
 * using the UploadFiles binary multipart form API.
 */
export const persistEditedDocumentToRepository = async (
  repositoryId: string,
  itemId: string,
  blob: Blob,
  fileName?: string,
  metadata?: Record<string, string>,
) => {
  // eslint-disable-next-line no-console
  console.log('[collabora-debug] STEP 9a: Inside persistEditedDocumentToRepository. RepId:', repositoryId, 'ItemId:', itemId)
  try {
    const formData = new FormData()
    const name = fileName || 'edited_document.pdf'
    formData.append('file', blob, name)
    if (metadata && Object.keys(metadata).length > 0) {
      formData.append('metadata', JSON.stringify(metadata))
    }
    formData.append('itemId', itemId)

    // eslint-disable-next-line no-console
    console.log('[collabora-debug] STEP 9b: Calling UploadFiles with FormData (file name:', name, 'size:', blob.size, 'metadata keys:', metadata ? Object.keys(metadata) : 0, ')...')
    const res = await UploadFiles(repositoryId, formData)
    // eslint-disable-next-line no-console
    console.log('[collabora-debug] STEP 9c: UploadFiles returned response:', res)
    return res
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('[collabora-debug] STEP 9-ERROR: Failed to persist edited document:', e)
    return {
      data: null,
      error: e?.response?.data || e?.message || 'Error persisting document edits',
    }
  }
}

export interface AiSummaryApiResponse {
  creditConsumed?: boolean
  output?: string
}

type AiSummaryResult = {
  cancelled?: boolean
  data: AiSummaryApiResponse | null
  error: string
  status?: number
}

const inflightAiSummaryRequests = new Map<string, Promise<AiSummaryResult>>()

const fetchRepositoryItemAiSummary = async (payload: {
  itemId: string
  language?: string
  repositoryId: string
}): Promise<AiSummaryResult> => {
  const response: AiSummaryResult = { data: null, error: '' }

  try {
    const language = String(payload.language || '')
      .trim()
      .toLowerCase()
    const languageQuery = language
      ? `?language=${encodeURIComponent(language)}`
      : ''

    const { data, status } = await axiosV6({
      headers: language
        ? {
          'Accept-Language': language,
        }
        : undefined,
      method: 'POST',
      // AI generation can take a while on cache miss.
      timeout: 180_000,
      // Long-running; do not abort when React Strict Mode remounts.
      skipCancellation: true,
      url: `/repositories/${payload.repositoryId}/items/${payload.itemId}/ai-summary${languageQuery}`,
    } as any)

    if (status < 200 || status >= 300) throw 'invalid status code'

    const payloadData = (data?.data ?? data) as AiSummaryApiResponse
    response.data = {
      creditConsumed: Boolean(
        (payloadData as any)?.creditConsumed ??
        (payloadData as any)?.CreditConsumed,
      ),
      output:
        (payloadData as any)?.output ??
        (payloadData as any)?.Output ??
        (typeof payloadData === 'string' ? payloadData : undefined),
    }
    response.status = status
  } catch (e: any) {
    const isCancelled =
      axios.isCancel(e) ||
      e?.code === 'ERR_CANCELED' ||
      e?.name === 'CanceledError' ||
      /cancel/i.test(String(e?.message || ''))

    if (isCancelled) {
      response.cancelled = true
      response.error = ''
      return response
    }

    console.error(e)
    const status = e?.response?.status as number | undefined
    response.status = status
    const body = e?.response?.data
    const message =
      (typeof body === 'string' && body) ||
      body?.error ||
      body?.message ||
      (e?.code === 'ECONNABORTED'
        ? 'AI summary service timed out.'
        : status === 400
          ? 'Repository item does not have a file path.'
          : status === 404
            ? 'Repository item not found.'
            : status === 502
              ? 'AI summary service timed out.'
              : 'error fetching AI summary')
    response.error = String(message)
  }

  return response
}

export const getRepositoryItemAiSummary = async (payload: {
  force?: boolean
  itemId: string
  language?: string
  repositoryId: string
}) => {
  const language = String(payload.language || 'en')
    .trim()
    .toLowerCase() || 'en'
  const key = `${payload.repositoryId}:${payload.itemId}:${language}`

  if (!payload.force) {
    const inflight = inflightAiSummaryRequests.get(key)
    if (inflight) return inflight
  } else {
    inflightAiSummaryRequests.delete(key)
  }

  const request = fetchRepositoryItemAiSummary({
    ...payload,
    language,
  }).finally(() => {
    // Only clear if this promise is still the active one for the key.
    if (inflightAiSummaryRequests.get(key) === request) {
      inflightAiSummaryRequests.delete(key)
    }
  })

  inflightAiSummaryRequests.set(key, request)
  return request
}
  ; (authApiV6 as any).getRepositoryItemTimeline = getRepositoryItemTimeline
  ; (authApiV6 as any).getRepositoryItemComments = getRepositoryItemComments
  ; (authApiV6 as any).getRepositoryItemRelatedSaved = getRepositoryItemRelatedSaved
  ; (authApiV6 as any).saveRepositoryItemRelated = saveRepositoryItemRelated
  ; (authApiV6 as any).deleteRepositoryItemRelatedSaved =
    deleteRepositoryItemRelatedSaved
  ; (authApiV6 as any).addRepositoryItemComment = addRepositoryItemComment
  ; (authApiV6 as any).getRepositoryItemAiSummary = getRepositoryItemAiSummary
  ; (authApiV6 as any).uploadForOcr = uploadForOcr
  ; (authApiV6 as any).UploadFiles = UploadFiles
