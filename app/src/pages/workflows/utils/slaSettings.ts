import { generateId } from './generateId'
import { getNodeToolType, NODE_TOOL_TYPE } from './nodeToolTypes'

export type SlaChannels = { email: boolean; sms: boolean }
export type SlaDurationUnit = 'days' | 'hours' | 'minutes'
export type SlaEscalation = {
  stageId: null | string
  type: null | SlaEscalationType
  userId: null | string
}
export type SlaEscalationType = 'stage' | 'user'

export type SlaMode = 'advanced' | 'standard'

export type SlaRule = {
  /** How this rule notifies when it fires (rule 1 → email, rule 2 → SMS…). */
  channels: SlaChannels
  duration: null | number
  durationUnit: SlaDurationUnit
  /** Block scope only; never present on the workflow SLA. */
  escalateTo?: SlaEscalation
  id: string
  initiator: boolean
  name: string
  notifyUserIds: string[]
}

// Designer SLA configuration. Saved as `SlaSettings` (exact casing) on a
// block's settings and on the workflow's top-level `settings`; the backend
// validates the same contract (WorkflowSlaSettingsValidator).
export type SlaScope = 'block' | 'workflow'

export type SlaSettings = {
  mode: SlaMode
  /** Advanced mode channels, and the default for rules saved without `channels`. */
  notifications: SlaChannels
  rules: SlaRule[]
  slaMasterId: null | string
}

/** Rule id → field → message. `_config` holds configuration-level errors. */
export type SlaValidationErrors = Record<string, Record<string, string>>

export const SLA_DURATION_UNITS: { id: SlaDurationUnit; name: string }[] = [
  { id: 'minutes', name: 'Minutes' },
  { id: 'hours', name: 'Hours' },
  { id: 'days', name: 'Days' },
]

const DURATION_UNIT_IDS = new Set<string>(SLA_DURATION_UNITS.map((u) => u.id))

const emptyEscalation = (): SlaEscalation => ({
  stageId: null,
  type: null,
  userId: null,
})

export const createSlaRule = (scope: SlaScope): SlaRule => ({
  channels: { email: true, sms: false },
  duration: null,
  durationUnit: 'minutes',
  id: `sla-${generateId()}`,
  initiator: false,
  name: '',
  notifyUserIds: [],
  ...(scope === 'block' ? { escalateTo: emptyEscalation() } : {}),
})

export const createSlaSettings = (): SlaSettings => ({
  mode: 'standard',
  notifications: { email: true, sms: false },
  rules: [],
  slaMasterId: null,
})

const toId = (value: unknown): null | string =>
  value === null || value === undefined || value === '' ? null : String(value)

/**
 * Reads a saved `SlaSettings` object into the editor shape. Returns null when
 * nothing usable was saved so untouched workflows stay free of the key.
 */
export const normalizeSlaSettings = (
  raw: unknown,
  scope: SlaScope,
): null | SlaSettings => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const source = raw as Record<string, any>
  const mode: SlaMode =
    String(source.mode).toLowerCase() === 'advanced' ? 'advanced' : 'standard'
  const notifications: SlaChannels = {
    email: source.notifications?.email ?? true,
    sms: Boolean(source.notifications?.sms),
  }

  const rules: SlaRule[] = Array.isArray(source.rules)
    ? source.rules
        .filter((r: unknown) => r && typeof r === 'object')
        .map((r: Record<string, any>): SlaRule => {
          const unit = String(r.durationUnit ?? '').toLowerCase()
          const duration = Number(r.duration)
          const rule: SlaRule = {
            channels: r.channels
              ? {
                  email: Boolean(r.channels.email),
                  sms: Boolean(r.channels.sms),
                }
              : { ...notifications },
            duration:
              Number.isFinite(duration) && r.duration !== '' ? duration : null,
            durationUnit: DURATION_UNIT_IDS.has(unit)
              ? (unit as SlaDurationUnit)
              : 'minutes',
            id: toId(r.id) ?? `sla-${generateId()}`,
            initiator: Boolean(r.initiator),
            name: String(r.name ?? ''),
            notifyUserIds: Array.isArray(r.notifyUserIds)
              ? r.notifyUserIds.map(String).filter(Boolean)
              : [],
          }
          if (scope === 'block') {
            const type = String(r.escalateTo?.type ?? '').toLowerCase()
            rule.escalateTo = setEscalationType(
              emptyEscalation(),
              type === 'user' || type === 'stage' ? type : null,
            )
            if (type === 'user')
              rule.escalateTo.userId = toId(r.escalateTo?.userId)
            if (type === 'stage')
              rule.escalateTo.stageId = toId(r.escalateTo?.stageId)
          }
          return rule
        })
    : []

  return {
    mode,
    notifications,
    rules,
    slaMasterId: toId(source.slaMasterId),
  }
}

