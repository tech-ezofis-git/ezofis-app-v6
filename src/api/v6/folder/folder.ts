import authUserStore from '../../../stores/authUserStore'
import { setToLocalStorage } from '../../../utils/local-storage'
import { axiosV6 } from '../../axios'

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
}

export interface RepositoryFieldDto {
  dataType: string
  id: string
  includeInFolderStructure: boolean
  isMandatory: boolean
  level: number
  name: string
  sqlColumnName: string
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

export const getRepositoryBrowseStructure = async (id: string) => {
  const response: any = { data: null, error: '' }

  try {
    const { data, status } = await axiosV6({
      method: 'GET',
      url: `/repositories/${id}/browse/structure`,
    })

    if (status !== 200) throw 'invalid status code'
    response.data = unwrap(data)
  } catch (e: any) {
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
  filters?: Record<string, string>
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
;(authApiV6 as any).getRepositoryItemTimeline = getRepositoryItemTimeline
;(authApiV6 as any).getRepositoryItemComments = getRepositoryItemComments
;(authApiV6 as any).addRepositoryItemComment = addRepositoryItemComment
;(authApiV6 as any).UploadFiles = UploadFiles
