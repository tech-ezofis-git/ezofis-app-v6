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

export type ReportAiListItem = {
  createdAtUtc?: string
  description?: string
  id: string
  modifiedAtUtc?: string
  name: string
  reportType?: string
  repositoryName?: string | null
  runs?: number
  status?: string
  workflowName?: string | null
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

const runBody = (spec?: ReportAiSpec | null, prompt?: string) => ({
  page: 1,
  pageSize: 25,
  reportPrompt: prompt,
  reportSpec: spec,
})

const fileNameFromDisposition = (
  headers: Record<string, unknown> | undefined,
  fallback: string,
) => {
  const raw = String(
    headers?.['content-disposition'] ?? headers?.['Content-Disposition'] ?? '',
  )
  const match = /filename\*?=(?:UTF-8''|"?)([^";]+)/i.exec(raw)
  if (!match?.[1]) return fallback
  try {
    return decodeURIComponent(match[1].replaceAll('"', '').trim())
  } catch {
    return match[1].replaceAll('"', '').trim()
  }
}

const throwBlobError = async (error: unknown, fallback: string): Promise<never> => {
  const data = getAxiosErrorData(error)
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text()) as { error?: string }
      if (parsed.error) throw new Error(parsed.error)
    } catch (inner) {
      if (inner instanceof Error && inner.message !== fallback) throw inner
    }
  }
  throwApiError(error, fallback)
}

export async function exportSavedReport(
  id: string,
  format: 'CSV' | 'PDF' | 'Excel',
  body?: { reportPrompt?: string; reportSpec?: ReportAiSpec | null },
): Promise<{ blob: Blob; fileName: string }> {
  try {
    const response = await axiosV6.post(
      `${BASE}/${id}/run`,
      runBody(body?.reportSpec, body?.reportPrompt),
      {
        headers: getTenantHeaders(),
        params: { download: true, format },
        responseType: 'blob',
      },
    )
    const blob = response.data as Blob
    if (blob.type.includes('application/json')) {
      const parsed = JSON.parse(await blob.text()) as { error?: string }
      throw new Error(parsed.error || 'Failed to export report')
    }
    return {
      blob,
      fileName: fileNameFromDisposition(
        response.headers as Record<string, unknown>,
        `report.${format.toLowerCase()}`,
      ),
    }
  } catch (error) {
    await throwBlobError(error, 'Failed to export report')
  }
}

export async function emailSavedReport(
  id: string,
  body: {
    format?: 'CSV' | 'PDF' | 'Excel'
    recipients: string[]
    cc?: string[]
    subject?: string
    message?: string
    reportPrompt?: string
    reportSpec?: ReportAiSpec | null
  },
): Promise<ReportAiRunResponse> {
  try {
    const { data } = await axiosV6.post(
      `${BASE}/${id}/run`,
      {
        ...runBody(body.reportSpec, body.reportPrompt),
        sendEmail: true,
        format: body.format ?? 'PDF',
        recipients: body.recipients,
        cc: body.cc,
        subject: body.subject,
        message: body.message,
      },
      {
        headers: getTenantHeaders(),
        params: { sendEmail: true, format: body.format ?? 'PDF' },
      },
    )
    return data as ReportAiRunResponse
  } catch (error) {
    throwApiError(error, 'Failed to email report')
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

export async function listSavedReports(): Promise<ReportAiListItem[]> {
  try {
    const { data } = await axiosV6.get(BASE, {
      headers: getTenantHeaders(),
    })
    return Array.isArray(data) ? (data as ReportAiListItem[]) : []
  } catch (error) {
    throwApiError(error, 'Failed to list saved reports')
  }
}

export async function deleteSavedReport(id: string): Promise<void> {
  try {
    await axiosV6.delete(`${BASE}/${id}`, {
      headers: getTenantHeaders(),
    })
  } catch (error) {
    throwApiError(error, 'Failed to delete report')
  }
}
