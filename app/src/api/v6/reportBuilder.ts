import type {
  Report,
  ReportFieldSetting,
  ReportFilter,
  ReportSchedule,
  ReportStatus,
  ReportVisibility,
} from '@/pages/report-builder/types'
import { DEFAULT_SCHEDULE } from '@/pages/report-builder/types'
import authUserStore from '@/stores/authUserStore'
import { axiosV6 } from '../axios'
import { getV6ApiErrorMessage } from './auth'

const BASE = '/report-builder'

/** Every /api/report-builder call requires X-Tenant-Id alongside the bearer
 * token — axiosV6's interceptor only attaches the token, so each v6 API
 * module adds its own tenant header (see api/v6/workflows.ts). */
const getTenantHeaders = () => {
  const store = authUserStore.getState()
  const tenantId =
    store.session?.tenantId ||
    (store.identity as { tenantId?: string } | null)?.tenantId ||
    ''
  return { 'X-Tenant-Id': tenantId }
}

export interface ReportRunColumn {
  calc: string
  colType: string
  isCalculated: boolean
  key: string
  label: string
  width: number
}

export interface ReportRunResult {
  columns: ReportRunColumn[]
  domain: string
  name: string
  reportId: string | null
  rowCount: number
  rows: Record<string, string>[]
  sourceFormId?: string
  totals: Record<string, string> | null
  workflowId?: string
}

export interface ReportBuilderFormOption {
  formId: string
  formName: string
  type?: string
}

export interface ReportBuilderFieldOption {
  id: string
  isMandatory?: boolean
  label: string
  type: string
}

export interface ReportBuilderDomainOption {
  description?: string | null
  formId: string
  name: string
  workflowId: string
}

/** Fields shared by the create/update/preview payload — a `Report` row, an
 * in-progress `ReportDraft`, or any other shape carrying the wizard state
 * all satisfy this structurally, so callers don't need to build a full
 * `Report` (with id/owner/runs/etc.) just to hit /preview. */
export interface ReportBuilderPayloadSource {
  customFields?: unknown[]
  description: string
  domain: string
  fields: string[]
  fieldSettings: Record<string, ReportFieldSetting>
  filters: ReportFilter[]
  id?: string
  name: string
  schedule: ReportSchedule
  scheduled: boolean
  sharedGroups: string[]
  sharedUsers: string[]
  sourceFormId?: string
  sourceId?: string
  sourceType?: string
  status?: ReportStatus
  visibility: ReportVisibility
}

const asArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? value : [])

const asRecord = <T,>(value: unknown): Record<string, T> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, T>)
    : {}

const toReportBuilderPayload = (report: ReportBuilderPayloadSource) => ({
  customFields: report.customFields ?? [],
  description: report.description,
  domain: report.domain,
  fields: report.fields,
  fieldSettings: report.fieldSettings,
  filters: report.filters.map((filter) => ({
    field: filter.field,
    fieldId: filter.field,
    id: filter.id,
    operator: filter.operator,
    value: filter.value,
  })),
  id: report.id || undefined,
  name: report.name,
  schedule: report.schedule,
  scheduled: report.scheduled,
  sharedGroups: report.sharedGroups,
  sharedUsers: report.sharedUsers,
  // domain already holds the workflow/folder name — the guide's `sourceForm`
  // field is the same value for the Workflow source path this app supports.
  sourceForm: report.domain,
  sourceFormId: report.sourceFormId || undefined,
  sourceType: report.sourceType || undefined,
  status: report.status || 'Draft',
  visibility: report.visibility,
})

