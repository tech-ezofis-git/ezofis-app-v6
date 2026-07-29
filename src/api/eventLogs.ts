import axios from 'axios'
import authUserStore from '../stores/authUserStore'
import { axiosV6 } from './axios'
import { getV6ApiErrorMessage } from './v6/auth'

export interface EventLog {
  category: string
  createdAtUtc: string
  eventTitle: string
  eventType: string
  id: number | string
  ipAddress: string
  severity: 'info' | 'warning' | 'critical' | string
  userDisplayName: string
  userEmail: string
}

export interface EventLogResponse {
  data: EventLog[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

export interface GetEventLogsParams {
  category?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
  search?: string
  severity?: string
  userEmail?: string
}

export const mapEventLog = (item: any): EventLog => {
  const record = (item || {}) as Record<string, any>
  return {
    category: String(record.category || record.Category || ''),
    createdAtUtc: String(
      record.createdAtUtc ||
        record.CreatedAtUtc ||
        record.timestamp ||
        record.Timestamp ||
        record.createdAt ||
        record.CreatedAt ||
        '',
    ),
    eventTitle: String(
      record.eventTitle ||
        record.EventTitle ||
        record.event ||
        record.Event ||
        record.title ||
        record.Title ||
        '',
    ),
    eventType: String(
      record.eventType || record.EventType || record.type || record.Type || '',
    ),
    id: record.id ?? record.Id ?? record.eventLogId ?? 0,
    ipAddress: String(
      record.ipAddress || record.IpAddress || record.ip || record.IP || '',
    ),
    severity: String(
      record.severity || record.Severity || 'info',
    ).toLowerCase(),
    userDisplayName: String(
      record.userDisplayName ||
        record.UserDisplayName ||
        record.user ||
        record.User ||
        record.userName ||
        record.UserName ||
        '',
    ),
    userEmail: String(
      record.userEmail ||
        record.UserEmail ||
        record.email ||
        record.Email ||
        '',
    ),
  }
}

export const mapEventLogResponse = (
  data: any,
  params?: GetEventLogsParams,
): EventLogResponse => {
  if (!data) {
    return {
      data: [],
      page: params?.page || 1,
      pageSize: params?.pageSize || 100,
      totalCount: 0,
      totalPages: 0,
    }
  }

  let rawList: any[] = []
  let totalCount = 0

  if (Array.isArray(data)) {
    rawList = data
    totalCount = data.length
  } else if (typeof data === 'object') {
    if (Array.isArray(data.data)) {
      rawList = data.data
    } else if (Array.isArray(data.items)) {
      rawList = data.items
    } else if (Array.isArray(data.records)) {
      rawList = data.records
    } else if (Array.isArray(data.eventLogs)) {
      rawList = data.eventLogs
    }

    totalCount = Number(
      data.totalCount ??
        data.TotalCount ??
        data.totalItems ??
        data.TotalItems ??
        data.total ??
        data.Total ??
        rawList.length,
    )
  }

  const page = Number(data.page ?? data.Page ?? params?.page ?? 1)
  const pageSize = Number(
    data.pageSize ?? data.PageSize ?? params?.pageSize ?? 100,
  )
  const computedTotalPages = pageSize > 0 ? Math.ceil(totalCount / pageSize) : 1
  const totalPages = Number(
    data.totalPages ?? data.TotalPages ?? computedTotalPages ?? 1,
  )

  return {
    data: rawList.map(mapEventLog),
    page,
    pageSize,
    totalCount,
    totalPages,
  }
}

export const getEventLogs = async (
  params: GetEventLogsParams = {},
  options?: { signal?: AbortSignal },
) => {
  const response: {
    data: EventLogResponse | null
    error: string
  } = {
    data: null,
    error: '',
  }

  try {
    const store = authUserStore.getState()
    const tenantId =
      store.session?.tenantId || (store.identity as any)?.tenantId || ''

    const queryParams: Record<string, any> = {}
    if (params.page !== undefined) {
      queryParams.page = params.page
      // queryParams.Page = params.page
    }
    if (params.pageSize !== undefined) {
      queryParams.pageSize = params.pageSize
      // queryParams.PageSize = params.pageSize
      queryParams.itemsPerPage = params.pageSize
    }
    if (params.category) queryParams.category = params.category
    if (params.severity) queryParams.severity = params.severity
    if (params.userEmail) queryParams.userEmail = params.userEmail
    if (params.dateFrom) queryParams.dateFrom = params.dateFrom
    if (params.dateTo) queryParams.dateTo = params.dateTo
    if (params.search) queryParams.search = params.search

    const { data, status } = await axiosV6({
      headers: tenantId ? { 'X-Tenant-Id': tenantId } : undefined,
      method: 'GET',
      params: queryParams,
      signal: options?.signal,
      url: '/event-logs',
    })

    if (status !== 200) {
      throw new Error('invalid status code')
    }

    const rawData = typeof data === 'string' ? JSON.parse(data) : data
    response.data = mapEventLogResponse(rawData, params)
  } catch (error: any) {
    if (
      axios.isCancel(error) ||
      error?.name === 'CanceledError' ||
      error?.code === 'ERR_CANCELED'
    ) {
      return response
    }
    console.error(error)
    response.error = getV6ApiErrorMessage(
      error?.response?.data,
      'Failed to load event logs',
    )
  }

  return response
}

export default {
  getEventLogs,
}
