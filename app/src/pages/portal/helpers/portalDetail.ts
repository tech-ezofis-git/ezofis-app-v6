import {
  isFieldFilled,
  isFieldHidden,
  isFieldRequired,
} from '@/pages/requests/components/workflow-request/utils/fieldRendering'
import { extractWorkflowGraph } from '@/pages/requests/utils/workflow.utils'
import type { FormPanel } from './portalForm'
import {
  parseSubmissionFormData,
  type PortalSubmission,
  type PortalSubmissionStatus,
} from './portalSubmissions'

const SKIP_BLOCK_TYPES = new Set([
  'ANNOTATION',
  'COMMENT',
  'CONDITION',
  'GROUP',
  'NOTE',
])

const DEFAULT_STEP_LABELS: Record<string, string> = {
  ACTION: 'Action Required',
  AP_AGENT: 'In Review',
  APPROVAL: 'Approved',
  END: 'Completed',
  EXTERNAL_ACTOR: 'Action Required',
  INTERNAL_ACTOR: 'In Review',
  START: 'Submitted',
}

export type PortalStepStatus = 'completed' | 'current' | 'pending'

export type PortalWaitingKind = 'agent' | 'default' | 'payment' | 'trigger' | 'user'

export type PortalWorkflowStep = {
  id: string
  title: string
  type: string
  assignedEmails?: string[]
  assignedUserIds?: string[]
  subLabel?: string
  toolType?: string
}

const textOf = (value: unknown) => {
  if (value == null || value === '') return ''
  return String(value).trim()
}

export const submissionInstanceIds = (submission: PortalSubmission) => {
  const raw = submission.raw
  const instanceId = textOf(
    raw.workflowInstanceId || raw.processId || raw.instanceId || submission.id,
  )
  const processId = textOf(raw.processId) || instanceId
  const activityId = pickActivityId(raw)
  const repositoryId =
    textOf(raw.repositoryId) || textOf(raw.repositoryid) || undefined

  return { activityId, instanceId, processId, repositoryId }
}

const pickScalar = (raw: Record<string, unknown>, keys: string[]) => {
  const wanted = new Set(keys.map((key) => key.toLowerCase().replace(/[^a-z0-9]/g, '')))
  for (const [key, value] of Object.entries(raw)) {
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (!wanted.has(normalized)) continue
    const text = textOf(value)
    if (text) return text
  }
  return ''
}

export const pickActivityId = (raw: Record<string, unknown>) => {
  const nested =
    raw.lastAction && typeof raw.lastAction === 'object'
      ? (raw.lastAction as Record<string, unknown>)
      : {}
  return (
    pickScalar(raw, [
      'activityId',
      'activityid',
      'currentActivityId',
      'ActivityId',
      'stepId',
      'blockId',
      'nodeId',
    ]) ||
    pickScalar(nested, ['activityId', 'activityid', 'blockId', 'stepId'])
  )
}

export const pickStageLabel = (raw: Record<string, unknown>) =>
  pickScalar(raw, [
    'stage',
    'stageName',
    'currentStage',
    'activityName',
    'activityLabel',
    'stepName',
  ])

const isStartType = (type: string) => {
  const normalized = String(type || '').toUpperCase()
  return (
    normalized === 'START' ||
    normalized === 'INITIATOR' ||
    normalized === 'TRIGGER'
  )
}

const blockTitle = (block: Record<string, unknown>) => {
  const settings =
    block.settings && typeof block.settings === 'object'
      ? (block.settings as Record<string, unknown>)
      : {}
  const general =
    settings.general && typeof settings.general === 'object'
      ? (settings.general as Record<string, unknown>)
      : {}
  const type = String(block.type || '').toUpperCase()
  return (
    textOf(general.label) ||
    textOf(general.title) ||
    textOf(general.name) ||
    textOf(settings.label) ||
    textOf(settings.title) ||
    textOf(settings.name) ||
    textOf(block.label) ||
    textOf(block.name) ||
    DEFAULT_STEP_LABELS[type] ||
    'Step'
  )
}

const blockMeta = (block: Record<string, unknown>) => {
  const settings =
    block.settings && typeof block.settings === 'object'
      ? (block.settings as Record<string, unknown>)
      : {}
  const general =
    settings.general && typeof settings.general === 'object'
      ? (settings.general as Record<string, unknown>)
      : {}
  const type = String(
    block.type || block.toolType || settings.toolType || '',
  ).toUpperCase()
  const toolType = String(
    settings.toolType || block.toolType || general.toolType || '',
  )
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
  const subLabel = textOf(
    settings.subLabel || block.subLabel || settings.description,
  )
  return { subLabel, toolType, type }
}

