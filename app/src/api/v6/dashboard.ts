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
  } catch (error) {
    console.error(error)
    response.error = getV6ApiErrorMessage(
      getAxiosErrorData(error),
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
  dashboard_json?: DashboardSchemaResult
  message?: string
  repositoryId?: string
  sessionId?: string
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

export type DashboardPromptRequest = {
  repositoryId?: string
  sessionId?: string
  tenantId: string
  workflowId?: string
}

export type DashboardPromptResult = {
  correlation_id?: string
  latency_ms?: number
  prompt: string
  repository_id?: string
  repository_name?: string
  session_id: string
  table?: string
  tenant_id?: string
  workflow_id?: string
  workflow_name?: string
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
  message?: string
  phase: string
  repository_id?: string
  repository_name?: string
  repositoryId?: string
  table?: string
  tenant_id?: string
  tenantId?: string
  workflow?: string
  workflow_id?: string | null
}

export type SaveDashboardSchemaRequest = {
  dashboard_json?: DashboardSchemaResult
  dashboard_result?: DashboardSchemaResult
  repositoryId?: string
  tenantId: string
  workflowId?: string
}

export type SavedDashboardLookup = {
  repositoryId?: string
  tenantId: string
  workflowId?: string
}

export type SavedDashboardSnapshot = {
  dashboardHtml: string
  repositoryId?: string
  schema: DashboardSchemaResult | null
  tenantId?: string
  workflowId?: string
}

const DASHBOARD_API_TIMEOUT_MS = 180_000

const buildTenantHeaders = (tenantId?: string) => {
  const store = authUserStore.getState()
  const resolvedTenantId = store.session?.tenantId || tenantId || ''
  return resolvedTenantId ? { 'X-Tenant-Id': resolvedTenantId } : undefined
}

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

const parseDashboardResult = (value: unknown): DashboardSchemaResult | null => {
  let result = value
  if (typeof result === 'string') {
    try {
      result = JSON.parse(result)
    } catch {
      return null
    }
  }
  const record = asRecord(result)
  if (!record) return null

  const nested = record.dashboard_result ?? record.dashboardResult
  if (nested && nested !== result) {
    return parseDashboardResult(nested)
  }

  const kpis = Array.isArray(record.kpis) ? (record.kpis as DashboardKpi[]) : []
  const charts = Array.isArray(record.charts)
    ? (record.charts as DashboardChart[])
    : []
  if (kpis.length === 0 && charts.length === 0 && !record.phase) {
    return null
  }

  return {
    ...(result as DashboardSchemaResult),
    charts,
    kpis,
  }
}

const getAxiosStatus = (error: unknown) => {
  if (!error || typeof error !== 'object' || !('response' in error)) return 0
  return Number(
    (error as { response?: { status?: number } }).response?.status || 0,
  )
}

const HTML_FIELD_KEYS = [
  'dashboardHtml',
  'DashboardHtml',
  'dashboard_html',
  'html',
  'Html',
] as const

const looksLikeDashboardMarkup = (value: string) => {
  const trimmed = value.trim()
  return (
    trimmed.startsWith('<') ||
    trimmed.includes('ez-dash') ||
    trimmed.includes('<style')
  )
}

const readHtmlField = (record: Record<string, unknown>) => {
  for (const key of HTML_FIELD_KEYS) {
    const candidate = record[key]
    if (typeof candidate === 'string' && candidate.trim()) return candidate
  }
  return ''
}

const extractDashboardHtml = (data: unknown): string => {
  const visit = (value: unknown, depth: number): string => {
    if (depth > 6 || value == null) return ''
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (!trimmed) return ''
      if (looksLikeDashboardMarkup(trimmed)) return value
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          return visit(JSON.parse(trimmed), depth + 1)
        } catch {
          return ''
        }
      }
      return ''
    }
    const record = asRecord(value)
    if (!record) return ''
    const direct = readHtmlField(record)
    if (direct) return direct
    for (const nested of Object.values(record)) {
      const found = visit(nested, depth + 1)
      if (found) return found
    }
    return ''
  }

  return visit(data, 0).trim()
}

