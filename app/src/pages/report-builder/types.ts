import type { FormulaToken } from '@/pages/form-builder/helpers/formula'
import type { Question } from '@/pages/form-builder/store/formStore'

export interface DomainField {
  id: string
  label: string
  type: ReportFieldType
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
  sourceFormId: string
  sourceType: 'Master' | 'Workflow' | ''
  status: ReportStatus
  visibility: ReportVisibility
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

export type ReportStatus = 'Draft' | 'Published'

export interface ReportStatusRule {
  color: string
  id: string
  label: string
  match: string
}

export type ReportVisibility = 'Private' | 'Selected Users' | 'Selected Groups'

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
