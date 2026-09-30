import { t } from '@lingui/macro'

export interface MockDocument {
  documentType: string
  effectiveDate: string
  expiryDate: string
  id: string
  lastActivityDate: string
  name: string
  owner: string
  status: string
}

export type RetentionAction = 'archive' | 'soft_delete' | 'permanent_delete'

export interface RetentionCondition {
  field: string
  op: string
  value: string
}

export type RetentionDurationUnit = 'days' | 'months' | 'years'

export interface RetentionField {
  key: string
  label: string
  type: RetentionFieldType
  options?: string[]
}

export type RetentionFieldType = 'select' | 'text' | 'date'

export type RetentionMatchType = 'all' | 'any'

export interface RetentionPolicy {
  action: RetentionAction | ''
  aiGenerated: boolean
  conditions: RetentionCondition[]
  createdOn: string
  description: string
  durationUnit: RetentionDurationUnit
  durationValue: number
  id: string
  matchType: RetentionMatchType
  name: string
  notifyOwner: boolean
  requireConfirm: boolean
  triggerField: string
}

export const RETENTION_FIELDS: RetentionField[] = [
  {
    key: 'status',
    label: t`Status`,
    options: ['Draft', 'Active', 'Expired', 'Terminated'],
    type: 'select',
  },
  { key: 'effectiveDate', label: t`Effective Date`, type: 'date' },
  { key: 'expiryDate', label: t`Expiry / Due Date`, type: 'date' },
  { key: 'lastActivityDate', label: t`Last Activity Date`, type: 'date' },
  { key: 'owner', label: t`Owner`, type: 'text' },
  { key: 'documentType', label: t`Document Type`, type: 'text' },
]

export const DATE_FIELD_KEYS = [
  'effectiveDate',
  'expiryDate',
  'lastActivityDate',
]

export const DURATION_UNIT_OPTIONS = [
  { id: 'days', name: t`days` },
  { id: 'months', name: t`months` },
  { id: 'years', name: t`years` },
]

export const ACTION_OPTIONS: {
  color: 'amber' | 'primary' | 'red'
  description: string
  icon: string
  id: RetentionAction
  name: string
}[] = [
  {
    color: 'primary',
    description: t`Move matched documents out of active storage into the archive.`,
    icon: 'tabler:archive',
    id: 'archive',
    name: t`Archive`,
  },
  {
    color: 'amber',
    description: t`Hide matched documents and hold them for recovery for a grace period.`,
    icon: 'tabler:trash-x',
    id: 'soft_delete',
    name: t`Soft Delete`,
  },
  {
    color: 'red',
    description: t`Permanently remove matched documents. This cannot be undone.`,
    icon: 'tabler:trash',
    id: 'permanent_delete',
    name: t`Permanent Delete`,
  },
]

export const OPERATOR_OPTIONS = [
  { id: 'equals', name: t`Equals` },
  { id: 'not_equals', name: t`Is Not` },
  { id: 'contains', name: t`Contains` },
  { id: 'greater_than', name: t`Greater Than` },
  { id: 'less_than', name: t`Less Than` },
]

const SUGGESTED_TRIGGER_BY_ACTION: Record<
  RetentionAction,
  {
    durationUnit: RetentionDurationUnit
    durationValue: number
    triggerField: string
  }
> = {
  archive: {
    durationUnit: 'days',
    durationValue: 180,
    triggerField: 'lastActivityDate',
  },
  permanent_delete: {
    durationUnit: 'days',
    durationValue: 365,
    triggerField: 'expiryDate',
  },
  soft_delete: {
    durationUnit: 'days',
    durationValue: 90,
    triggerField: 'expiryDate',
  },
}

export const suggestTriggerForAction = (action: RetentionAction) =>
  SUGGESTED_TRIGGER_BY_ACTION[action]

export const fieldLabel = (key: string) =>
  RETENTION_FIELDS.find((f) => f.key === key)?.label || key

export const opLabel = (op: string) =>
  OPERATOR_OPTIONS.find((o) => o.id === op)?.name || t`Equals`

export const actionMeta = (action: RetentionAction | '') =>
  ACTION_OPTIONS.find((a) => a.id === action) || ACTION_OPTIONS[0]

const MOCK_FILE_TEMPLATES: Array<{
  daysAgo: number | null
  documentType: string
  owner: string
  status: string
}> = [
  {
    daysAgo: 640,
    documentType: 'Agreement',
    owner: 'A. Chen',
    status: 'Expired',
  },
  {
    daysAgo: 40,
    documentType: 'Agreement',
    owner: 'L. Novak',
    status: 'Active',
  },
  {
    daysAgo: 210,
    documentType: 'Certificate',
    owner: 'M. Okafor',
    status: 'Expired',
  },
  { daysAgo: null, documentType: 'Draft', owner: 'R. Singh', status: 'Draft' },
  {
    daysAgo: 920,
    documentType: 'Agreement',
    owner: 'J. Fontaine',
    status: 'Terminated',
  },
  {
    daysAgo: 15,
    documentType: 'Certificate',
    owner: 'A. Chen',
    status: 'Active',
  },
  {
    daysAgo: 400,
    documentType: 'Agreement',
    owner: 'L. Novak',
    status: 'Expired',
  },
  { daysAgo: null, documentType: 'Draft', owner: 'M. Okafor', status: 'Draft' },
  {
    daysAgo: 95,
    documentType: 'Certificate',
    owner: 'R. Singh',
    status: 'Active',
  },
  {
    daysAgo: 760,
    documentType: 'Agreement',
    owner: 'J. Fontaine',
    status: 'Terminated',
  },
]

