import authUserStore from '../../../stores/authUserStore'
import { setToLocalStorage } from '../../../utils/local-storage'
import { axiosV6 } from '../../axios'

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

export interface RepositoryFieldDto {
  id: string
  name: string
  sqlColumnName: string
  dataType: string
  level: number
  isMandatory: boolean
  includeInFolderStructure: boolean
}

export interface RepositoryDto {
  id: string
  name: string
  description?: string
  storageProviderId?: string
  storageDrive?: string
  itemsTableName?: string
  stageTableName?: string
  fields?: RepositoryFieldDto[]
}

export interface BrowseChildGroupDto {
  name: string
  itemCount?: number
  dateModified?: string | null
}

export interface PagedDto<T> {
  data?: T[]
  page?: number
  pageSize?: number
  totalCount?: number
  nextCursor?: string | null
  totalSkipped?: boolean
  totalPages?: number
  hasMore?: boolean
}

export interface BrowseChildrenDto {
  level: number
  groupField?: string
  groupFieldName?: string
  pathId?: string
  pathLabel?: string
  parentFilters?: Record<string, string>
  isLeafLevel?: boolean
  groups?: PagedDto<BrowseChildGroupDto>
  items?: PagedDto<Record<string, any>>
  files?: PagedDto<Record<string, any>>
  data?: Record<string, any>[]
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

export const sendMailOTP = async (payload: { email: string; requiredOTP?: boolean }) => {
  const response: any = { data: '', error: '' }

  try {
    const { data, status } = await axiosV6({
      data: JSON.stringify(payload),
      method: 'POST',
      url: `/tenant/checkAuthenticate`,
    })

    if (status !== 201 && status !== 200 && status !== 400) throw 'invalid status code'

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

export const verifyMailOTP = async (payload: { email: string; otp: string }) => {
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

export const repositories = async () => {
  const response: any = { data: null, error: '' }

  try {
    const { data, status } = await axiosV6({
      method: 'GET',
      url: `/repositories`,
    })

    if (status !== 200) throw 'invalid status code'
    response.data = unwrap(data)
  } catch (e: any) {
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
      url: `/repositories/${id}`,
    })

    if (status !== 200) throw 'invalid status code'
    response.data = unwrap(data)
  } catch (e: any) {
    console.error(e)
    response.error = e?.response?.data || 'error fetching repository'
  }

  return response
}

export const getRepositoryBrowseChildren = async (payload: {
  id: string
  pathId?: string
  page?: number
  pageSize?: number
  search?: string
  parentFilters?: Record<string, string>
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
      url: `/repositories/${payload.id}/browse/children`,
      params,
    })

    if (status !== 200) throw 'invalid status code'
    response.data = unwrap(data)
  } catch (e: any) {
    console.error(e)
    response.error = e?.response?.data || 'error fetching repository children'
  }

  return response
}

export const login = async (payload: { email: string; password: string; tenantId: string }) => {
  const response: any = { data: null, error: '' }

  try {
    const { data, status } = await axiosV6({
      data: JSON.stringify({ email: payload.email, password: payload.password }),
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
  repositories,
  getRepositoryById,
  getRepositoryBrowseChildren,
}

export default authApiV6


export interface RepositoryItemWorkspaceDto {
  id: string
  fileName: string
  fileType?: string
  fileSize?: number
  fileUrl?: string
  storageProviderId?: string
  storageProviderCode?: string
  DetailsRow?: Array<{
    sectionKey: string
    title: string
    fields?: Array<{ key: string; label: string; value: any }>
  }> | null
  lineItems?: Array<Record<string, any>> | null
}

export interface RepositoryItemsQuery {
  id: string
  filters?: Record<string, string>
  search?: string
  dateFrom?: string
  dateTo?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc' | string
  page?: number
  pageSize?: number
  skipTotal?: boolean
  cursor?: string | null
}

export const getRepositoryItems = async (payload: RepositoryItemsQuery) => {
  const response: any = { data: null, error: '' }

  try {
    const params: Record<string, any> = {
      Page: payload.page ?? 1,
      PageSize: payload.pageSize ?? 50,
      SkipTotal: false,
      Filters: JSON.stringify(payload.filters ?? {}),
    }

    if (payload.search) params.Search = payload.search
    if (payload.dateFrom) params.DateFrom = payload.dateFrom
    if (payload.dateTo) params.DateTo = payload.dateTo
    if (payload.sortBy) params.SortBy = payload.sortBy
    if (payload.sortOrder) params.SortOrder = payload.sortOrder
    // if (payload.cursor) params.Cursor = payload.cursor

    const { data, status } = await axiosV6({
      method: 'GET',
      url: `/repositories/${payload.id}/items`,
      params,
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
  repositoryId: string
  itemId: string
}) => {
  const response: any = { data: null, error: '' }

  try {
    const { data, status } = await axiosV6({
      method: 'GET',
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

// Keep the API object extensible for existing imports.
;(authApiV6 as any).getRepositoryItems = getRepositoryItems
;(authApiV6 as any).getRepositoryItemWorkspace = getRepositoryItemWorkspace


export interface RepositoryItemTimelineDto {
  events?: Array<{
    id?: string
    eventType?: string
    title: string
    description?: string | null
    actorType?: string
    actorName?: string
    createdAtUtc?: string
    isDerived?: boolean
  }>
  totalCount?: number
}

export interface RepositoryItemCommentsDto {
  comments?: Array<Record<string, any>>
  totalCount?: number
  page?: number
  pageSize?: number
}

export const getRepositoryItemTimeline = async (payload: {
  repositoryId: string
  itemId: string
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
  repositoryId: string
  itemId: string
  page?: number
  pageSize?: number
}) => {
  const response: any = { data: null, error: '' }

  try {
    const { data, status } = await axiosV6({
      method: 'GET',
      url: `/repositories/${payload.repositoryId}/items/${payload.itemId}/comments`,
      params: {
        Page: payload.page ?? 1,
        PageSize: payload.pageSize ?? 50,
      },
    })

    if (status !== 200) throw 'invalid status code'
    response.data = unwrap(data)
  } catch (e: any) {
    console.error(e)
    response.error = e?.response?.data || 'error fetching document comments'
  }

  return response
}

export const addRepositoryItemComment = async (payload: {
  repositoryId: string
  itemId: string
  body: string
}) => {
  const response: any = { data: null, error: '' }

  try {
    const { data, status } = await axiosV6({
      method: 'POST',
      url: `/repositories/${payload.repositoryId}/items/${payload.itemId}/comments`,
      data: JSON.stringify({ body: payload.body }),
    })

    if (status !== 200 && status !== 201) throw 'invalid status code'
    response.data = data
  } catch (e: any) {
    response.error = e?.response?.data || 'error posting comment'
  }

  return response
}

;(authApiV6 as any).getRepositoryItemTimeline = getRepositoryItemTimeline
;(authApiV6 as any).getRepositoryItemComments = getRepositoryItemComments
;(authApiV6 as any).addRepositoryItemComment = addRepositoryItemComment
