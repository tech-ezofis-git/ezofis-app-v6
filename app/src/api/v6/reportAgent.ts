import type {
  ReportAgentType,
  ReportHighlightOperator,
} from '@/pages/report-builder/types'
import authUserStore from '@/stores/authUserStore'
import { axiosV6 } from '../axios'
import { getV6ApiErrorMessage } from './auth'

/**
 * Report AI Builder (V6): generate saves the report and returns its id; run,
 * reload and edits all go through that id. The UI never calls the Agents
 * service (/chat, /api/report-agent) directly.
 */
const BASE = '/report-ai-builder'

const getTenantHeaders = () => {
  const store = authUserStore.getState()
  const tenantId =
    store.session?.tenantId ||
    (store.identity as { tenantId?: string } | null)?.tenantId ||
    ''
  return { 'X-Tenant-Id': tenantId }
}

/** One highlight condition on an agent report column. */
export interface ReportSpecHighlightRule {
  color: string
  op: ReportHighlightOperator
  compareField?: string | null
  label?: string | null
  value?: string | number | boolean | null
  value2?: string | number | null
}

export interface ReportSpecHighlight {
  rules: ReportSpecHighlightRule[]
  default?: string | null
}

/** A column in the report agent's `reportSpec` palettes / `columns`. */
export interface ReportSpecColumn {
  key: string
  label: string
  editable?: boolean
  formula?: string | null
  highlight?: ReportSpecHighlight | null
  kind?: 'userdefined' | 'default' | 'agent' | string
  selected?: boolean
}

export interface ReportSpecFilter {
  field: string
  op: string
  editable?: boolean
  value?: unknown
}

export interface ReportSpec {
  columns: ReportSpecColumn[]
  title: string
  agentColumns?: ReportSpecColumn[]
  availableColumns?: string[]
  defaultColumns?: ReportSpecColumn[]
  filters?: ReportSpecFilter[]
  groupBy?: string[]
  objective?: string
  reportType?: string
  schemaTables?: string[]
  sort?: { direction: 'asc' | 'desc'; field: string } | null
  sourceSchema?: string | null
  sourceTable?: string | null
  userdefinedColumns?: ReportSpecColumn[]
  warnings?: string[]
}

export interface ReportAgentPromptResult {
  /** Saved AI report id: required for run, reload and PATCH. */
  id: string
  reportPrompt: string
  reportSpec: ReportSpec
  reportType: ReportAgentType
  title: string
  durationMs?: number
  schemaTables?: string[]
  warnings?: string[]
}

export interface ReportAgentRunResult {
  id?: string
  columns: ReportSpecColumn[]
  rows: Record<string, unknown>[]
  page?: number
  pageSize?: number
  reportType?: string
  title?: string
  totalCount?: number
  warnings?: string[]
}
export interface ReportAiPromptRequest {
  description: string
  reportType: ReportAgentType
  sessionId: string
  /** Existing report id: regenerate and overwrite instead of creating a new one. */
  id?: string | null
  /** Optional library card name. */
  name?: string | null
  repositoryName?: string | null
  workflowName?: string | null
}

export interface ReportAiRunRequest {
  page?: number
  pageSize?: number
  /** Send the edited prompt/spec so the run uses UI changes. */
  reportPrompt?: string
  reportSpec?: Record<string, unknown>
}

export interface ReportAiUpdateRequest {
  description?: string
  name?: string
  reportPrompt?: string
  reportSpec?: Record<string, unknown>
}

/** Summary row from GET /report-ai-builder. */
export interface ReportAiListItem {
  createdAtUtc: string
  description: string | null
  id: string
  modifiedAtUtc: string
  name: string
  reportType: ReportAgentType
  runs: number
  status: string
}

/** Full saved report from GET /report-ai-builder/{id}. */
export interface ReportAiRecord extends ReportAiListItem {
  reportPrompt: string
  reportSpec: ReportSpec
  repositoryName: string | null
  sessionId: string | null
  title: string
  warnings: string[]
  workflowName: string | null
}

export const createReportAgentSessionId = () =>
  `report-${
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)
  }`