const getAxiosErrorData = (error: unknown) => {
  if (!error || typeof error !== 'object' || !('response' in error)) {
    return undefined
  }
  return (error as { response?: { data?: unknown } }).response?.data
}

const asId = (value?: string | null) => {
  if (value == null) return ''
  const trimmed = String(value).trim()
  if (!trimmed || trimmed.toLowerCase() === 'null') return ''
  return trimmed
}

/** Prefer workflow_id; never send empty ids or both source keys together. */
const buildDashboardSourceIds = (payload: {
  repositoryId?: string | null
  workflowId?: string | null
}) => {
  const workflowId = asId(payload.workflowId)
  if (workflowId) return { workflow_id: workflowId }
  const repositoryId = asId(payload.repositoryId)
  if (repositoryId) return { repository_id: repositoryId }
  return {}
}

const readStringField = (
  record: Record<string, unknown>,
  ...keys: string[]
) => {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (value != null && typeof value !== 'object') {
      const text = String(value).trim()
      if (text && text.toLowerCase() !== 'null') return text
    }
  }
  return ''
}

export const suggestDashboardPrompt = async (
  payload: DashboardPromptRequest,
) => {
  const response: {
    data: DashboardPromptResult | null
    error: string
  } = {
    data: null,
    error: '',
  }

  const repositoryId = asId(payload.repositoryId)
  const workflowId = asId(payload.workflowId)
  const sessionId = asId(payload.sessionId)

  try {
    const { data, status } = await axiosV6({
      data: {
        ...(sessionId ? { session_id: sessionId } : {}),
        tenant_id: asId(payload.tenantId),
        ...buildDashboardSourceIds({
          repositoryId,
          workflowId,
        }),
      },
      headers: buildTenantHeaders(payload.tenantId),
      method: 'POST',
      skipCancellation: true,
      timeout: DASHBOARD_API_TIMEOUT_MS,
      url: `/dashboard/prompts`,
    })

    if (status !== 200 && status !== 201) {
      throw new Error('invalid status code')
    }

    const record = asRecord(data) || {}
    const prompt = readStringField(record, 'prompt', 'Prompt', 'message')
    if (!prompt) {
      throw new Error('Dashboard prompt response is missing prompt')
    }

    response.data = {
      correlation_id: readStringField(
        record,
        'correlation_id',
        'correlationId',
      ),
      latency_ms: Number(record.latency_ms ?? record.latencyMs ?? 0),
      prompt,
      repository_id: readStringField(record, 'repository_id', 'repositoryId'),
      repository_name: readStringField(
        record,
        'repository_name',
        'repositoryName',
      ),
      session_id: readStringField(record, 'session_id', 'sessionId'),
      table: readStringField(record, 'table'),
      tenant_id: readStringField(record, 'tenant_id', 'tenantId'),
      workflow_id: readStringField(record, 'workflow_id', 'workflowId'),
      workflow_name: readStringField(record, 'workflow_name', 'workflowName'),
    }
  } catch (error) {
    console.error(error)
    response.error = getV6ApiErrorMessage(
      getAxiosErrorData(error),
      'Error Suggesting Dashboard Prompt',
    )
  }

  return response
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
    const sessionId = asId(payload.sessionId)
    const { data, status } = await axiosV6({
      data: {
        message: payload.message,
        ...(sessionId ? { session_id: sessionId } : {}),
        tenant_id: asId(payload.tenantId),
        ...buildDashboardSourceIds({
          repositoryId: payload.repositoryId,
          workflowId: payload.workflowId,
        }),
      },
      headers: buildTenantHeaders(payload.tenantId),
      method: 'POST',
      skipCancellation: true,
      timeout: DASHBOARD_API_TIMEOUT_MS,
      url: `/dashboard/schema`,
    })

    if (status !== 200 && status !== 201) {
      throw new Error('invalid status code')
    }

    const record = asRecord(data) || {}
    const dashboardResult = parseDashboardResult(
      record.dashboard_result ?? record.dashboardResult,
    )

    if (!dashboardResult) {
      throw new Error('Dashboard schema response is missing dashboard_result')
    }

    response.data = {
      correlation_id: String(
        record.correlation_id ?? record.correlationId ?? '',
      ),
      dashboard_result: dashboardResult,
      html: null,
      latency_ms: Number(record.latency_ms ?? record.latencyMs ?? 0),
      reply: typeof record.reply === 'string' ? record.reply : undefined,
      sessionId: String(
        record.session_id ?? record.sessionId ?? payload.sessionId,
      ),
    }
  } catch (error) {
    console.error(error)
    response.error = getV6ApiErrorMessage(
      getAxiosErrorData(error),
      'Error Generating Dashboard Schema',
    )
  }

  return response
}

