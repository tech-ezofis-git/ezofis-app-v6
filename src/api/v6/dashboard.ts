import authUserStore from '../../stores/authUserStore'
import { axiosV6 } from '../axios'
import { getV6ApiErrorMessage } from './auth'

export type V6DashboardPayload = {
  period?: string
  workflowId?: string | null
  fromUtc?: string | null
  toUtc?: string | null
  department?: string | null
  supplier?: string | null
  status?: string | null
  currency?: string | null
  requestStatus?: string | null
  poAmountTier?: string | null
  includeInvoiceDetails?: boolean

}

export type V6DashBoardItem = {
  period?: string
  periodLabel?: string
  rangeStartUtc?: string
  rangeEndUtc?: string
  header?: object
  kpis?: object[]
  supplierRiskRadar?: object
  profitVsApSpending?: object
  monthlyPaymentTrend?: object
  cashFlowForecast?: object
  topSuppliersByInvoice?: object[]
  outstandingBySupplier?: object[]
  departmentSpend?: object[]
  supplierGeography?: object[]
  filterOptions?: object
  activeFilters?: object
  invoices?: object[]

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
      url: `/reports/ap-dashboard`
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
