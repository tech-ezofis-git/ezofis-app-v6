import authUserStore from '../../stores/authUserStore'
import { axiosV6 } from '../axios'
import { getV6ApiErrorMessage } from './auth'

export type CreditsUsageBucket = {
  creditsUsed: number
  type: string
}

export type CreditsUsageMonthlyItem = {
  details?: CreditsUsageBucket[]
  month: string
  total: number
}

export type CreditsUsagePeriod =
  | 'today'
  | 'yesterday'
  | 'monthly'
  | 'quarterly'
  | 'yearly'

export type CreditsUsageRequest = {
  month?: number
  period?: CreditsUsagePeriod
  year?: number
}

export type CreditsUsageResponse = {
  distributionReport: CreditsUsageBucket[]
  highestConsumption: CreditsUsageBucket[]
  monthlyConsumption: CreditsUsageMonthlyItem[] | null
  overallCreditSplit: CreditsUsageBucket[]
  period: string
  periodLabel: string
  rangeEndUtc: string
  rangeStartUtc: string
  timeline: CreditsUsageTimelinePoint[]
  totalCreditsConsumed: number
  transactionCount: number
  transactions: CreditsUsageTransaction[]
}

export type CreditsUsageTimelinePoint = {
  bucketStartUtc?: string | null
  creditsUsed: number
  label: string
}

export type CreditsUsageTransaction = {
  agent: string
  createdAt: string
  credit: number
  fileName?: string | null
  id: number
  identifyId?: number | string | null
  inputTokens?: number | null
  outputTokens?: number | null
  remarks?: string | null
  subActivityType?: string | null
  totalTokens?: number | null
}

const emptyCreditsUsage = (): CreditsUsageResponse => ({
  distributionReport: [],
  highestConsumption: [],
  monthlyConsumption: null,
  overallCreditSplit: [],
  period: 'Monthly',
  periodLabel: '',
  rangeEndUtc: '',
  rangeStartUtc: '',
  timeline: [],
  totalCreditsConsumed: 0,
  transactionCount: 0,
  transactions: [],
})

const toNumber = (value: unknown, fallback = 0) => {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

const mapBuckets = (value: unknown): CreditsUsageBucket[] => {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => {
      const record = (item || {}) as Record<string, unknown>
      return {
        creditsUsed: toNumber(record.creditsUsed ?? record.creditUsed),
        type: String(
          record.type ||
            record.agent ||
            record.activityType ||
            record.name ||
            '—',
        ),
      }
    })
    .filter((item) => item.type !== '—')
}

const mapTimeline = (value: unknown): CreditsUsageTimelinePoint[] => {
  if (!Array.isArray(value)) return []

  return value.map((item) => {
    const record = (item || {}) as Record<string, unknown>
    return {
      bucketStartUtc:
        record.bucketStartUtc == null ? null : String(record.bucketStartUtc),
      creditsUsed: toNumber(record.creditsUsed ?? record.value),
      label: String(record.label || '—'),
    }
  })
}

const mapMonthlyConsumption = (
  value: unknown,
): CreditsUsageMonthlyItem[] | null => {
  if (!Array.isArray(value)) return null

  return value.map((item) => {
    const record = (item || {}) as Record<string, unknown>
    return {
      details: mapBuckets(record.details),
      month: String(record.month || '—'),
      total: toNumber(record.total),
    }
  })
}

const mapTransactions = (value: unknown): CreditsUsageTransaction[] => {
  if (!Array.isArray(value)) return []

  return value.map((item, index) => {
    const record = (item || {}) as Record<string, unknown>
    return {
      agent: String(record.agent || record.activityType || '—'),
      createdAt: String(record.createdAt || ''),
      credit: toNumber(record.credit ?? record.creditsUsed),
      fileName:
        record.fileName == null
          ? record.identifyTable == null
            ? null
            : String(record.identifyTable)
          : String(record.fileName),
      id: toNumber(record.id, index + 1),
      identifyId: record.identifyId == null ? null : String(record.identifyId),
      inputTokens:
        record.inputTokens == null ? null : toNumber(record.inputTokens),
      outputTokens:
        record.outputTokens == null ? null : toNumber(record.outputTokens),
      remarks: record.remarks == null ? null : String(record.remarks),
      subActivityType:
        record.subActivityType == null ? null : String(record.subActivityType),
      totalTokens:
        record.totalTokens == null ? null : toNumber(record.totalTokens),
    }
  })
}

