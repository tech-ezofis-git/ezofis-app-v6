import type {
  ReportAgentPromptResult,
  ReportAgentRunResult,
  ReportAiListItem,
  ReportAiRecord,
  ReportSpec,
  ReportSpecColumn,
  ReportSpecFilter,
  ReportSpecHighlight,
} from '@/api/v6/reportAgent'
import type { ReportRunResult } from '@/api/v6/reportBuilder'
import { createReportAgentSessionId } from '@/api/v6/reportAgent'
import type {
  Report,
  ReportAgentConfig,
  ReportAgentType,
  ReportFieldSetting,
  ReportFilter,
  ReportFilterOperator,
  ReportStatus,
} from '../types'
import { DEFAULT_SCHEDULE } from '../types'
import { reportSpecColumnToFieldSetting } from './fromReportSpec'

/** Sentinel source ids for the agent's tenant-wide scopes. */
export const ALL_WORKFLOWS_SOURCE_ID = '__all_workflows__'
export const ALL_FOLDERS_SOURCE_ID = '__all_folders__'

export const isAllScopeSource = (sourceId: string | undefined) =>
  sourceId === ALL_WORKFLOWS_SOURCE_ID || sourceId === ALL_FOLDERS_SOURCE_ID

/** Agent scope for the wizard's source selection. */
export const agentScopeForSource = (
  sourceType: string,
  sourceId: string,
  domain: string,
): Pick<
  ReportAgentConfig,
  'repositoryName' | 'reportType' | 'workflowName'
> => {
  if (sourceType === 'Folder') {
    return sourceId === ALL_FOLDERS_SOURCE_ID
      ? {
          repositoryName: null,
          reportType: 'all_repositories',
          workflowName: null,
        }
      : {
          repositoryName: domain,
          reportType: 'specific_repository',
          workflowName: null,
        }
  }
  return sourceId === ALL_WORKFLOWS_SOURCE_ID
    ? { repositoryName: null, reportType: 'all_workflows', workflowName: null }
    : {
        repositoryName: null,
        reportType: 'specific_workflow',
        workflowName: domain,
      }
}

const humanize = (key: string) =>
  key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase())

/**
 * Every column the agent offered — the selected `columns` first, then the
 * three palettes, then bare `availableColumns` keys — de-duplicated by key.
 */
export const agentColumnCatalog = (spec: ReportSpec): ReportSpecColumn[] => {
  const byKey = new Map<string, ReportSpecColumn>()
  const add = (column: ReportSpecColumn) => {
    if (!column?.key) return
    const existing = byKey.get(column.key)
    byKey.set(column.key, existing ? { ...column, ...existing } : column)
  }
  ;(spec.columns ?? []).forEach(add)
  ;(spec.userdefinedColumns ?? []).forEach(add)
  ;(spec.defaultColumns ?? []).forEach(add)
  ;(spec.agentColumns ?? []).forEach(add)
  ;(spec.availableColumns ?? []).forEach((key) =>
    add({ key, kind: 'userdefined', label: humanize(key) }),
  )
  return [...byKey.values()]
}

const SPEC_TO_FILTER_OP: Record<string, ReportFilterOperator> = {
  '!=': 'notEquals',
  '<': 'lessThan',
  '=': 'equals',
  '>': 'greaterThan',
  'between': 'between',
  'contains': 'contains',
  'eq': 'equals',
  'gt': 'greaterThan',
  'is_null': 'isEmpty',
  'lt': 'lessThan',
  'neq': 'notEquals',
  'not_null': 'isNotEmpty',
}

const FILTER_TO_SPEC_OP: Record<ReportFilterOperator, string> = {
  between: 'between',
  contains: 'contains',
  equals: 'eq',
  greaterThan: 'gt',
  isEmpty: 'is_null',
  isNotEmpty: 'not_null',
  lessThan: 'lt',
  notEquals: 'neq',
}

const AGENT_FILTER_ID_PREFIX = 'agent-'

const specFilterToDraft = (
  filter: ReportSpecFilter,
  index: number,
): ReportFilter => ({
  field: filter.field,
  id: `${AGENT_FILTER_ID_PREFIX}${index}`,
  operator: SPEC_TO_FILTER_OP[String(filter.op).toLowerCase()] ?? 'equals',
  value:
    filter.value === null || filter.value === undefined
      ? ''
      : String(filter.value),
})

/**
 * Draft filter → spec filter. An agent-provided filter the user didn't touch
 * keeps its original value so typed values (e.g. `false`) survive the round
 * trip, but its op is normalized: generate emits `=` while run only accepts
 * `eq` and drops the filter otherwise.
 */