// A specified workflow/repository run can fall back to a fake one-column
// table from workflow.Workflows; the guide says to treat it as a failure.
const LOCKED_RUN_WARNING =
  /dropped unknown source table|redirected report source/i

const errorFrom = (error: unknown, fallback: string) => {
  const err = error as { response?: { data?: unknown; status?: number } }
  console.error(error)
  if (err?.response?.status === 404) {
    return 'This AI report was not found. Generate it again.'
  }
  if (err?.response?.status === 502) {
    return 'The report agent is unavailable. Try again later.'
  }
  if (err?.response?.status === 504) {
    return 'The report agent timed out. Try again later.'
  }
  return getV6ApiErrorMessage(err?.response?.data, fallback)
}

export const generateReportAiPrompt = async (body: ReportAiPromptRequest) => {
  try {
    const { data } = await axiosV6({
      data: body,
      headers: getTenantHeaders(),
      method: 'POST',
      skipCancellation: true,
      url: `${BASE}/prompt`,
    })
    const result = data as ReportAgentPromptResult | null
    if (!result?.id || !result.reportSpec) {
      return {
        data: null,
        error: 'The report agent did not return a saved report.',
      }
    }
    return { data: result, error: '' }
  } catch (error: unknown) {
    return {
      data: null as ReportAgentPromptResult | null,
      error: errorFrom(error, 'Failed to generate the report'),
    }
  }
}

export const runReportAiReport = async (
  id: string,
  body: ReportAiRunRequest,
) => {
  try {
    const { data } = await axiosV6({
      data: { page: 1, pageSize: 25, ...body },
      headers: getTenantHeaders(),
      method: 'POST',
      skipCancellation: true,
      url: `${BASE}/${encodeURIComponent(id)}/run`,
    })
    const result = data as ReportAgentRunResult | null
    if (!result) return { data: null, error: 'The report returned no data.' }
    const locked = (result.warnings ?? []).find((w) =>
      LOCKED_RUN_WARNING.test(w),
    )
    if (locked) {
      return { data: null, error: `This report can't be run yet: ${locked}` }
    }
    return {
      data: {
        ...result,
        columns: Array.isArray(result.columns) ? result.columns : [],
        rows: Array.isArray(result.rows) ? result.rows : [],
      },
      error: '',
    }
  } catch (error: unknown) {
    return {
      data: null as ReportAgentRunResult | null,
      error: errorFrom(error, 'Failed to run the report'),
    }
  }
}

export const getReportAiReport = async (id: string) => {
  try {
    const { data } = await axiosV6({
      headers: getTenantHeaders(),
      method: 'GET',
      skipCancellation: true,
      url: `${BASE}/${encodeURIComponent(id)}`,
      validateStatus: (status: number) =>
        status === 404 || (status >= 200 && status < 300),
    })
    if (!data || (data as { error?: string }).error) {
      return { data: null as ReportAiRecord | null, error: '', notFound: true }
    }
    return { data: data as ReportAiRecord, error: '', notFound: false }
  } catch (error: unknown) {
    return {
      data: null as ReportAiRecord | null,
      error: errorFrom(error, 'Failed to load the AI report'),
      notFound: false,
    }
  }
}

export const updateReportAiReport = async (
  id: string,
  body: ReportAiUpdateRequest,
) => {
  try {
    const { data } = await axiosV6({
      data: body,
      headers: getTenantHeaders(),
      method: 'PATCH',
      skipCancellation: true,
      url: `${BASE}/${encodeURIComponent(id)}`,
    })
    return { data: data as ReportAiRecord, error: '' }
  } catch (error: unknown) {
    return {
      data: null as ReportAiRecord | null,
      error: errorFrom(error, 'Failed to save the AI report'),
    }
  }
}

export const listReportAiReports = async () => {
  try {
    const { data } = await axiosV6({
      headers: getTenantHeaders(),
      method: 'GET',
      skipCancellation: true,
      url: BASE,
    })
    return {
      data: Array.isArray(data) ? (data as ReportAiListItem[]) : [],
      error: '',
    }
  } catch (error: unknown) {
    return {
      data: [] as ReportAiListItem[],
      error: errorFrom(error, 'Failed to load AI reports'),
    }
  }
}