const addUnique = (list: string[], seen: Set<string>, value: string) => {
  const text = value.trim()
  if (!text) return
  const key = text.toLowerCase()
  if (seen.has(key)) return
  seen.add(key)
  list.push(text)
}

const visitAssignee = (
  value: unknown,
  emails: string[],
  ids: string[],
  seenEmail: Set<string>,
  seenId: Set<string>,
) => {
  if (value == null || value === '') return
  if (Array.isArray(value)) {
    value.forEach((item) => visitAssignee(item, emails, ids, seenEmail, seenId))
    return
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    const email = textOf(
      record.email || record.mail || record.loginName || record.userName,
    )
    if (email.includes('@')) addUnique(emails, seenEmail, email)
    const id = textOf(record.id ?? record.userId ?? record.userID ?? record.value)
    if (id.includes('@')) addUnique(emails, seenEmail, id)
    else addUnique(ids, seenId, id)
    return
  }
  const text = String(value).trim()
  if (text.includes('@')) addUnique(emails, seenEmail, text)
  else addUnique(ids, seenId, text)
}

const blockAssignees = (block: Record<string, unknown>) => {
  const settings =
    block.settings && typeof block.settings === 'object'
      ? (block.settings as Record<string, unknown>)
      : {}
  const general =
    settings.general && typeof settings.general === 'object'
      ? (settings.general as Record<string, unknown>)
      : {}
  const emails: string[] = []
  const ids: string[] = []
  const seenEmail = new Set<string>()
  const seenId = new Set<string>()

  ;[
    settings.users,
    settings.selectedUsers,
    block.users,
    block.selectedUsers,
    general.users,
    general.selectedUsers,
  ].forEach((source) => visitAssignee(source, emails, ids, seenEmail, seenId))

  return {
    assignedEmails: emails.length ? emails : undefined,
    assignedUserIds: ids.length ? ids : undefined,
  }
}

const toWorkflowStep = (block: Record<string, unknown>): PortalWorkflowStep => {
  const meta = blockMeta(block)
  const assignees = blockAssignees(block)
  return {
    assignedEmails: assignees.assignedEmails,
    assignedUserIds: assignees.assignedUserIds,
    id: String(block.id || ''),
    subLabel: meta.subLabel || undefined,
    title: blockTitle(block),
    toolType: meta.toolType || undefined,
    type: meta.type,
  }
}

const recordEmail = (record: Record<string, unknown>) =>
  textOf(
    record.email || record.mail || record.loginName || record.userName,
  )

export const resolveAssigneeEmails = (
  step: PortalWorkflowStep,
  users: unknown,
): string[] => {
  const emails: string[] = []
  const seen = new Set<string>()
  ;(step.assignedEmails || []).forEach((email) => addUnique(emails, seen, email))

  const directory = Array.isArray(users) ? users : []
  ;(step.assignedUserIds || []).forEach((id) => {
    if (id.includes('@')) {
      addUnique(emails, seen, id)
      return
    }
    const match = directory.find((entry) => {
      if (!entry || typeof entry !== 'object') return false
      const record = entry as Record<string, unknown>
      return [record.id, record.value, record.userId, record.userID]
        .map((value) => textOf(value))
        .some((value) => value && value === id)
    }) as Record<string, unknown> | undefined
    if (!match) return
    const email = recordEmail(match)
    if (email.includes('@')) addUnique(emails, seen, email)
  })

  return emails
}

const AGENT_TYPES = new Set([
  'AP_AGENT',
  'DOCUMENT_GENERATE_AGENT',
  'FTP_AGENT',
  'KYC_AGENT',
  'OCR',
  'OCR_AGENT',
  'PROCUREMENT_AGENT',
])
const AGENT_TOOLS = new Set([
  'ap_agent',
  'document_generate_agent',
  'ftp_agent',
  'kyc_agent',
  'ocr',
  'ocr_agent',
  'procurement_agent',
])
const USER_TYPES = new Set(['APPROVAL', 'EXTERNAL_ACTOR', 'INTERNAL_ACTOR'])
const USER_TOOLS = new Set([
  'actor',
  'internal_actor',
  'manual_user',
  'verifier',
])
const TRIGGER_TOOLS = new Set([
  'form_submission',
  'gmail',
  'initiator',
  'outlook',
  'start',
  'trigger',
])