export const saveDashboardSchema = async (
  payload: SaveDashboardSchemaRequest,
) => {
  const response: {
    error: string
  } = {
    error: '',
  }

  const dashboardResult = payload.dashboard_result || payload.dashboard_json
  if (!dashboardResult) {
    response.error = 'dashboard_result is required'
    return response
  }

  try {
    const { status } = await axiosV6({
      data: {
        dashboard_json: dashboardResult,
        dashboard_result: dashboardResult,
        tenant_id: payload.tenantId,
        tenantId: payload.tenantId,
        ...buildDashboardSourceIds({
          repositoryId: payload.repositoryId,
          workflowId: payload.workflowId,
        }),
        // camelCase aliases only when the matching snake_case source id is set
        ...(asId(payload.workflowId)
          ? { workflowId: asId(payload.workflowId) }
          : asId(payload.repositoryId)
            ? { repositoryId: asId(payload.repositoryId) }
            : {}),
      },
      headers: buildTenantHeaders(payload.tenantId),
      method: 'POST',
      skipCancellation: true,
      timeout: DASHBOARD_API_TIMEOUT_MS,
      url: `/dashboard/schema/save`,
    })

    if (status !== 200 && status !== 201) {
      throw new Error('invalid status code')
    }
  } catch (error) {
    console.error(error)
    response.error = getV6ApiErrorMessage(
      getAxiosErrorData(error),
      'Error Saving Dashboard Schema',
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

  const repositoryId = asId(payload.repositoryId)
  const workflowId = asId(payload.workflowId)
  const sessionId = asId(payload.sessionId)
  const message = asId(payload.message)

  try {
    const { data, status } = await axiosV6({
      data: {
        ...(payload.dashboard_json
          ? { dashboard_json: payload.dashboard_json }
          : {}),
        ...(message ? { message } : {}),
        ...(sessionId ? { session_id: sessionId } : {}),
        tenant_id: asId(payload.tenantId),
        ...buildDashboardSourceIds({ repositoryId, workflowId }),
      },
      headers: buildTenantHeaders(payload.tenantId),
      method: 'POST',
      responseType: 'text',
      skipCancellation: true,
      timeout: DASHBOARD_API_TIMEOUT_MS,
      url: `/dashboard/data`,
    })

    if (status !== 200 && status !== 201) {
      throw new Error('invalid status code')
    }

    response.html = extractDashboardHtml(data)
  } catch (error) {
    console.error(error)
    response.error = getV6ApiErrorMessage(
      getAxiosErrorData(error),
      'Error Loading Dashboard Data',
    )
  }

  return response
}

export const getSavedDashboardSchema = async (
  payload: SavedDashboardLookup,
) => {
  const response: {
    data: SavedDashboardSnapshot | null
    error: string
    notFound: boolean
  } = {
    data: null,
    error: '',
    notFound: false,
  }

  try {
    const { data, status } = await axiosV6({
      headers: buildTenantHeaders(payload.tenantId),
      method: 'GET',
      params: {
        tenantId: payload.tenantId,
        ...(asId(payload.workflowId)
          ? { workflowId: asId(payload.workflowId) }
          : asId(payload.repositoryId)
            ? { repositoryId: asId(payload.repositoryId) }
            : {}),
      },
      skipCancellation: true,
      timeout: DASHBOARD_API_TIMEOUT_MS,
      url: `/dashboard/schema/saved`,
    })

    if (status === 404) {
      response.notFound = true
      return response
    }

    if (status !== 200 && status !== 201) {
      throw new Error('invalid status code')
    }

    let body: unknown = data
    if (typeof data === 'string') {
      try {
        body = JSON.parse(data)
      } catch {
        body = data
      }
    }

    const record = asRecord(body) || {}
    const nested =
      asRecord(record.value) ||
      asRecord(record.data) ||
      asRecord(record.result) ||
      record
    const schema = parseDashboardResult(
      nested.schemaJson ??
        nested.schema_json ??
        nested.dashboard_result ??
        nested.dashboardResult ??
        nested,
    )

    response.data = {
      dashboardHtml: extractDashboardHtml(body),
      repositoryId:
        readStringField(record, 'repositoryId', 'repository_id') ||
        asId(payload.repositoryId),
      schema,
      tenantId:
        readStringField(record, 'tenantId', 'tenant_id') || payload.tenantId,
      workflowId:
        readStringField(record, 'workflowId', 'workflow_id') ||
        asId(payload.workflowId),
    }
  } catch (error) {
    if (getAxiosStatus(error) === 404) {
      response.notFound = true
      return response
    }
    console.error(error)
    response.error = getV6ApiErrorMessage(
      getAxiosErrorData(error),
      'Error Loading Saved Dashboard Schema',
    )
  }

  return response
}

export const getSavedDashboardHtml = async (payload: SavedDashboardLookup) => {
  const response: {
    error: string
    html: string
    notFound: boolean
  } = {
    error: '',
    html: '',
    notFound: false,
  }

  const params = {
    raw: false,
    repositoryId: payload.repositoryId,
    tenantId: payload.tenantId,
    ...(payload.workflowId ? { workflowId: payload.workflowId } : {}),
  }

  try {
    const { data, status } = await axiosV6({
      headers: buildTenantHeaders(payload.tenantId),
      method: 'GET',
      params,
      skipCancellation: true,
      timeout: DASHBOARD_API_TIMEOUT_MS,
      url: `/dashboard/data/saved`,
    })

    if (status === 404) {
      response.notFound = true
      return response
    }

    if (status !== 200 && status !== 201) {
      throw new Error('invalid status code')
    }

    let parsedData: unknown = data
    if (typeof data === 'string') {
      try {
        parsedData = JSON.parse(data)
      } catch {
        parsedData = data
      }
    }

    const record = asRecord(parsedData)
    response.html =
      (record ? readHtmlField(record) : '') || extractDashboardHtml(parsedData)
  } catch (error) {
    if (getAxiosStatus(error) === 404) {
      response.notFound = true
      return response
    }
    console.error(error)
    response.error = getV6ApiErrorMessage(
      getAxiosErrorData(error),
      'Error Loading Saved Dashboard',
    )
  }

  return response
}

export const loadSavedRepositoryDashboard = async (
  payload: SavedDashboardLookup,
) => {
  const response: {
    error: string
    html: string
    schema: DashboardSchemaResult | null
  } = {
    error: '',
    html: '',
    schema: null,
  }

  const savedSchema = await getSavedDashboardSchema(payload)
  if (savedSchema.error && !savedSchema.notFound) {
    response.error = savedSchema.error
    return response
  }

  const schema = savedSchema.data?.schema || null
  response.schema = schema
  if (!schema) {
    return response
  }

  const workflowId = asId(payload.workflowId || schema.workflow_id)
  const repositoryId = workflowId
    ? ''
    : asId(payload.repositoryId || schema.repository_id || schema.repositoryId)

  const dataRes = await getDashboardHtml({
    dashboard_json: schema,
    repositoryId: repositoryId || undefined,
    tenantId: payload.tenantId,
    workflowId: workflowId || undefined,
  })
  response.html = dataRes.html
  if (!response.html) {
    response.error = dataRes.error
  }

  return response
}

export type DashboardShare = {
  action: number
  email: string
  sharedAt?: string
  shareId: string
}

export type ShareDashboardRequest = {
  action: number
  email: string
  message?: string
  repositoryId?: string
  tenantId?: string
  workflowId?: string
}

const readDashboardShare = (value: unknown): DashboardShare | null => {
  const record = asRecord(value)
  if (!record) return null
  const shareId = readStringField(record, 'shareId', 'share_id', 'id')
  const email = readStringField(record, 'email', 'Email')
  if (!shareId || !email) return null
  return {
    action: Number(record.action ?? 0),
    email,
    sharedAt: readStringField(record, 'sharedAt', 'shared_at') || undefined,
    shareId,
  }
}

/** Share the currently saved dashboard for a repository/workflow with an email. */
export const shareDashboard = async (payload: ShareDashboardRequest) => {
  const response: { data: DashboardShare | null; error: string } = {
    data: null,
    error: '',
  }

  try {
    const { data, status } = await axiosV6({
      data: {
        action: payload.action,
        email: payload.email,
        message: payload.message || '',
        tenant_id: asId(payload.tenantId),
        ...buildDashboardSourceIds({
          repositoryId: payload.repositoryId,
          workflowId: payload.workflowId,
        }),
      },
      headers: buildTenantHeaders(payload.tenantId),
      method: 'POST',
      url: `/dashboard/share`,
    })

    if (status !== 200 && status !== 201) {
      throw new Error('invalid status code')
    }

    response.data = readDashboardShare(asRecord(data)?.value ?? data)
  } catch (error) {
    console.error(error)
    response.error = getV6ApiErrorMessage(
      getAxiosErrorData(error),
      'Error Sharing Dashboard',
    )
  }

  return response
}

/** People a dashboard was shared with (sharer-side list). */
export const getDashboardShares = async (payload: SavedDashboardLookup) => {
  const response: { data: DashboardShare[]; error: string } = {
    data: [],
    error: '',
  }

  try {
    const { data, status } = await axiosV6({
      headers: buildTenantHeaders(payload.tenantId),
      method: 'GET',
      params: {
        tenantId: asId(payload.tenantId),
        ...(asId(payload.workflowId)
          ? { workflowId: asId(payload.workflowId) }
          : asId(payload.repositoryId)
            ? { repositoryId: asId(payload.repositoryId) }
            : {}),
      },
      url: `/dashboard/shares`,
    })

    if (status !== 200) throw new Error('invalid status code')

    const record = asRecord(data)
    const list = Array.isArray(data)
      ? data
      : Array.isArray(record?.items)
        ? record?.items
        : Array.isArray(record?.value)
          ? record?.value
          : []
    response.data = (list || [])
      .map(readDashboardShare)
      .filter((item): item is DashboardShare => Boolean(item))
  } catch (error) {
    console.error(error)
    response.error = getV6ApiErrorMessage(
      getAxiosErrorData(error),
      'Error Loading Dashboard Shares',
    )
  }

  return response
}

export const revokeDashboardShare = async (payload: {
  shareId: string
  tenantId?: string
}) => {
  const response: { data: boolean; error: string } = {
    data: false,
    error: '',
  }

  try {
    const { status } = await axiosV6({
      headers: buildTenantHeaders(payload.tenantId),
      method: 'DELETE',
      url: `/dashboard/share/${payload.shareId}`,
    })

    if (status !== 200 && status !== 204) {
      throw new Error('invalid status code')
    }
    response.data = true
  } catch (error) {
    console.error(error)
    response.error = getV6ApiErrorMessage(
      getAxiosErrorData(error),
      'Error Revoking Dashboard Share',
    )
  }

  return response
}

export const dashboardApiV6 = {
  loadSavedRepositoryDashboard,
  revokeDashboardShare,
  saveDashboardSchema,
  shareDashboard,
  suggestDashboardPrompt,
  getDashboardData,
  getDashboardHtml,
  getDashboardSchema,
  getDashboardShares,
  getSavedDashboardHtml,
  getSavedDashboardSchema,
}

export default dashboardApiV6