/** Switching target type drops the other side's id so no stale value is saved. */
export const setEscalationType = (
  escalation: SlaEscalation | undefined,
  type: null | SlaEscalationType,
): SlaEscalation => {
  const current = escalation ?? emptyEscalation()
  if (current.type === type) return current
  return { stageId: null, type, userId: null }
}

/**
 * The shape that is saved: only the active mode's data is kept (Advanced
 * drops rules, Standard drops the master) and the workflow scope never
 * carries `escalateTo`.
 */
export const serializeSlaSettings = (
  settings: SlaSettings,
  scope: SlaScope,
): SlaSettings => ({
  mode: settings.mode,
  notifications: {
    email: Boolean(settings.notifications.email),
    sms: Boolean(settings.notifications.sms),
  },
  rules:
    settings.mode === 'advanced'
      ? []
      : settings.rules.map((rule) => {
          const base: SlaRule = {
            channels: {
              email: Boolean(rule.channels.email),
              sms: Boolean(rule.channels.sms),
            },
            duration: rule.duration,
            durationUnit: rule.durationUnit,
            id: rule.id,
            initiator: rule.initiator,
            name: rule.name.trim(),
            notifyUserIds: [...rule.notifyUserIds],
          }
          if (scope === 'block') {
            const esc = rule.escalateTo ?? emptyEscalation()
            base.escalateTo = {
              stageId: esc.type === 'stage' ? esc.stageId : null,
              type: esc.type,
              userId: esc.type === 'user' ? esc.userId : null,
            }
          }
          return base
        }),
  slaMasterId: settings.mode === 'advanced' ? settings.slaMasterId : null,
})

export const validateSlaSettings = (
  settings: null | SlaSettings | undefined,
  scope: SlaScope,
  validStageIds?: string[],
): SlaValidationErrors => {
  const errors: SlaValidationErrors = {}
  if (!settings) return errors
  const add = (key: string, field: string, message: string) => {
    errors[key] = { ...errors[key], [field]: message }
  }

  if (settings.mode === 'advanced') {
    if (!settings.slaMasterId)
      add('_config', 'slaMasterId', 'Select an SLA Master')
    return errors
  }

  const seen = new Set<string>()
  settings.rules.forEach((rule) => {
    if (seen.has(rule.id)) add(rule.id, 'id', 'Duplicate rule id')
    seen.add(rule.id)
    if (!rule.name.trim()) add(rule.id, 'name', 'Name is required')
    if (rule.duration === null || !(rule.duration > 0))
      add(rule.id, 'duration', 'Enter a duration greater than 0')
    if (!DURATION_UNIT_IDS.has(rule.durationUnit))
      add(rule.id, 'durationUnit', 'Select a unit')
    // Matches WorkflowSlaSettingsValidator: a rule must notify or escalate.
    const notifies =
      (rule.notifyUserIds.length > 0 || rule.initiator) &&
      (rule.channels.email || rule.channels.sms)
    if (!notifies && !rule.escalateTo?.type)
      add(
        rule.id,
        'action',
        'Choose who to notify (with Email or SMS) or an escalation',
      )
    if (scope !== 'block') return
    const esc = rule.escalateTo
    if (esc?.type === 'user' && !esc.userId)
      add(rule.id, 'escalateTo', 'Select a user to escalate to')
    if (esc?.type === 'stage') {
      if (!esc.stageId) add(rule.id, 'escalateTo', 'Select a stage')
      else if (validStageIds && !validStageIds.includes(esc.stageId))
        add(rule.id, 'escalateTo', 'This stage is no longer in the workflow')
    }
  })
  return errors
}