export const mapCreditsUsageResponse = (raw: unknown): CreditsUsageResponse => {
  const record = (raw || {}) as Record<string, unknown>

  return {
    distributionReport: mapBuckets(record.distributionReport),
    highestConsumption: mapBuckets(record.highestConsumption),
    monthlyConsumption: mapMonthlyConsumption(record.monthlyConsumption),
    overallCreditSplit: mapBuckets(record.overallCreditSplit),
    period: String(record.period || 'Monthly'),
    periodLabel: String(record.periodLabel || ''),
    rangeEndUtc: String(record.rangeEndUtc || ''),
    rangeStartUtc: String(record.rangeStartUtc || ''),
    timeline: mapTimeline(record.timeline),
    totalCreditsConsumed: toNumber(record.totalCreditsConsumed),
    transactionCount: toNumber(record.transactionCount),
    transactions: mapTransactions(record.transactions),
  }
}

export const getCreditsUsage = async (payload: CreditsUsageRequest = {}) => {
  const response: {
    data: CreditsUsageResponse | null
    error: string
  } = {
    data: null,
    error: '',
  }

  try {
    const store = authUserStore.getState()
    const tenantId = store.session?.tenantId || ''

    const body: CreditsUsageRequest = {
      period: payload.period || 'monthly',
    }

    if (body.period === 'monthly') {
      if (payload.year) body.year = payload.year
      if (payload.month) body.month = payload.month
    }

    const { data, status } = await axiosV6({
      data: body,
      headers: tenantId ? { 'X-Tenant-Id': tenantId } : undefined,
      method: 'POST',
      url: '/billing/credits/usage',
    })

    if (status !== 200 && status !== 201) {
      throw new Error('invalid status code')
    }

    response.data = mapCreditsUsageResponse(data ?? emptyCreditsUsage())
  } catch (e: any) {
    console.error(e)
    response.error = getV6ApiErrorMessage(
      e?.response?.data,
      'Failed to load credit usage',
    )
  }

  return response
}

export type CreditsMasterRequest = {
  allocationMonth?: number
  allocationYear?: number
  creditType?: string
}

export type CreditsMasterResponse = {
  allocationMonth: number
  allocationYear: number
  balanceCredit: number
  carryForwardCredit?: number | null
  creditType: string
  extraConsumedCredit?: number | null
  id: number
  initialCredit: number
  monthlyBalance: number
  overallConsumedCredit: number
  remarks?: string | null
  status: string
  tenantId: string
  topUpBalanceCredit?: number | null
  validFromDate: string
  validToDate?: string | null
}

export const getCreditsMaster = async (payload: CreditsMasterRequest = {}) => {
  const response: {
    data: CreditsMasterResponse | null
    error: string
  } = {
    data: null,
    error: '',
  }

  try {
    const store = authUserStore.getState()
    const tenantId = store.session?.tenantId || ''

    const params: Record<string, any> = {}
    if (payload.allocationMonth !== undefined)
      params.allocationMonth = payload.allocationMonth
    if (payload.allocationYear !== undefined)
      params.allocationYear = payload.allocationYear
    if (payload.creditType !== undefined) params.creditType = payload.creditType

    const { data, status } = await axiosV6({
      headers: tenantId ? { 'X-Tenant-Id': tenantId } : undefined,
      method: 'GET',
      params,
      url: '/billing/credits/master',
    })

    if (status !== 200 && status !== 201) {
      throw new Error('invalid status code')
    }

    response.data = data
  } catch (e: any) {
    console.error(e)
    response.error = getV6ApiErrorMessage(
      e?.response?.data,
      'Failed to load credit master',
    )
  }

  return response
}

export default {
  getCreditsMaster,
  getCreditsUsage,
}