const isoDaysAgo = (days: number | null): string => {
  if (days === null) return ''
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

export const buildMockDocuments = (folderName: string): MockDocument[] => {
  const label = folderName || 'Folder'
  return MOCK_FILE_TEMPLATES.map((tmpl, idx) => ({
    documentType: tmpl.documentType,
    effectiveDate: isoDaysAgo(tmpl.daysAgo),
    expiryDate: isoDaysAgo(
      tmpl.daysAgo === null ? null : Math.max(0, tmpl.daysAgo - 30),
    ),
    id: `${label}-${idx}`,
    lastActivityDate: isoDaysAgo(
      tmpl.daysAgo === null ? null : Math.round(tmpl.daysAgo / 2),
    ),
    name: `${label} Record — ${String(idx + 1).padStart(3, '0')}`,
    owner: tmpl.owner,
    status: tmpl.status,
  }))
}

export const daysSince = (iso: string): number | null => {
  if (!iso) return null
  const diff = Date.now() - new Date(iso).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export const thresholdDays = (
  policy: Pick<RetentionPolicy, 'durationUnit' | 'durationValue'>,
): number => {
  if (policy.durationUnit === 'days') return policy.durationValue
  if (policy.durationUnit === 'months') return policy.durationValue * 30
  return policy.durationValue * 365
}

const conditionMatches = (
  doc: MockDocument,
  cond: RetentionCondition,
): boolean => {
  const val = (doc as unknown as Record<string, string>)[cond.field]
  if (cond.op === 'not_equals')
    return String(val || '') !== String(cond.value || '')
  if (cond.op === 'contains')
    return String(val || '')
      .toLowerCase()
      .includes(String(cond.value || '').toLowerCase())
  if (cond.op === 'greater_than')
    return parseFloat(val) > parseFloat(cond.value)
  if (cond.op === 'less_than') return parseFloat(val) < parseFloat(cond.value)
  return String(val || '') === String(cond.value || '')
}

export const matchesPolicy = (
  doc: MockDocument,
  policy: Pick<
    RetentionPolicy,
    | 'conditions'
    | 'durationUnit'
    | 'durationValue'
    | 'matchType'
    | 'triggerField'
  >,
): boolean => {
  const raw = (doc as unknown as Record<string, string>)[policy.triggerField]
  if (!raw) return false
  const days = daysSince(raw)
  if (days === null || days < thresholdDays(policy)) return false

  const conditions = policy.conditions.filter((c) => c.field)
  if (conditions.length === 0) return true

  return policy.matchType === 'any'
    ? conditions.some((c) => conditionMatches(doc, c))
    : conditions.every((c) => conditionMatches(doc, c))
}

export const reasonText = (
  doc: MockDocument,
  policy: Pick<
    RetentionPolicy,
    'durationUnit' | 'durationValue' | 'triggerField'
  >,
): string => {
  const days = daysSince(
    (doc as unknown as Record<string, string>)[policy.triggerField],
  )
  return t`${fieldLabel(policy.triggerField)} was ${days ?? 0} days ago — past the ${thresholdDays(policy)}-day threshold`
}

export const buildSummarySentence = (
  folderName: string,
  policy: Pick<
    RetentionPolicy,
    | 'action'
    | 'conditions'
    | 'durationUnit'
    | 'durationValue'
    | 'matchType'
    | 'notifyOwner'
    | 'requireConfirm'
    | 'triggerField'
  >,
): string => {
  const joinWord = policy.matchType === 'any' ? t`or` : t`and`
  const condTexts = policy.conditions
    .filter((c) => c.field)
    .map(
      (c) =>
        `${fieldLabel(c.field)} ${opLabel(c.op).toLowerCase()} "${c.value}"`,
    )

  let s = t`Documents in "${folderName}" will move to ${actionMeta(policy.action).name.toLowerCase()} once ${fieldLabel(policy.triggerField)} is more than ${policy.durationValue} ${policy.durationUnit} old`
  if (condTexts.length) s += t`, and ${condTexts.join(` ${joinWord} `)}`
  s += '.'
  if (policy.requireConfirm)
    s += ` ${t`Each batch needs manual confirmation before it runs.`}`
  if (policy.notifyOwner) s += ` ${t`Document owners are notified beforehand.`}`
  return s
}

export const emptyCondition = (field: string): RetentionCondition => ({
  field,
  op: 'equals',
  value: '',
})

export const buildDefaultPolicy = (triggerField = ''): RetentionPolicy => ({
  action: '',
  aiGenerated: false,
  conditions: [],
  createdOn: new Date().toISOString(),
  description: '',
  durationUnit: 'days',
  durationValue: 180,
  id: `policy-${Date.now()}`,
  matchType: 'all',
  name: '',
  notifyOwner: false,
  requireConfirm: true,
  triggerField,
})

export const seedPolicies = (folderName: string): RetentionPolicy[] => {
  const label = folderName || 'Folder'
  const created = new Date()
  created.setDate(created.getDate() - 12)
  return [
    {
      action: 'archive',
      aiGenerated: false,
      conditions: [{ field: 'status', op: 'equals', value: 'Expired' }],
      createdOn: created.toISOString(),
      description: `Move ${label.toLowerCase()} records to the archive once they are marked Expired and past the retention window.`,
      durationUnit: 'days',
      durationValue: 180,
      id: 'seed-1',
      matchType: 'all',
      name: `${label} Expired Records Retention`,
      notifyOwner: false,
      requireConfirm: true,
      triggerField: 'effectiveDate',
    },
  ]
}