export const fromReportBuilderConfig = (data: unknown): Report => {
  const record = asRecord<unknown>(data)
  return {
    createdAt: (record.createdAt as string) || new Date().toISOString(),
    customFields: asArray(record.customFields),
    description: (record.description as string) || '',
    domain: (record.domain as string) || '',
    fields: asArray<string>(record.fields),
    fieldSettings: asRecord<ReportFieldSetting>(record.fieldSettings),
    filters: asArray<Record<string, unknown>>(record.filters).map((f) => ({
      field: (f.fieldId as string) || (f.field as string) || '',
      id: (f.id as string) || (f.fieldId as string) || (f.field as string) || '',
      operator: (f.operator as ReportFilter['operator']) || 'equals',
      value: (f.value as string) ?? '',
    })),
    id: (record.id as string) || '',
    modified:
      (record.modified as string) ||
      (record.modifiedAt as string) ||
      new Date().toISOString(),
    name: (record.name as string) || '',
    owner: (record.owner as string) || (record.ownerUserId as string) || 'You',
    runs: (record.runs as number) || 0,
    schedule: { ...DEFAULT_SCHEDULE, ...asRecord(record.schedule) },
    scheduled: Boolean(record.scheduled),
    sharedGroups: asArray<string>(record.sharedGroups),
    sharedUsers: asArray<string>(record.sharedUsers),
    sourceFormId: (record.sourceFormId as string) || '',
    sourceId: (record.sourceId as string) || (record.workflowId as string) || '',
    sourceType: (record.sourceType as Report['sourceType']) || '',
    status: (record.status as ReportStatus) || 'Draft',
    visibility: (record.visibility as ReportVisibility) || 'Private',
  }
}

export const listReportBuilderReports = async (params?: {
  domain?: string
  scheduled?: boolean
  search?: string
  status?: string
}) => {
  try {
    const { data } = await axiosV6({
      headers: getTenantHeaders(),
      method: 'GET',
      params,
      skipCancellation: true,
      url: BASE,
    })
    return { data: asArray<unknown>(data).map(fromReportBuilderConfig), error: '' }
  } catch (error: unknown) {
    const err = error as { response?: { data?: unknown } }
    console.error(error)
    return {
      data: [] as Report[],
      error: getV6ApiErrorMessage(err?.response?.data, 'Failed to load reports'),
    }
  }
}

export const getReportBuilderDomains = async () => {
  try {
    const { data } = await axiosV6({
      headers: getTenantHeaders(),
      method: 'GET',
      skipCancellation: true,
      url: `${BASE}/domains`,
    })
    return { data: asArray<ReportBuilderDomainOption>(data), error: '' }
  } catch (error: unknown) {
    const err = error as { response?: { data?: unknown } }
    console.error(error)
    return {
      data: [] as ReportBuilderDomainOption[],
      error: getV6ApiErrorMessage(err?.response?.data, 'Failed to load domains'),
    }
  }
}

export const getReportBuilderForms = async (sourceType?: string) => {
  try {
    const { data } = await axiosV6({
      headers: getTenantHeaders(),
      method: 'GET',
      params: sourceType ? { sourceType } : undefined,
      skipCancellation: true,
      url: `${BASE}/forms`,
    })
    return { data: asArray<ReportBuilderFormOption>(data), error: '' }
  } catch (error: unknown) {
    const err = error as { response?: { data?: unknown } }
    console.error(error)
    return {
      data: [] as ReportBuilderFormOption[],
      error: getV6ApiErrorMessage(err?.response?.data, 'Failed to load forms'),
    }
  }
}

export const getReportBuilderFields = async (params: {
  domain?: string
  sourceForm?: string
  sourceFormId?: string
  sourceType?: string
}) => {
  try {
    const { data } = await axiosV6({
      headers: getTenantHeaders(),
      method: 'GET',
      params,
      skipCancellation: true,
      url: `${BASE}/fields`,
    })
    return { data: asArray<ReportBuilderFieldOption>(data), error: '' }
  } catch (error: unknown) {
    const err = error as { response?: { data?: unknown } }
    console.error(error)
    return {
      data: [] as ReportBuilderFieldOption[],
      error: getV6ApiErrorMessage(
        err?.response?.data,
        "Couldn't load fields for this form.",
      ),
    }
  }
}

export const previewReportBuilderReport = async (
  report: ReportBuilderPayloadSource,
) => {
  try {
    const { data } = await axiosV6({
      data: toReportBuilderPayload(report),
      headers: getTenantHeaders(),
      method: 'POST',
      skipCancellation: true,
      url: `${BASE}/preview`,
    })
    return { data: data as ReportRunResult, error: '' }
  } catch (error: unknown) {
    const err = error as { response?: { data?: unknown } }
    console.error(error)
    return {
      data: null as ReportRunResult | null,
      error: getV6ApiErrorMessage(err?.response?.data, 'Failed to generate preview'),
    }
  }
}

export const createReportBuilderReport = async (
  report: ReportBuilderPayloadSource,
) => {
  try {
    const { data } = await axiosV6({
      data: toReportBuilderPayload(report),
      headers: getTenantHeaders(),
      method: 'POST',
      skipCancellation: true,
      url: BASE,
    })
    return { data: fromReportBuilderConfig(data), error: '' }
  } catch (error: unknown) {
    const err = error as { response?: { data?: unknown } }
    console.error(error)
    return {
      data: null as Report | null,
      error: getV6ApiErrorMessage(err?.response?.data, 'Failed to save report'),
    }
  }
}

