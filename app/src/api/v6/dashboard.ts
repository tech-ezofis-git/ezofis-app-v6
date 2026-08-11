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

export const dashboardApiV6 = {
  getDashboardData,
}

export default dashboardApiV6
