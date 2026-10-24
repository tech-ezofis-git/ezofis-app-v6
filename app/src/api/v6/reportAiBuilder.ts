import authUserStore from '@/stores/authUserStore'
import { axiosV6 } from '../axios'
import { getV6ApiErrorMessage } from './auth'

const BASE = '/report-ai-builder'

const getTenantHeaders = () => {
  const store = authUserStore.getState()
  const tenantId =
    store.session?.tenantId ||
    (store.identity as { tenantId?: string } | null)?.tenantId ||
    ''
  return { 'X-Tenant-Id': tenantId }
}

const getAxiosErrorData = (error: unknown) => {
  if (!error || typeof error !== 'object' || !('response' in error)) {
    return undefined
  }
  return (error as { response?: { data?: unknown } }).response?.data
}

const throwApiError = (error: unknown, fallback: string): never => {
  throw new Error(getV6ApiErrorMessage(getAxiosErrorData(error), fallback))
}

export type ReportAiColumn = {
  formula?: string | null
  key: string
  label: string
  selected?: boolean
}

export type ReportAiSpec = {
  agentColumns?: ReportAiColumn[]
  availableColumns?: string[]
  columns?: ReportAiColumn[]
  defaultColumns?: ReportAiColumn[]
  filters?: { field: string; op: string; value?: unknown }[]
  groupBy?: string[]
  objective?: string
  reportType?: string
  schemaTables?: string[]
  sort?: { direction: 'asc' | 'desc'; field: string }
  sourceSchema?: string | null
  sourceTable?: string | null
  title?: string
  userdefinedColumns?: ReportAiColumn[]
}

export type ReportAiPromptResponse = {
  durationMs?: number
  id: string
  reportPrompt: string
  reportSpec?: ReportAiSpec
  reportType?: string
  schemaTables?: string[]
  sessionId?: string
  title?: string
  warnings?: string[]
}

export type ReportAiRunResponse = {
  columns?: { key: string; label: string }[]
  id: string
  page?: number
  pageSize?: number
  reportType?: string
  rows?: Record<string, unknown>[]
  title?: string
  totalCount?: number
  warnings?: string[]
}

export async function generateReportPrompt(body: {
  description: string
  id?: string | null
  name?: string
  reportType: string
  repositoryName?: string | null
  sessionId: string
  workflowName?: string | null
}): Promise<ReportAiPromptResponse> {
  try {
    const { data } = await axiosV6.post(BASE + '/prompt', body, {
      headers: getTenantHeaders(),
    })
    return data as ReportAiPromptResponse
  } catch (error) {
    throwApiError(error, 'Failed to generate report prompt')
  }
}

export async function runSavedReport(
  id: string,
  body?: {
    page?: number
    pageSize?: number
    reportPrompt?: string
    reportSpec?: ReportAiSpec | null
  },
): Promise<ReportAiRunResponse> {
  try {
    const { data } = await axiosV6.post(`${BASE}/${id}/run`, body ?? {}, {
      headers: getTenantHeaders(),
    })
    return data as ReportAiRunResponse
  } catch (error) {
    throwApiError(error, 'Failed to run report')
  }
}

export async function getSavedReport(id: string): Promise<ReportAiPromptResponse> {
  try {
    const { data } = await axiosV6.get(`${BASE}/${id}`, {
      headers: getTenantHeaders(),
    })
    return data as ReportAiPromptResponse
  } catch (error) {
    throwApiError(error, 'Failed to load saved report')
  }
}

export async function updateSavedReport(
  id: string,
  body: { reportPrompt?: string; reportSpec?: ReportAiSpec | null },
): Promise<ReportAiPromptResponse> {
  try {
    const { data } = await axiosV6.patch(`${BASE}/${id}`, body, {
      headers: getTenantHeaders(),
    })
    return data as ReportAiPromptResponse
  } catch (error) {
    throwApiError(error, 'Failed to save report prompt')
  }
}