export const updateReportBuilderReport = async (
  id: string,
  report: ReportBuilderPayloadSource,
) => {
  try {
    const { data } = await axiosV6({
      data: toReportBuilderPayload(report),
      headers: getTenantHeaders(),
      method: 'PUT',
      skipCancellation: true,
      url: `${BASE}/${encodeURIComponent(id)}`,
    })
    return { data: fromReportBuilderConfig(data), error: '' }
  } catch (error: unknown) {
    const err = error as { response?: { data?: unknown; status?: number } }
    console.error(error)
    if (err?.response?.status === 403) {
      return {
        data: null as Report | null,
        error: 'Only the owner can update this report.',
      }
    }
    return {
      data: null as Report | null,
      error: getV6ApiErrorMessage(err?.response?.data, 'Failed to update report'),
    }
  }
}

export const publishReportBuilderReport = async (id: string) => {
  try {
    const { data } = await axiosV6({
      headers: getTenantHeaders(),
      method: 'POST',
      skipCancellation: true,
      url: `${BASE}/${encodeURIComponent(id)}/publish`,
    })
    return { data: fromReportBuilderConfig(data), error: '' }
  } catch (error: unknown) {
    const err = error as { response?: { data?: unknown } }
    console.error(error)
    return {
      data: null as Report | null,
      error: getV6ApiErrorMessage(err?.response?.data, 'Failed to publish report'),
    }
  }
}

export const deleteReportBuilderReport = async (id: string) => {
  try {
    await axiosV6({
      headers: getTenantHeaders(),
      method: 'DELETE',
      skipCancellation: true,
      url: `${BASE}/${encodeURIComponent(id)}`,
    })
    return { error: '' }
  } catch (error: unknown) {
    const err = error as { response?: { data?: unknown } }
    console.error(error)
    return {
      error: getV6ApiErrorMessage(err?.response?.data, 'Failed to delete report'),
    }
  }
}

export const getReportBuilderReportById = async (id: string) => {
  try {
    const { data, status } = await axiosV6({
      headers: getTenantHeaders(),
      method: 'GET',
      skipCancellation: true,
      url: `${BASE}/${encodeURIComponent(id)}`,
      validateStatus: (nextStatus: number) =>
        nextStatus === 404 || (nextStatus >= 200 && nextStatus < 300),
    })
    if (status === 404) {
      return { data: null as Report | null, error: '', notFound: true }
    }
    return { data: fromReportBuilderConfig(data), error: '', notFound: false }
  } catch (error: unknown) {
    const err = error as { response?: { data?: unknown; status?: number } }
    console.error(error)
    return {
      data: null as Report | null,
      error: getV6ApiErrorMessage(err?.response?.data, 'Report not found.'),
      notFound: err?.response?.status === 404,
    }
  }
}

export const getReportBuilderReportData = async (id: string) => {
  try {
    const { data } = await axiosV6({
      headers: getTenantHeaders(),
      method: 'GET',
      skipCancellation: true,
      url: `${BASE}/${encodeURIComponent(id)}/data`,
    })
    return { data: data as ReportRunResult, error: '' }
  } catch (error: unknown) {
    const err = error as { response?: { data?: unknown } }
    console.error(error)
    return {
      data: null as ReportRunResult | null,
      error: getV6ApiErrorMessage(err?.response?.data, 'Failed to load report data'),
    }
  }
}

export const runReportBuilderReport = async (
  id: string,
  options?: { download?: boolean; format?: string; sendEmail?: boolean },
) => {
  try {
    const response = await axiosV6({
      headers: getTenantHeaders(),
      method: 'POST',
      params: options,
      responseType: options?.download ? 'blob' : 'json',
      skipCancellation: true,
      url: `${BASE}/${encodeURIComponent(id)}/run`,
    })
    return { data: response.data, error: '', headers: response.headers }
  } catch (error: unknown) {
    const err = error as { response?: { data?: unknown } }
    console.error(error)
    return {
      data: null,
      error: getV6ApiErrorMessage(err?.response?.data, 'Failed to run report'),
      headers: undefined,
    }
  }
}