const draftFilterToSpec = (
  filter: ReportFilter,
  originals: ReportSpecFilter[],
): ReportSpecFilter => {
  if (filter.id.startsWith(AGENT_FILTER_ID_PREFIX)) {
    const original =
      originals[Number(filter.id.slice(AGENT_FILTER_ID_PREFIX.length))]
    if (
      original &&
      specFilterToDraft(original, 0).value === filter.value &&
      original.field === filter.field &&
      SPEC_TO_FILTER_OP[String(original.op).toLowerCase()] === filter.operator
    ) {
      return {
        ...original,
        op: FILTER_TO_SPEC_OP[filter.operator] ?? original.op,
      }
    }
  }
  const op = FILTER_TO_SPEC_OP[filter.operator] ?? 'eq'
  return {
    editable: true,
    field: filter.field,
    op,
    value: op === 'is_null' || op === 'not_null' ? null : filter.value,
  }
}

/** Status-column rules → the agent's `highlight` shape (inverse of fromReportSpec). */
const fieldSettingToHighlight = (
  key: string,
  setting: ReportFieldSetting | undefined,
): ReportSpecHighlight | null => {
  if (
    !setting ||
    setting.colType !== 'status' ||
    setting.statusBase !== key ||
    !setting.statusRules?.length
  ) {
    return null
  }
  return {
    default: setting.statusDefault || null,
    rules: setting.statusRules.map((rule) => ({
      color: rule.color,
      compareField: rule.compareField || null,
      label: rule.label || null,
      op: rule.operator ?? 'eq',
      value: rule.match,
      value2: rule.value2 || null,
    })),
  }
}

/** Wizard draft state after a successful generate-prompt call. */
export const draftPatchFromPromptResult = (
  result: ReportAgentPromptResult,
  scope: Pick<
    ReportAgentConfig,
    'repositoryName' | 'reportType' | 'sessionId' | 'workflowName'
  >,
) => {
  const spec = result.reportSpec
  const selected = (spec.columns ?? []).filter((c) => c.selected !== false)
  const fieldSettings: Record<string, ReportFieldSetting> = Object.fromEntries(
    selected.map((column) => [
      column.key,
      reportSpecColumnToFieldSetting(column),
    ]),
  )

  return {
    agent: {
      ...scope,
      id: result.id,
      reportPrompt: result.reportPrompt,
      reportSpec: spec as unknown as Record<string, unknown>,
    } satisfies ReportAgentConfig,
    description: spec.objective || '',
    fields: selected.map((c) => c.key),
    fieldSettings,
    filters: (spec.filters ?? []).map(specFilterToDraft),
    name: spec.title || result.title || '',
  }
}

const PROMPT_PALETTES = [
  'Userdefined Columns',
  'Default columns',
  'Agent generated columns',
] as const

/** Mirrors the selected columns into the JSON reportPrompt's palettes. */
const syncReportPrompt = (reportPrompt: string, fields: string[]) => {
  try {
    const prompt = JSON.parse(reportPrompt) as Record<string, unknown>
    PROMPT_PALETTES.forEach((palette) => {
      const list = prompt[palette]
      if (!Array.isArray(list)) return
      prompt[palette] = list.map((column: Record<string, unknown>) => ({
        ...column,
        selected: fields.includes(String(column.key)),
      }))
    })
    if (Array.isArray(prompt.columns)) prompt.columns = fields
    return JSON.stringify(prompt, null, 2)
  } catch {
    return reportPrompt
  }
}

/**
 * The agent config to send on Run / save, rebuilt from the wizard draft so
 * column, label, filter and highlight edits made in the steps reach the agent.
 */
export const buildAgentConfigFromDraft = (
  agent: ReportAgentConfig,
  draft: {
    description: string
    fields: string[]
    fieldSettings: Record<string, ReportFieldSetting>
    filters: ReportFilter[]
    name: string
  },
): ReportAgentConfig => {
  const spec = agent.reportSpec as unknown as ReportSpec
  const catalog = new Map(agentColumnCatalog(spec).map((c) => [c.key, c]))
  const fieldSet = new Set(draft.fields)
  const markSelected = (list?: ReportSpecColumn[]) =>
    list?.map((c) => ({ ...c, selected: fieldSet.has(c.key) }))

  const columns: ReportSpecColumn[] = draft.fields.map((key) => {
    const base = catalog.get(key) ?? { key, label: key }
    const setting = draft.fieldSettings[key]
    return {
      editable: true,
      formula: base.formula ?? null,
      kind: base.kind,
      ...base,
      highlight: fieldSettingToHighlight(key, setting),
      label: setting?.label || base.label || key,
      selected: true,
    }
  })

  const nextSpec: ReportSpec = {
    ...spec,
    agentColumns: markSelected(spec.agentColumns),
    columns,
    defaultColumns: markSelected(spec.defaultColumns),
    filters: draft.filters
      .filter((f) => f.field)
      .map((f) => draftFilterToSpec(f, spec.filters ?? [])),
    objective: draft.description || spec.objective,
    title: draft.name || spec.title,
    userdefinedColumns: markSelected(spec.userdefinedColumns),
  }

  return {
    ...agent,
    reportPrompt: syncReportPrompt(agent.reportPrompt, draft.fields),
    reportSpec: nextSpec as unknown as Record<string, unknown>,
  }
}

