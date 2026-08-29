import { isFieldHidden } from '@/pages/requests/components/workflow-request/utils/fieldRendering'
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

export type PortalWorkflowStep = {
  id: string
  title: string
  type: string
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
  const activityId = textOf(
    raw.activityId ||
      raw.activityid ||
      raw.currentActivityId ||
      raw.ActivityId ||
      raw.stepId ||
      raw.blockId,
  )
  const repositoryId =
    textOf(raw.repositoryId) || textOf(raw.repositoryid) || undefined

  return { activityId, instanceId, processId, repositoryId }
}

const blockTitle = (block: Record<string, unknown>) => {
  const settings =
    block.settings && typeof block.settings === 'object'
      ? (block.settings as Record<string, unknown>)
      : {}
  const type = String(block.type || '').toUpperCase()
  return (
    textOf(settings.label) ||
    textOf(settings.title) ||
    textOf(settings.name) ||
    textOf(block.label) ||
    textOf(block.name) ||
    DEFAULT_STEP_LABELS[type] ||
    'Step'
  )
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
    blocks.find(
      (block: Record<string, unknown>) =>
        String(block.type || '').toUpperCase() === 'START',
    ) || blocks[0]

  const ordered: PortalWorkflowStep[] = []
  const seen = new Set<string>()
  let current: Record<string, unknown> | undefined = start

  while (current && !seen.has(String(current.id))) {
    const id = String(current.id)
    seen.add(id)
    const type = String(current.type || '').toUpperCase()
    if (!SKIP_BLOCK_TYPES.has(type)) {
      ordered.push({ id, title: blockTitle(current), type })
    }
    const nextIds = outgoing.get(id) || []
    current = nextIds.map((nextId) => byId.get(nextId)).find(Boolean)
  }

  blocks.forEach((block: Record<string, unknown>) => {
    const id = String(block.id || '')
    if (!id || seen.has(id)) return
    const type = String(block.type || '').toUpperCase()
    if (SKIP_BLOCK_TYPES.has(type)) return
    ordered.push({ id, title: blockTitle(block), type })
  })

  return ordered
}

const matchStepIndex = (
  steps: PortalWorkflowStep[],
  activityId: string,
  stage: string,
) => {
  if (activityId) {
    const byId = steps.findIndex((step) => step.id === activityId)
    if (byId >= 0) return byId
  }
  if (stage) {
    const normalized = stage.toLowerCase()
    const byTitle = steps.findIndex(
      (step) => step.title.toLowerCase() === normalized,
    )
    if (byTitle >= 0) return byTitle
  }
  return 0
}

export const resolveStepStatuses = (
  steps: PortalWorkflowStep[],
  activityId: string,
  status: PortalSubmissionStatus,
  stage?: string,
): PortalStepStatus[] => {
  if (!steps.length) return []

  let currentIndex = matchStepIndex(steps, activityId, stage || '')
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
): PortalNavSection[] => {
  const sections: PortalNavSection[] = panels
    .map((panel, index) => ({
      id: formPanelSectionId(panel, index),
      panel,
      title: getFormPanelTitle(panel, index),
    }))
    .filter(({ panel }) =>
      (panel.fields || []).some((field) => !isFieldHidden(field)),
    )
    .map(({ id, title }) => ({ id, title }))

  sections.push(
    { id: PORTAL_SECTION_ATTACHMENTS, title: labels.attachments },
    { id: PORTAL_SECTION_HISTORY, title: labels.history },
  )
  return sections
}