export const hasSlaErrors = (errors: SlaValidationErrors) =>
  Object.keys(errors).length > 0

export const firstSlaError = (errors: SlaValidationErrors) => {
  const first = Object.values(errors)[0]
  return first ? Object.values(first)[0] : undefined
}

/** Node tool types that are human stages and can own / receive an SLA. */
export const isSlaStageNode = (data: Record<string, any> | undefined) => {
  const toolType = getNodeToolType(data)
  return (
    toolType === NODE_TOOL_TYPE.MANUAL_USER ||
    toolType === 'verifier' ||
    toolType === 'actor' ||
    toolType === 'internal_actor'
  )
}

/** The workflow's END ("Workflow Success") node; mirrors exportWorkflow's END mapping. */
export const isEndNode = (data: Record<string, any> | undefined) =>
  getNodeToolType(data) === NODE_TOOL_TYPE.END ||
  String(data?.type || '').toUpperCase() === 'END' ||
  data?.label === 'Workflow Success'

/** Stages an SLA can escalate a ticket to: people's stages, or END (closes the ticket). */
export const isSlaEscalationTarget = (data: Record<string, any> | undefined) =>
  isSlaStageNode(data) || isEndNode(data)

/**
 * First blocking SLA problem across the workflow: the workflow SLA, then each
 * stage's block SLA. `nodeId` is set for block problems.
 */
export const getWorkflowSlaError = (
  nodes: { data: Record<string, any>; id: string }[],
  workflowSla: null | SlaSettings,
): null | { message: string; nodeId?: string } => {
  const globalError = firstSlaError(
    validateSlaSettings(workflowSla, 'workflow'),
  )
  if (globalError) return { message: `Workflow SLA: ${globalError}` }

  const stageIds = nodes
    .filter((n) => isSlaEscalationTarget(n.data))
    .map((n) => n.id)
  for (const node of nodes) {
    if (!node.data?.SlaSettings) continue
    const error = firstSlaError(
      validateSlaSettings(
        node.data.SlaSettings,
        'block',
        stageIds.filter((id) => id !== node.id),
      ),
    )
    if (error)
      return {
        message: `${String(node.data.label || 'Step')} SLA: ${error}`,
        nodeId: node.id,
      }
  }
  return null
}

/** Every `SlaSettings` in an exported/saved workflow JSON, keyed by location. */
export const collectSlaSettings = (workflowJson: any) => {
  const found: Record<string, unknown> = {}
  if (workflowJson?.settings?.SlaSettings)
    found.workflow = workflowJson.settings.SlaSettings
  for (const block of workflowJson?.blocks ?? []) {
    if (block?.settings?.SlaSettings)
      found[`block:${block.id}`] = block.settings.SlaSettings
  }
  return found
}

/** Locations whose saved SLA differs from what was sent (empty = all persisted). */
export const diffSlaSettings = (sentJson: any, savedJson: any): string[] => {
  const sent = collectSlaSettings(sentJson)
  const saved = collectSlaSettings(savedJson)
  const keys = new Set([...Object.keys(sent), ...Object.keys(saved)])
  return [...keys].filter(
    (key) => JSON.stringify(sent[key]) !== JSON.stringify(saved[key]),
  )
}
