import type {
  ReportAgentType,
  ReportHighlightOperator,
  ReportVisibility,
} from '@/pages/report-builder/types'
import authUserStore from '@/stores/authUserStore'
import { axiosV6, getV6ApiBaseUrl } from '../axios'
import { getV6ApiErrorMessage } from './auth'

/**
 * Report Agent v2 (agents service, `/api/report-agent-v2`): a prompt is
 * previewed (generated + run, nothing saved), the user edits it in the wizard
 * (edits are re-run without the LLM), then it is saved explicitly. Saved
 * reports run by id. In production nginx routes this path to the agents
 * container; locally set VITE_REPORT_AGENT_V2_URL to the agents service.
 */
const reportAgentBase = () =>
  (
    import.meta.env?.VITE_REPORT_AGENT_V2_URL ||
    `${getV6ApiBaseUrl().replace(/\/+$/, '')}/report-agent-v2`
  ).replace(/\/+$/, '')

const getTenantHeaders = () => {
  const store = authUserStore.getState()
  const tenantId =
    store.session?.tenantId ||
    (store.identity as { tenantId?: string } | null)?.tenantId ||
    ''
  return { 'X-Tenant-Id': tenantId }
}

export interface ReportAgentPromptResult {
  /** Saved report id; empty until the previewed report is saved. */
  id: string
  reportPrompt: string
  reportSpec: ReportSpec
  reportType: ReportAgentType
  title: string
  durationMs?: number
  /** Rows of the generated report (preview only, up to 50). */
  preview?: ReportAgentRunResult | null
  schemaTables?: string[]
  warnings?: string[]
}

export interface ReportAgentRunResult {
  columns: ReportSpecColumn[]
  rows: Record<string, unknown>[]
  id?: string
  page?: number
  pageSize?: number
  reportType?: string
  title?: string
  totalCount?: number
  warnings?: string[]
}

/**
 * The executable part of a v2 report, carried inside `reportSpec.agentSpec`.
 * Default (system) reports carry `kind: 'system'` and a template key instead.
 */
export interface ReportAgentSpecPart {
  engine?: string
  kind?: 'system' | string
  sourceId?: string
  sourceType?: 'Folder' | 'Workflow' | string
  spec?: Record<string, unknown>
  template?: string
}

/** agent: built from a prompt; default: one of the fixed default reports. */
export type ReportAiKind = 'agent' | 'default' | 'legacy'

/** Summary row from GET /reports. */
export interface ReportAiListItem {
  createdAtUtc: string
  description: string | null
  id: string
  modifiedAtUtc: string
  name: string
  reportType: ReportAgentType
  runs: number
  status: string
  canEdit?: boolean
  kind?: ReportAiKind
  /** Specific-scope source names; the list endpoint may omit them. */
  repositoryName?: string | null
  sharedGroups?: string[] | null
  sharedUsers?: string[] | null
  visibility?: string | null
  workflowName?: string | null
}

export interface ReportAiPromptRequest {
  description: string
  reportType: ReportAgentType
  sessionId: string
  /** Existing report id (unused by preview; kept for the caller's draft). */
  id?: string | null
  /** Optional library card name. */
  name?: string | null
  repositoryName?: string | null
  /** Selected workflow / repository id (preferred over the name when set). */
  sourceId?: string | null
  workflowName?: string | null
}

/** Full saved report from GET /definitions/{id}. */
export interface ReportAiRecord extends ReportAiListItem {
  reportPrompt: string
  reportSpec: ReportSpec
  repositoryName: string | null
  sessionId: string | null
  title: string
  warnings: string[]
  workflowName: string | null
}

export interface ReportAiRunRequest {
  /** A report saved by the old AI builder: run by the V6 API, not Report Agent v2. */
  legacy?: boolean
  page?: number
  pageSize?: number
  /** Send the edited prompt/spec so the run uses UI changes. */
  reportPrompt?: string
  reportSpec?: Record<string, unknown>
}
export interface ReportAiUpdateRequest {
  description?: string
  name?: string
  /** The user's report request; defaults to the spec's userPrompt. */
  prompt?: string
  reportPrompt?: string
  reportSpec?: Record<string, unknown>
  sharedGroups?: string[]
  sharedUsers?: string[]
  status?: 'Draft' | 'Published'
  visibility?: ReportVisibility
}

export interface ReportSpec {
  columns: ReportSpecColumn[]
  title: string
  agentColumns?: ReportSpecColumn[]
  agentSpec?: ReportAgentSpecPart
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
  userPrompt?: string | null
  warnings?: string[]
}