export const getStepWaitingKind = (
  step: PortalWorkflowStep,
): PortalWaitingKind => {
  const type = String(step.type || '').toUpperCase()
  const tool = String(step.toolType || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
  const hay = `${step.title} ${step.subLabel || ''}`.toLowerCase()

  if (/\bpayment\b|\bpaid\b|\bpayout\b|\bsettlement\b/.test(hay)) {
    return 'payment'
  }
  if (
    AGENT_TYPES.has(type) ||
    AGENT_TOOLS.has(tool) ||
    tool.endsWith('_agent') ||
    /\bagent\b/.test(hay)
  ) {
    return 'agent'
  }
  if (
    USER_TYPES.has(type) ||
    USER_TOOLS.has(tool) ||
    /manually by user|verifier|approver/.test(hay)
  ) {
    return 'user'
  }
  if (type === 'END' || tool === 'end' || /automated process end/.test(hay)) {
    return 'payment'
  }
  if (isStartType(type) || TRIGGER_TOOLS.has(tool)) {
    return 'trigger'
  }
  return 'default'
}

export const orderWorkflowSteps = (workflow: unknown): PortalWorkflowStep[] => {
  const { blocks, rules } = extractWorkflowGraph(workflow)
  if (!blocks.length) return []

  const byId = new Map(
    blocks.map((block: Record<string, unknown>) => [String(block.id), block]),
  )
  const outgoing = new Map<string, string[]>()
  rules.forEach((rule: Record<string, unknown>) => {
    const from = String(rule.fromBlockId || '')
    const to = String(rule.toBlockId || '')
    if (!from || !to) return
    const next = outgoing.get(from) || []
    next.push(to)
    outgoing.set(from, next)
  })

  const start =
    blocks.find((block: Record<string, unknown>) =>
      isStartType(String(block.type || block.toolType || '')),
    ) || blocks[0]

  const ordered: PortalWorkflowStep[] = []
  const seen = new Set<string>()
  let current: Record<string, unknown> | undefined = start

  while (current && !seen.has(String(current.id))) {
    const id = String(current.id)
    seen.add(id)
    const type = String(current.type || '').toUpperCase()
    if (!SKIP_BLOCK_TYPES.has(type)) {
      ordered.push(toWorkflowStep(current))
    }
    const nextIds = outgoing.get(id) || []
    current = nextIds.map((nextId) => byId.get(nextId)).find(Boolean)
  }

  blocks.forEach((block: Record<string, unknown>) => {
    const id = String(block.id || '')
    if (!id || seen.has(id)) return
    const type = String(block.type || '').toUpperCase()
    if (SKIP_BLOCK_TYPES.has(type)) return
    ordered.push(toWorkflowStep(block))
  })

  return ordered
}

export const getInitiateNodeLabel = (workflow: unknown): string => {
  const { blocks } = extractWorkflowGraph(workflow)
  if (!blocks.length) return ''

  const isStartBlock = (block: Record<string, unknown>, index: number) => {
    const type = String(
      block.type || block.toolType || block.nodeType || '',
    ).toUpperCase()
    if (type === 'START' || type === 'INITIATOR' || type === 'TRIGGER') {
      return true
    }
    const settings =
      block.settings && typeof block.settings === 'object'
        ? (block.settings as Record<string, unknown>)
        : {}
    if (String(settings.label || '').toLowerCase() === 'initiator') return true
    return index === 0
  }

  const startBlock = blocks.find(isStartBlock) || blocks[0]
  if (!startBlock) return ''

  const settings =
    startBlock.settings && typeof startBlock.settings === 'object'
      ? (startBlock.settings as Record<string, unknown>)
      : {}
  const general =
    settings.general && typeof settings.general === 'object'
      ? (settings.general as Record<string, unknown>)
      : {}

  const label =
    textOf(general.label) ||
    textOf(general.title) ||
    textOf(general.name) ||
    textOf(settings.label) ||
    textOf(settings.title) ||
    textOf(settings.name) ||
    textOf(startBlock.label) ||
    textOf(startBlock.name) ||
    textOf(startBlock.title)

  return label
}

const sameStepId = (left: unknown, right: unknown) => {
  const a = String(left ?? '').trim()
  const b = String(right ?? '').trim()
  return Boolean(a) && a === b
}

const normalizeLabel = (value: unknown) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')

const matchTitleIndex = (steps: PortalWorkflowStep[], stage: string) => {
  const target = normalizeLabel(stage)
  if (!target) return -1
  const exact = steps.findIndex((step) => normalizeLabel(step.title) === target)
  if (exact >= 0) return exact
  return steps.findIndex((step) => {
    const title = normalizeLabel(step.title)
    return title.includes(target) || target.includes(title)
  })
}

const matchStepIndex = (
  steps: PortalWorkflowStep[],
  activityId: string,
  stage: string,
) => {
  if (activityId) {
    const byId = steps.findIndex((step) => sameStepId(step.id, activityId))
    if (byId >= 0) return byId
  }
  const byTitle = matchTitleIndex(steps, stage)
  if (byTitle >= 0) return byTitle
  return -1
}

export const resolveStepStatuses = (
  steps: PortalWorkflowStep[],
  activityId: string,
  status: PortalSubmissionStatus,
  stage?: string,
): PortalStepStatus[] => {
  if (!steps.length) return []

  let currentIndex = matchStepIndex(steps, activityId, stage || '')
  const inFlight = status === 'Pending' || status === 'Action Required'
  const matchedIsStart =
    currentIndex >= 0 && isStartType(steps[currentIndex]?.type)

  // Sent/pending tickets often still carry the START activityId even though
  // the instance has already moved on. Prefer the live stage label, then the
  // first real stage after start.
  if (matchedIsStart && inFlight) {
    const byTitle = matchTitleIndex(steps, stage || '')
    if (byTitle >= 0 && byTitle !== currentIndex) {
      currentIndex = byTitle
    } else {
      const next = steps.findIndex(
        (step, index) => index > currentIndex && !isStartType(step.type),
      )
      if (next >= 0) currentIndex = next
    }
  }

  if (currentIndex < 0) {
    if (inFlight) {
      const next = steps.findIndex((step) => !isStartType(step.type))
      currentIndex = next >= 0 ? next : 0
    } else {
      currentIndex = 0
    }
  }

  const lastIndex = steps.length - 1
  const currentIsEnd = steps[currentIndex]?.type === 'END'
  const isDone = status === 'Approved' || currentIsEnd

  if (status === 'Approved' || currentIsEnd) currentIndex = lastIndex

  return steps.map((_, index) => {
    if (isDone || index < currentIndex) return 'completed'
    if (index === currentIndex) return 'current'
    return 'pending'
  })
}

export const buildDetailFormModel = (
  raw: Record<string, unknown>,
  panels: FormPanel[],
): Record<string, unknown> => {
  const fields = parseSubmissionFormData(raw)
  const model: Record<string, unknown> = { ...fields }

  panels.forEach((panel) => {
    ;(panel.fields || []).forEach((field) => {
      const fieldId = String(field.id || '')
      if (!fieldId) return
      const existing = model[fieldId]
      if (existing !== undefined && existing !== null && existing !== '') return

      const candidates = [
        field.jsonId,
        field.name,
        field.label,
        field.columnName,
      ]
      for (const candidate of candidates) {
        if (candidate == null) continue
        const key = String(candidate)
        if (fields[key] !== undefined) {
          model[fieldId] = fields[key]
          break
        }
      }
    })
  })

  return model
}

export const PORTAL_SECTION_DOCUMENT = 'portal-section-document'
export const PORTAL_SECTION_ATTACHMENTS = 'portal-section-attachments'
export const PORTAL_SECTION_HISTORY = 'portal-section-history'

export type PortalNavSection = {
  completed?: boolean
  id: string
  title: string
}

export const formPanelSectionId = (panel: FormPanel, index: number) =>
  `form-panel-${String(panel.id || index)}`

export const getFormPanelTitle = (panel: FormPanel, index: number) => {
  const settings =
    panel.settings && typeof panel.settings === 'object'
      ? (panel.settings as Record<string, unknown>)
      : {}
  return (
    textOf(settings.title) ||
    textOf(settings.name) ||
    textOf(panel.title) ||
    `Section ${index + 1}`
  )
}

export const buildPortalNavSections = (
  panels: FormPanel[],
  labels: { attachments: string; history: string },
  formModel?: Record<string, unknown>,
  hiddenFieldIds?: Set<string>,
): PortalNavSection[] => {
  const sections: PortalNavSection[] = panels
    .map((panel, index) => {
      const visibleFields = (panel.fields || []).filter(
        (field: any) =>
          !isFieldHidden(field) && !hiddenFieldIds?.has(String(field.id || '')),
      )
      const requiredFields = visibleFields.filter(isFieldRequired)
      let completed = false
      if (formModel) {
        if (requiredFields.length > 0) {
          completed = requiredFields.every((field: any) => {
            const fieldId = String(field.id || '')
            const jsonId = String(field.jsonId || '')
            const val =
              formModel[fieldId] ?? (jsonId ? formModel[jsonId] : undefined)
            return isFieldFilled(field, val)
          })
        } else {
          completed = visibleFields.some((field: any) => {
            const fieldId = String(field.id || '')
            const jsonId = String(field.jsonId || '')
            const val =
              formModel[fieldId] ?? (jsonId ? formModel[jsonId] : undefined)
            return isFieldFilled(field, val)
          })
        }
      }
      return {
        completed,
        id: formPanelSectionId(panel, index),
        panel,
        title: getFormPanelTitle(panel, index),
      }
    })
    .filter(({ panel }) =>
      (panel.fields || []).some((field) => !isFieldHidden(field)),
    )
    .map(({ completed, id, title }) => ({ completed, id, title }))

  sections.push(
    { completed: false, id: PORTAL_SECTION_ATTACHMENTS, title: labels.attachments },
    { completed: false, id: PORTAL_SECTION_HISTORY, title: labels.history },
  )
  return sections
}
