import type { FormulaToken } from '@/pages/form-builder/helpers/formula'
import type { Question } from '@/pages/form-builder/store/formStore'

export interface DomainField {
  id: string
  label: string
  type: ReportFieldType
}

export type ReportAgentType =
  | 'all_workflows'
  | 'specific_workflow'
  | 'all_repositories'
  | 'specific_repository'

/**
 * An AI (report agent) report as saved by /report-ai-builder: its saved id
 * plus the agent's JSON `reportPrompt` string and the edited `reportSpec`,
 * sent back on run/PATCH exactly as the agent expects them.
 */
export interface ReportAgentConfig {
  /** Saved /report-ai-builder report id, returned by generate. */
  id: string
  reportPrompt: string
  reportSpec: Record<string, unknown>
  reportType: ReportAgentType
  sessionId: string
  repositoryName?: string | null
  workflowName?: string | null
}

export interface Report {
  createdAt: string
  customFields: Question[]
  description: string
  domain: string
  fields: string[]
  fieldSettings: Record<string, ReportFieldSetting>
  filters: ReportFilter[]
  id: string
  modified: string
  name: string
  owner: string
  runs: number
  schedule: ReportSchedule
  scheduled: boolean
  sharedGroups: string[]
  sharedUsers: string[]
  sourceType: ReportSourceType
  status: ReportStatus
  visibility: ReportVisibility
  /** Full agent config; present once a saved AI report is loaded by id. */
  agentConfig?: ReportAgentConfig | null
  /** Lives in /report-ai-builder rather than /report-builder. */
  isAiReport?: boolean
  sourceFormId?: string
  sourceId?: string
}

export type ReportCalc = 'None' | 'Sum' | 'Average' | 'Count' | 'Min' | 'Max'

export type ReportColumnType = 'value' | 'status'

export interface ReportExecution {
  durationMs: number
  format: ReportScheduleFormat
  id: string
  rowCount: number
  runAt: string
  status: 'Success' | 'Failed'
  triggeredBy: string
}

export interface ReportFieldSetting {
  calc: ReportCalc
  colType: ReportColumnType
  label: string
  width: number
  formulaTokens?: FormulaToken[]
  isCalculated?: boolean
  statusBase?: string
  statusDefault?: string
  statusRules?: ReportStatusRule[]
}

export type ReportFieldType = 'Text' | 'Number' | 'Choice' | 'User' | 'Date'

export interface ReportFilter {
  field: string
  id: string
  operator: ReportFilterOperator
  value: string
}

export type ReportFilterOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'greaterThan'
  | 'lessThan'
  | 'between'
  | 'isEmpty'
  | 'isNotEmpty'

export interface ReportSchedule {
  cc: string[]
  day: string
  format: ReportScheduleFormat
  message: string
  recipients: string[]
  recurrence: ReportScheduleRecurrence
  subject: string
  time: string
  timezone: string
}

export type ReportScheduleFormat = 'PDF' | 'Excel' | 'CSV'

export type ReportScheduleRecurrence = 'Daily' | 'Weekly' | 'Monthly'

export type ReportSourceType = 'Workflow' | 'Folder' | 'Master' | ''

export type ReportStatus = 'Draft' | 'Published'

export type ReportHighlightOperator =
  | 'eq'
  | 'neq'
  | 'contains'
  | 'notContains'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between'
  | 'empty'
  | 'notEmpty'

export interface ReportStatusRule {
  color: string
  id: string
  label: string
  /** Value to compare against (lower bound for `between`). */
  match: string
  /** Compare against another column's value in the same row instead of `match`. */
  compareField?: string
  /** Defaults to `eq` — rules saved before operators existed have none. */
  operator?: ReportHighlightOperator
  /** Upper bound for `between`. */
  value2?: string
}

export type ReportVisibility =
  | 'Private'
  | 'Public'
  | 'Selected Users'
  | 'Selected Groups'

export const DEFAULT_SCHEDULE: ReportSchedule = {
  cc: [],
  day: 'Monday',
  format: 'PDF',
  message: '',
  recipients: [],
  recurrence: 'Weekly',
  subject: '',
  time: '09:00',
  timezone: 'UTC',
}

export const createDefaultFieldSetting = (
  label: string,
): ReportFieldSetting => ({
  calc: 'None',
  colType: 'value',
  label,
  width: 160,
})