/** A column in the report agent's `reportSpec` palettes / `columns`. */
export interface ReportSpecColumn {
  key: string
  label: string
  /** "Sum" on run results for columns the report totals (e.g. Credits). */
  calc?: string
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

export interface ReportSpecHighlight {
  rules: ReportSpecHighlightRule[]
  default?: string | null
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

export const createReportAgentSessionId = () =>
  `report-${
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)
  }`

/** Shown for any failed run instead of the raw backend / agent message. */
export const REPORT_RUN_ERROR_MESSAGE =
  "We couldn't run this report right now. Please try again in a moment, or edit the report's columns and filters and run it again."

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const isUuid = (value: unknown): value is string =>
  typeof value === 'string' && UUID_RE.test(value)

const errorFrom = (error: unknown, fallback: string) => {
  const err = error as { response?: { data?: unknown; status?: number } }
  console.error(error)
  const status = err?.response?.status
  if (status === 404) return 'This report was not found.'
  if (status === 502) return 'The report agent is unavailable. Try again later.'
  if (status === 503)
    return 'The report service is unavailable. Try again later.'
  if (status === 504) return 'The report agent timed out. Try again later.'
  return getV6ApiErrorMessage(err?.response?.data, fallback)
}

// Run failures map to friendly copy only; the backend's own message is logged,
// never shown (except the "unavailable / not found" cases above).
const runErrorFrom = (error: unknown) => {
  const status = (error as { response?: { status?: number } })?.response?.status
  if (status === 404 || status === 502 || status === 503 || status === 504) {
    return errorFrom(error, REPORT_RUN_ERROR_MESSAGE)
  }
  console.error(error)
  return REPORT_RUN_ERROR_MESSAGE
}

/** `{sourceType, workflowId | repositoryId}` for a v2 request. */
const sourceBody = (
  sourceType: string | undefined,
  id: string | null | undefined,
  name: string | null | undefined,
) => {
  const folder = sourceType === 'Folder'
  const key = folder ? 'repository' : 'workflow'
  return {
    sourceType: folder ? 'Folder' : 'Workflow',
    ...(isUuid(id) ? { [`${key}Id`]: id } : { [`${key}Name`]: name || id }),
  }
}

const agentPart = (spec: Record<string, unknown> | undefined) =>
  ((spec as ReportSpec | undefined)?.agentSpec ?? {}) as ReportAgentSpecPart

/** The source a saved / previewed spec belongs to (from its agentSpec). */
const sourceFromSpec = (spec: Record<string, unknown> | undefined) => {
  const agent = agentPart(spec)
  return sourceBody(agent.sourceType, agent.sourceId, null)
}

interface V2RunPayload {
  columns?: { key: string; calc?: string; label?: string }[]
  rowCount?: number
  rows?: Record<string, unknown>[]
  truncated?: boolean
  warnings?: string[]
}

const toRunResult = (
  payload: V2RunPayload | null | undefined,
  warnings: string[] = [],
): ReportAgentRunResult => {
  const rows = Array.isArray(payload?.rows) ? payload.rows : []
  return {
    columns: (payload?.columns ?? []).map((column) => ({
      calc: column.calc,
      key: column.key,
      label: column.label || column.key,
    })),
    rows,
    totalCount: payload?.rowCount ?? rows.length,
    warnings: payload?.warnings ?? warnings,
  }
}

interface V2Definition {
  reportPrompt: string
  reportSpec: ReportSpec
  reportType: ReportAgentType
  title: string
  canEdit?: boolean
  createdAtUtc?: string | null
  description?: string | null
  durationMs?: number
  id?: string
  modifiedAtUtc?: string | null
  name?: string
  preview?: V2RunPayload
  repositoryName?: string | null
  runs?: number
  schemaTables?: string[]
  sessionId?: string | null
  sharedGroups?: string[]
  sharedUsers?: string[]
  status?: string
  visibility?: string | null
  warnings?: string[]
  workflowName?: string | null
}

/** True for a report saved by the old AI builder (its spec has no Report Agent v2 part). */
export const isLegacyReportSpec = (spec: unknown) =>
  kindOfSpec(spec as ReportSpec | undefined) === 'legacy'

const kindOfSpec = (spec: ReportSpec | undefined): ReportAiKind =>
  spec?.agentSpec?.kind === 'system'
    ? 'default'
    : spec?.agentSpec?.spec
      ? 'agent'
      : 'legacy'

const toRecord = (data: V2Definition): ReportAiRecord => ({
  canEdit: data.canEdit,
  createdAtUtc: data.createdAtUtc || new Date().toISOString(),
  description: data.description ?? '',
  id: data.id || '',
  kind: kindOfSpec(data.reportSpec),
  modifiedAtUtc:
    data.modifiedAtUtc || data.createdAtUtc || new Date().toISOString(),
  name: data.name || data.title,
  reportPrompt: data.reportPrompt || '',
  reportSpec: data.reportSpec,
  reportType: data.reportType,
  repositoryName: data.repositoryName ?? null,
  runs: data.runs ?? 0,
  sessionId: data.sessionId ?? null,
  sharedGroups: data.sharedGroups ?? [],
  sharedUsers: data.sharedUsers ?? [],
  status: data.status || 'Draft',
  title: data.title || data.name || '',
  visibility: data.visibility ?? 'Private',
  warnings: data.warnings ?? [],
  workflowName: data.workflowName ?? null,
})

/** Generates a report from a prompt and runs it (preview: nothing is saved). */
export const generateReportAiPrompt = async (body: ReportAiPromptRequest) => {
  try {
    const folder = body.reportType === 'specific_repository'
    const { data } = await axiosV6({
      data: {
        ...sourceBody(
          folder ? 'Folder' : 'Workflow',
          body.sourceId,
          folder ? body.repositoryName : body.workflowName,
        ),
        name: body.name || undefined,
        prompt: body.description,
        sessionId: body.sessionId,
      },
      headers: getTenantHeaders(),
      method: 'POST',
      skipCancellation: true,
      url: `${reportAgentBase()}/definitions/preview`,
    })
    const result = data as V2Definition | null
    if (!result?.reportSpec) {
      return {
        data: null,
        error: 'The report agent did not return a report.',
      }
    }
    return {
      data: {
        durationMs: result.durationMs,
        id: '',
        preview: toRunResult(result.preview, result.warnings),
        reportPrompt: result.reportPrompt,
        reportSpec: result.reportSpec,
        reportType: result.reportType,
        schemaTables: result.schemaTables,
        title: result.title,
        warnings: result.warnings,
      } satisfies ReportAgentPromptResult,
      error: '',
    }
  } catch (error: unknown) {
    return {
      data: null as ReportAgentPromptResult | null,
      error: errorFrom(error, 'Failed to generate the report'),
    }
  }
}

/**
 * Runs a report. With an (edited) `reportSpec` it re-runs that spec with the
 * edits applied, without the LLM (wizard preview, up to 50 rows). Without
 * one, it runs the saved report by id (`pageSize` = row limit).
 */
export const runReportAiReport = async (
  id: string,
  body: ReportAiRunRequest,
) => {
  try {
    const spec = body.reportSpec
    if (spec && agentPart(spec).spec) {
      const { data } = await axiosV6({
        data: {
          ...sourceFromSpec(spec),
          prompt: (spec as unknown as ReportSpec).userPrompt || undefined,
          reportSpec: spec,
        },
        headers: getTenantHeaders(),
        method: 'POST',
        skipCancellation: true,
        url: `${reportAgentBase()}/definitions/preview`,
      })
      const result = data as V2Definition | null
      if (!result) return { data: null, error: REPORT_RUN_ERROR_MESSAGE }
      return {
        data: { ...toRunResult(result.preview, result.warnings), id },
        error: '',
      }
    }
    if (!id) return { data: null, error: REPORT_RUN_ERROR_MESSAGE }
    if (body.legacy) {
      // Old AI builder reports still run on the V6 API, which returns the
      // same columns/rows shape.
      const { data } = await axiosV6({
        data: { page: body.page ?? 1, pageSize: body.pageSize ?? 500 },
        method: 'POST',
        skipCancellation: true,
        url: `/report-ai-builder/${encodeURIComponent(id)}/run`,
      })
      const result = data as
        | (V2RunPayload & { title?: string; totalCount?: number })
        | null
      if (!result) return { data: null, error: REPORT_RUN_ERROR_MESSAGE }
      return {
        data: {
          ...toRunResult({ ...result, rowCount: result.totalCount }),
          id,
          title: result.title,
        },
        error: '',
      }
    }
    const { data } = await axiosV6({
      headers: getTenantHeaders(),
      method: 'GET',
      params: body.pageSize ? { limit: body.pageSize } : undefined,
      skipCancellation: true,
      url: `${reportAgentBase()}/reports/${encodeURIComponent(id)}/execute`,
    })
    const result = data as (V2RunPayload & { name?: string }) | null
    if (!result) return { data: null, error: REPORT_RUN_ERROR_MESSAGE }
    return {
      data: { ...toRunResult(result), id, title: result.name },
      error: '',
    }
  } catch (error: unknown) {
    return {
      data: null as ReportAgentRunResult | null,
      error: runErrorFrom(error),
    }
  }
}

export const getReportAiReport = async (id: string) => {
  try {
    const { data } = await axiosV6({
      headers: getTenantHeaders(),
      method: 'GET',
      skipCancellation: true,
      url: `${reportAgentBase()}/definitions/${encodeURIComponent(id)}`,
      validateStatus: (status: number) =>
        status === 404 || status === 422 || (status >= 200 && status < 300),
    })
    if (!data || (data as { error?: string }).error) {
      return { data: null as ReportAiRecord | null, error: '', notFound: true }
    }
    return { data: toRecord(data as V2Definition), error: '', notFound: false }
  } catch (error: unknown) {
    return {
      data: null as ReportAiRecord | null,
      error: errorFrom(error, 'Failed to load the AI report'),
      notFound: false,
    }
  }
}

/**
 * Saves a previewed report (`id` empty) or updates a saved one, exactly as
 * edited in the wizard: columns, labels, filters, highlights, sharing and
 * status. No LLM call.
 */
export const saveReportAiReport = async (
  id: string | null | undefined,
  body: ReportAiUpdateRequest,
) => {
  const spec = body.reportSpec
  if (agentPart(spec).kind === 'system') {
    return {
      data: null as ReportAiRecord | null,
      error: "Default reports can't be edited.",
    }
  }
  try {
    const { data } = await axiosV6({
      data: {
        ...sourceFromSpec(spec),
        description: body.description,
        id: id || undefined,
        name: body.name,
        prompt:
          body.prompt ||
          (spec as unknown as ReportSpec | undefined)?.userPrompt ||
          body.name ||
          'Report',
        reportSpec: spec,
        sharedGroups: (body.sharedGroups ?? []).filter(isUuid),
        sharedUsers: (body.sharedUsers ?? []).filter(isUuid),
        status: body.status,
        visibility: body.visibility,
      },
      headers: getTenantHeaders(),
      method: 'POST',
      skipCancellation: true,
      url: `${reportAgentBase()}/definitions/save`,
    })
    return { data: toRecord(data as V2Definition), error: '' }
  } catch (error: unknown) {
    return {
      data: null as ReportAiRecord | null,
      error: errorFrom(error, 'Failed to save the AI report'),
    }
  }
}

export const updateReportAiReport = saveReportAiReport

/**
 * Sets column highlight rules on a saved report (default reports included);
 * keys are column keys, `null` clears a column. Owner or admin only.
 */
export const updateReportAiHighlights = async (
  id: string,
  columns: Record<string, ReportSpecHighlight | null>,
) => {
  try {
    const { data } = await axiosV6({
      data: { columns },
      headers: getTenantHeaders(),
      method: 'PUT',
      skipCancellation: true,
      url: `${reportAgentBase()}/definitions/${encodeURIComponent(id)}/highlights`,
    })
    return { data: toRecord(data as V2Definition), error: '' }
  } catch (error: unknown) {
    return {
      data: null as ReportAiRecord | null,
      error: errorFrom(error, 'Failed to save the highlights'),
    }
  }
}

/** Report Agent v2 has no delete; reports are removed from the database. */
export const deleteReportAiReport = async (_id: string) => ({
  error: "AI reports can't be deleted here yet.",
})

export const listReportAiReports = async () => {
  try {
    const { data } = await axiosV6({
      headers: getTenantHeaders(),
      method: 'GET',
      // `all`: reports saved by the old AI builder too (run on the V6 API).
      params: { kind: 'all', pageSize: 500 },
      skipCancellation: true,
      url: `${reportAgentBase()}/reports`,
    })
    const items = (data as { items?: Record<string, unknown>[] } | null)?.items
    return {
      data: (Array.isArray(items) ? items : []).map(
        (item) =>
          ({
            ...item,
            createdAtUtc: String(item.createdAtUtc ?? ''),
            modifiedAtUtc: String(
              item.modifiedAtUtc ?? item.createdAtUtc ?? '',
            ),
          }) as unknown as ReportAiListItem,
      ),
      error: '',
    }
  } catch (error: unknown) {
    return {
      data: [] as ReportAiListItem[],
      error: errorFrom(error, 'Failed to load AI reports'),
    }
  }
}