const toCellText = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

/**
 * Agent run result → the report-builder `ReportRunResult` the report table
 * already renders. Rows are keyed by both column key and label, since the
 * existing table reads values by label.
 */
export const agentRunToReportRunResult = (
  result: ReportAgentRunResult,
  meta: { domain: string; name: string; reportId: string | null },
): ReportRunResult => {
  const columns = result.columns.map((column) => ({
    calc: 'None',
    colType: 'value',
    isCalculated: Boolean(column.formula),
    key: column.key,
    label: column.label || column.key,
    width: 160,
  }))
  const rows = result.rows.map((row) => {
    const mapped: Record<string, string> = {}
    columns.forEach((column) => {
      const text = toCellText(row[column.key] ?? row[column.label])
      mapped[column.key] = text
      mapped[column.label] = text
    })
    return mapped
  })
  return {
    columns,
    domain: meta.domain,
    name: result.title || meta.name,
    reportId: meta.reportId,
    rowCount: result.totalCount ?? rows.length,
    rows,
    totals: null,
  }
}

/** Highlights the run response itself carries (if the agent sends them there). */
export const runResultFieldSettings = (
  result: ReportAgentRunResult,
): Record<string, ReportFieldSetting> =>
  Object.fromEntries(
    result.columns
      .filter((column) => column.highlight?.rules?.length)
      .map((column) => [column.key, reportSpecColumnToFieldSetting(column)]),
  )

const AGENT_TYPE_SOURCE: Record<ReportAgentType, 'Folder' | 'Workflow'> = {
  all_repositories: 'Folder',
  all_workflows: 'Workflow',
  specific_repository: 'Folder',
  specific_workflow: 'Workflow',
}

const AGENT_TYPE_DOMAIN: Record<ReportAgentType, string> = {
  all_repositories: 'All folders',
  all_workflows: 'All workflows',
  specific_repository: 'Folder',
  specific_workflow: 'Workflow',
}

const toReportStatus = (status: string | null | undefined): ReportStatus =>
  status === 'Published' ? 'Published' : 'Draft'

/** A /report-ai-builder list row as a (summary) `Report` for the reports list. */
export const aiListItemToReport = (item: ReportAiListItem): Report => ({
  createdAt: item.createdAtUtc,
  customFields: [],
  description: item.description || '',
  domain: AGENT_TYPE_DOMAIN[item.reportType] ?? 'AI report',
  fields: [],
  fieldSettings: {},
  filters: [],
  id: item.id,
  isAiReport: true,
  modified: item.modifiedAtUtc,
  name: item.name,
  owner: 'You',
  runs: item.runs ?? 0,
  schedule: DEFAULT_SCHEDULE,
  scheduled: false,
  sharedGroups: [],
  sharedUsers: [],
  sourceType: AGENT_TYPE_SOURCE[item.reportType] ?? 'Workflow',
  status: toReportStatus(item.status),
  visibility: 'Private',
})

/**
 * A full saved AI report (GET /report-ai-builder/{id}) as a `Report` whose
 * fields/fieldSettings/filters come from its spec, ready for the wizard draft
 * and the report page.
 */
export const aiRecordToReport = (record: ReportAiRecord): Report => {
  const scope = {
    repositoryName: record.repositoryName,
    reportType: record.reportType,
    sessionId: record.sessionId || createReportAgentSessionId(),
    workflowName: record.workflowName,
  }
  const patch = draftPatchFromPromptResult(
    {
      id: record.id,
      reportPrompt: record.reportPrompt,
      reportSpec: record.reportSpec,
      reportType: record.reportType,
      title: record.title,
    },
    scope,
  )
  const isAllScope =
    record.reportType === 'all_workflows' ||
    record.reportType === 'all_repositories'
  const specificName = record.workflowName || record.repositoryName || ''

  return {
    ...aiListItemToReport(record),
    agentConfig: patch.agent,
    domain: isAllScope
      ? AGENT_TYPE_DOMAIN[record.reportType]
      : specificName || AGENT_TYPE_DOMAIN[record.reportType],
    fields: patch.fields,
    fieldSettings: patch.fieldSettings,
    filters: patch.filters,
    name: record.name || patch.name,
    // The wizard only shows a selected source; the agent identifies a
    // specific workflow/folder by name, so the name doubles as the id here.
    sourceId: isAllScope
      ? record.reportType === 'all_repositories'
        ? ALL_FOLDERS_SOURCE_ID
        : ALL_WORKFLOWS_SOURCE_ID
      : specificName,
  }
}
