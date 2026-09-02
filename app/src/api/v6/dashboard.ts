import authUserStore from '../../stores/authUserStore'
import { axiosV6 } from '../axios'
import { getV6ApiErrorMessage } from './auth'

export type V6DashBoardItem = {
  activeFilters?: object
  cashFlowForecast?: object
  departmentSpend?: object[]
  filterOptions?: object
  header?: object
  invoices?: object[]
  kpis?: object[]
  monthlyPaymentTrend?: object
  outstandingBySupplier?: object[]
  period?: string
  periodLabel?: string
  profitVsApSpending?: object
  rangeEndUtc?: string
  rangeStartUtc?: string
  supplierGeography?: object[]
  supplierRiskRadar?: object
  topSuppliersByInvoice?: object[]
}

export type V6DashboardPayload = {
  currency?: string | null
  department?: string | null
  fromUtc?: string | null
  includeInvoiceDetails?: boolean
  period?: string
  poAmountTier?: string | null
  requestStatus?: string | null
  status?: string | null
  supplier?: string | null
  toUtc?: string | null
  workflowId?: string | null
}

export const getDashboardData = async (payload: V6DashboardPayload) => {
  const response: {
    data: V6DashBoardItem[]
    error: string
  } = {
    data: [],
    error: '',
  }

  try {
    const store = authUserStore.getState()
    const tenantId = store.session?.tenantId || ''

    const { data, status } = await axiosV6({
      data: payload,
      headers: tenantId ? { 'X-Tenant-Id': tenantId } : undefined,
      method: 'POST',
      url: `/reports/ap-dashboard`,
    })

    if (status !== 200 && status !== 204) {
      throw new Error('invalid status code')
    }

    response.data = data
  } catch (error: any) {
    console.error(error)
    response.error = getV6ApiErrorMessage(
      error?.response?.data,
      'Error Loading Dashboard',
    )
  }

  return response
}

export type DashboardChart = {
  agg: 'count' | 'sum' | 'avg'
  color?: string
  columns?: Record<string, string>
  description: string
  enabled: boolean
  grain?: 'none' | 'month' | 'aging'
  id: string
  label?: string
  order: number
  position: 'left' | 'right' | 'full'
  span?: number
  title: string
  type:
    | 'donut'
    | 'pie'
    | 'radar'
    | 'lollipop'
    | 'column'
    | 'line'
    | 'area'
    | 'gauge'
}

export type DashboardDataRequest = {
  dashboard_json: DashboardSchemaResult
  message?: string
  repositoryId?: string
  sessionId: string
  tenantId: string
  workflowId?: string
}

export type DashboardKpi = {
  agg: 'count' | 'sum' | 'avg' | 'distinct' | 'overdue_sum' | 'overdue_count'
  color?: string
  columns?: Record<string, string>
  description: string
  enabled: boolean
  id: string
  label: string
  order: number
  position?: string
}

export type DashboardSchemaRequest = {
  message?: string
  repositoryId?: string
  sessionId: string
  tenantId: string
  workflowId?: string
}

export type DashboardSchemaResponse = {
  correlation_id?: string
  dashboard_result: DashboardSchemaResult
  html: null
  latency_ms?: number
  reply?: string
  sessionId: string
}

export type DashboardSchemaResult = {
  charts: DashboardChart[]
  columns?: string[]
  data: null
  kpis: DashboardKpi[]
  phase: string
  repositoryId?: string
  repository_name?: string
  table?: string
  tenantId?: string
  workflow_id?: string
}

const buildTenantHeaders = (tenantId?: string) => {
  const store = authUserStore.getState()
  const resolvedTenantId = store.session?.tenantId || tenantId || ''
  return resolvedTenantId ? { 'X-Tenant-Id': resolvedTenantId } : undefined
}

export const getDashboardSchema = async (payload: DashboardSchemaRequest) => {
  const response: {
    data: DashboardSchemaResponse | null
    error: string
  } = {
    data: null,
    error: '',
  }

  try {
    const { data, status } = await axiosV6({
      data: payload,
      headers: buildTenantHeaders(payload.tenantId),
      method: 'POST',
      url: `/dashboard/schema`,
    })

    if (status !== 200 && status !== 201) {
      throw new Error('invalid status code')
    }

    response.data = data
  } catch (error: any) {
    console.error(error)
    response.error = getV6ApiErrorMessage(
      error?.response?.data,
      'Error Generating Dashboard Schema',
    )
  }

  return response
}

export const getDashboardHtml = async (payload: DashboardDataRequest) => {
  const response: {
    error: string
    html: string
  } = {
    error: '',
    html: '',
  }

  try {
    const { data, status } = await axiosV6({
      data: payload,
      headers: buildTenantHeaders(payload.tenantId),
      method: 'POST',
      responseType: 'text',
      url: `/dashboard/data`,
    })

    if (status !== 200 && status !== 201) {
      throw new Error('invalid status code')
    }

    response.html = typeof data === 'string' ? data : ''
  } catch (error: any) {
    console.error(error)
    response.error = getV6ApiErrorMessage(
      error?.response?.data,
      'Error Loading Dashboard Data',
    )
  }

  return response
}

export const dashboardApiV6 = {
  getDashboardData,
  getDashboardHtml,
  getDashboardSchema,
}

export default dashboardApiV6
