import authUserStore from '../../stores/authUserStore'
import { axiosV6 } from '../axios'
import { getV6ApiErrorMessage } from './auth'

export type LicensePlanType = 'production' | 'trial'

export type LicenseSummaryResponse = {
  daysRemaining: number
  filesCount: number
  foldersCount: number
  groupsCount: number
  planType: LicensePlanType
  requestsCount: number
  securityPoliciesCount: number
  storageUsedBytes: number
  tenantId: string
  trialDay: number
  trialExpiryDate: string
  trialLengthDays: number
  trialStartDate: string
  usersCount: number
  workflowsCount: number
  workflowsLimit: number
}

export type MigrationOption = 'config_only' | 'fresh_start' | 'full'

export type UpgradeMigrationPayload = {
  confirmedBy: string
  migrationOption: MigrationOption
  tenantId: string
}

export type UpgradeMigrationResponse = {
  planType: LicensePlanType
  upgradedAtUtc: string
}

const toNumber = (value: unknown, fallback = 0) => {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

export const mapLicenseSummaryResponse = (
  raw: unknown,
): LicenseSummaryResponse => {
  const record = (raw || {}) as Record<string, unknown>

  return {
    daysRemaining: toNumber(record.daysRemaining),
    filesCount: toNumber(record.filesCount),
    foldersCount: toNumber(record.foldersCount),
    groupsCount: toNumber(record.groupsCount),
    planType: record.planType === 'production' ? 'production' : 'trial',
    requestsCount: toNumber(record.requestsCount),
    securityPoliciesCount: toNumber(record.securityPoliciesCount),
    storageUsedBytes: toNumber(record.storageUsedBytes),
    tenantId: String(record.tenantId || ''),
    trialDay: toNumber(record.trialDay),
    trialExpiryDate: String(record.trialExpiryDate || ''),
    trialLengthDays: toNumber(record.trialLengthDays, 30),
    trialStartDate: String(record.trialStartDate || ''),
    usersCount: toNumber(record.usersCount),
    workflowsCount: toNumber(record.workflowsCount),
    workflowsLimit: toNumber(record.workflowsLimit),
  }
}

export const getLicenseSummary = async () => {
  const response: { data: LicenseSummaryResponse | null; error: string } = {
    data: null,
    error: '',
  }

  try {
    const store = authUserStore.getState()
    const tenantId = store.session?.tenantId || ''

    const { data, status } = await axiosV6({
      headers: tenantId ? { 'X-Tenant-Id': tenantId } : undefined,
      method: 'GET',
      url: '/license/summary',
    })

    if (status !== 200 && status !== 201) {
      throw new Error('invalid status code')
    }

    response.data = mapLicenseSummaryResponse(data)
  } catch (e: unknown) {
    console.error(e)
    const err = e as { response?: { data?: unknown } }
    response.error = getV6ApiErrorMessage(
      err?.response?.data,
      'Failed to load license summary',
    )
  }

  return response
}

export const upgradeLicenseToProduction = async (
  payload: UpgradeMigrationPayload,
) => {
  const response: {
    data: UpgradeMigrationResponse | null
    error: string
  } = {
    data: null,
    error: '',
  }

  try {
    const store = authUserStore.getState()
    const tenantId = store.session?.tenantId || ''

    const { data, status } = await axiosV6({
      data: payload,
      headers: tenantId ? { 'X-Tenant-Id': tenantId } : undefined,
      method: 'POST',
      url: '/license/upgrade',
    })

    if (status !== 200 && status !== 201) {
      throw new Error('invalid status code')
    }

    response.data = {
      planType: data?.planType === 'trial' ? 'trial' : 'production',
      upgradedAtUtc: String(data?.upgradedAtUtc || new Date().toISOString()),
    }
  } catch (e: unknown) {
    console.error(e)
    const err = e as { response?: { data?: unknown } }
    response.error = getV6ApiErrorMessage(
      err?.response?.data,
      'Failed to upgrade license',
    )
  }

  return response
}

export default {
  upgradeLicenseToProduction,
  getLicenseSummary,
}
