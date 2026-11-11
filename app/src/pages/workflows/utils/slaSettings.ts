import { generateId } from './generateId'
import { getNodeToolType, NODE_TOOL_TYPE } from './nodeToolTypes'

/** Custom Setup: what happens if the request is still not done after the last level. */
export type SlaAfterLast = {
  groupId: null | string
  type: SlaAfterLastType
  userId: null | string
  /** How long to wait after the last level. */
  wait: null | number
  waitUnit: SlaDurationUnit
}
export type SlaAfterLastType = 'group' | 'manager' | 'none' | 'remind' | 'user'

export type SlaAdvancedRule = {
  breachAction: SlaBreachAction
  conditions: SlaCondition[]
  enabled: boolean
  entryIds: string[]
  /** How several entries are used: first | shortest | longest | each. */
  entryStrategy: SlaEntryStrategy
  id: string
  initiator: boolean
  /** True = all conditions (AND), false = any (OR). */
  matchAll: boolean
  name: string
  notifyUserIds: string[]
  priority: number
  /** Working minutes before each deadline; null = no reminder. */
  reminderMinutes: null | number
  stopAfterMatch: boolean
}
export type SlaBreachAction = {
  on: SlaBreachOn
  stageId: null | string
  type: SlaBreachType
}
export type SlaBreachOn = 'both' | 'resolution' | 'response'
export type SlaBreachType = 'none' | 'notify' | 'reassign' | 'stage'
export type SlaChannels = { email: boolean; sms: boolean }
export type SlaCondition = {
  fieldId: string
  id: string
  logic: string
  value: string
}
export type SlaDurationUnit = 'days' | 'hours' | 'minutes'
export type SlaEntryStrategy = 'each' | 'first' | 'longest' | 'shortest'
export type SlaEscalation = {
  /** Type `group` only: the tenant group that receives the request. */
  groupId?: null | string
  stageId: null | string
  type: null | SlaEscalationType
  userId: null | string
}
export type SlaEscalationType = 'group' | 'stage' | 'user'

/** SLA Master field (jsonId) for each SLA property (Advanced). */
export type SlaFieldMapping = {
  escalationUsers: null | string
  name: null | string
  notifyUsers: null | string
  resolutionDuration: null | string
  resolutionUnit: null | string
  responseDuration: null | string
  responseUnit: null | string
}

/** Advanced: one SLA Master entry and what happens at its time. */
export type SlaMasterRow = {
  entryId: null | string
  /** Tell the entry's Escalate users (on a stage, also reassign to the first). */
  escalate: boolean
  id: string
  /** Tell the entry's Notify users. */
  notify: boolean
}

export type SlaMode = 'advanced' | 'standard'

/** Custom Setup: a value in each request picks the SLA form entry. */
export type SlaSelection = {
  /** Entry used when no rule is found; null = no time limit then. */
  defaultEntryId: null | string
  /** The request form's field (jsonId) whose value decides. */
  fieldId: null | string
  method: SlaSelectionMethod
  /** Method column: the form the field gets its options from. */
  recordFormId: null | string
  /** Method column: that form's column the field shows. */
  recordValueColumn: null | string
  /** Method column: that form's field (jsonId) naming the rule. */
  ruleColumn: null | string
  /** Method map: the rule for each option. */
  valueRules: SlaValueRule[]
}
export type SlaSelectionMethod = 'column' | 'map' | 'sameName'
export type SlaValueRule = { entryId: null | string; value: string }

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
  /** Editor only: the Notify checkbox. Unset = on when the rule has recipients. */
  notify?: boolean
  notifyUserIds: string[]
}

// Designer SLA configuration. Saved as `SlaSettings` (exact casing) on a
// block's settings and on the workflow's top-level `settings`; the backend
// validates the same contract (WorkflowSlaSettingsValidator).
export type SlaScope = 'block' | 'workflow'

export type SlaSettings = {
  /** Advanced (workflow settings): rules picking SLA Master entries. */
  advancedRules?: SlaAdvancedRule[]
  /** Custom Setup: what happens after the last level. */
  afterLastLevel?: null | SlaAfterLast
  /** Advanced: entry used when no rule matches; null = no SLA then. */
  fallbackEntryId?: null | string
  /** Advanced: SLA Master fields the SLA values are read from. */
  fieldMapping?: SlaFieldMapping
  /** Advanced: the entries used, each with its own time and action. */
  masterEntries?: SlaMasterRow[]
  /** Advanced: the SLA Master field (jsonId) that names the entries, e.g. Name. */
  masterFieldId?: null | string
  mode: SlaMode
  /** Advanced mode channels, and the default for rules saved without `channels`. */
  notifications: SlaChannels
  /** Advanced: stage whose first action meets the response SLA; null = no response SLA. */
  responseStageId?: null | string
  rules: SlaRule[]
  /** Custom Setup: set when it depends on the request; unset = same for every request. */
  selection?: null | SlaSelection
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

export const SLA_ENTRY_STRATEGIES: { id: SlaEntryStrategy; name: string }[] = [
  { id: 'first', name: 'First entry in the list' },
  { id: 'shortest', name: 'Shortest SLA' },
  { id: 'longest', name: 'Longest SLA' },
  { id: 'each', name: 'Each entry separately' },
]

/** Operators shared with the condition block (WorkflowConditionEvaluator). */
export const SLA_CONDITION_OPERATORS: { id: string; name: string }[] = [
  { id: 'IS_EQUALS_TO', name: 'Equals' },
  { id: 'IS_NOT_EQUALS_TO', name: 'Not equals' },
  { id: 'CONTAINS', name: 'Contains' },
  { id: 'NOT_CONTAINS', name: 'Not contains' },
  { id: 'IS_ANY_OF', name: 'In (comma list)' },
  { id: 'IS_NOT_ANY_OF', name: 'Not in (comma list)' },
  { id: 'IS_GREATER_THAN', name: 'Greater than' },
  { id: 'IS_LESSER_THAN', name: 'Less than' },
  { id: 'IS_EMPTY', name: 'Is empty' },
  { id: 'IS_NOT_EMPTY', name: 'Is not empty' },
]

const NO_VALUE_OPERATORS = new Set(['IS_EMPTY', 'IS_NOT_EMPTY'])
export const conditionNeedsValue = (logic: string) =>
  !NO_VALUE_OPERATORS.has(logic)

const STRATEGY_IDS = new Set<string>(SLA_ENTRY_STRATEGIES.map((s) => s.id))
const OPERATOR_IDS = new Set(SLA_CONDITION_OPERATORS.map((o) => o.id))

export const emptyFieldMapping = (): SlaFieldMapping => ({
  escalationUsers: null,
  name: null,
  notifyUsers: null,
  resolutionDuration: null,
  resolutionUnit: null,
  responseDuration: null,
  responseUnit: null,
})

export const createSlaCondition = (): SlaCondition => ({
  fieldId: '',
  id: `cond-${generateId()}`,
  logic: 'IS_EQUALS_TO',
  value: '',
})

export const createAdvancedRule = (priority: number): SlaAdvancedRule => ({
  breachAction: { on: 'resolution', stageId: null, type: 'notify' },
  conditions: [createSlaCondition()],
  enabled: true,
  entryIds: [],
  entryStrategy: 'first',
  id: `sla-adv-${generateId()}`,
  initiator: false,
  matchAll: true,
  name: '',
  notifyUserIds: [],
  priority,
  reminderMinutes: null,
  stopAfterMatch: true,
})

export const createSlaSelection = (): SlaSelection => ({
  defaultEntryId: null,
  fieldId: null,
  method: 'map',
  recordFormId: null,
  recordValueColumn: null,
  ruleColumn: null,
  valueRules: [],
})

export const createAfterLast = (type: SlaAfterLastType): SlaAfterLast => ({
  groupId: null,
  type,
  userId: null,
  wait: 1,
  waitUnit: 'days',
})

const AFTER_LAST_TYPES = new Set<string>([
  'group',
  'manager',
  'none',
  'remind',
  'user',
])

export const createSlaMasterRow = (): SlaMasterRow => ({
  entryId: null,
  escalate: false,
  id: `sla-row-${generateId()}`,
  notify: true,
})

/** The Notify checkbox: explicit once touched, else on when the rule has recipients. */
export const isNotifyOn = (rule: SlaRule) =>
  rule.notify ?? (rule.notifyUserIds.length > 0 || rule.initiator)

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
              type === 'user' || type === 'stage' || type === 'group'
                ? type
                : null,
            )
            if (type === 'user')
              rule.escalateTo.userId = toId(r.escalateTo?.userId)
            if (type === 'stage')
              rule.escalateTo.stageId = toId(r.escalateTo?.stageId)
            if (type === 'group')
              rule.escalateTo.groupId = toId(r.escalateTo?.groupId)
          }
          return rule
        })
    : []

  const settings: SlaSettings = {
    mode,
    notifications,
    rules,
    slaMasterId: toId(source.slaMasterId),
  }
  // SLA Master entries (stage and workflow scope). Settings saved with a single
  // entryId become one row doing both, with the same id so its timers still match.
  const masterRows: SlaMasterRow[] = Array.isArray(source.masterEntries)
    ? source.masterEntries
        .filter((r: unknown) => r && typeof r === 'object')
        .map((r: Partial<SlaMasterRow>) => ({
          entryId: toId(r.entryId),
          escalate: r.escalate === true,
          id: toId(r.id) ?? `sla-row-${generateId()}`,
          notify: r.notify === true,
        }))
    : source.entryId
      ? [
          {
            entryId: toId(source.entryId),
            escalate: true,
            id: String(source.entryId),
            notify: true,
          },
        ]
      : []
  if (source.masterFieldId || masterRows.length > 0) {
    settings.masterFieldId = toId(source.masterFieldId)
    settings.masterEntries = masterRows
  }
  // Custom Setup keys only when saved, so older settings keep their shape.
  if (mode === 'advanced' && source.selection)
    settings.selection = normalizeSelection(source.selection)
  if (mode === 'advanced' && source.afterLastLevel)
    settings.afterLastLevel = normalizeAfterLast(source.afterLastLevel)
  // Advanced keys only when saved, so Standard / older settings keep their shape.
  const hasAdvanced = [
    'advancedRules',
    'fallbackEntryId',
    'fieldMapping',
    'responseStageId',
  ].some((key) => key in source)
  if (scope === 'workflow' && hasAdvanced) {
    settings.fieldMapping = normalizeFieldMapping(source.fieldMapping)
    settings.advancedRules = Array.isArray(source.advancedRules)
      ? source.advancedRules
          .filter((r: unknown) => r && typeof r === 'object')
          .map(normalizeAdvancedRule)
      : []
    settings.responseStageId = toId(source.responseStageId)
    settings.fallbackEntryId = toId(source.fallbackEntryId)
  }
  return settings
}

const normalizeSelection = (raw: Record<string, any>): SlaSelection => ({
  defaultEntryId: toId(raw.defaultEntryId),
  fieldId: toId(raw.fieldId),
  method:
    raw.method === 'column' || raw.method === 'sameName' ? raw.method : 'map',
  recordFormId: toId(raw.recordFormId),
  recordValueColumn: toId(raw.recordValueColumn),
  ruleColumn: toId(raw.ruleColumn),
  valueRules: Array.isArray(raw.valueRules)
    ? raw.valueRules
        .filter((r: any) => r && r.value)
        .map((r: any) => ({
          entryId: toId(r.entryId),
          value: String(r.value),
        }))
    : [],
})

const normalizeAfterLast = (raw: Record<string, any>): SlaAfterLast => {
  const type = String(raw.type ?? '').toLowerCase()
  const unit = String(raw.waitUnit ?? '').toLowerCase()
  const wait = Number(raw.wait)
  return {
    groupId: toId(raw.groupId),
    type: AFTER_LAST_TYPES.has(type) ? (type as SlaAfterLastType) : 'none',
    userId: toId(raw.userId),
    wait: Number.isFinite(wait) && wait > 0 ? wait : null,
    waitUnit: DURATION_UNIT_IDS.has(unit) ? (unit as SlaDurationUnit) : 'days',
  }
}

const normalizeFieldMapping = (raw: unknown): SlaFieldMapping => {
  const mapping = emptyFieldMapping()
  if (!raw || typeof raw !== 'object') return mapping
  const source = raw as Record<string, unknown>
  for (const key of Object.keys(mapping) as (keyof SlaFieldMapping)[])
    mapping[key] = toId(source[key])
  return mapping
}

/** A saved advanced rule, before normalizing (any field may be missing or mistyped). */
type SavedAdvancedRule = {
  breachAction?: { on?: unknown; stageId?: unknown; type?: unknown }
  conditions?: unknown
  enabled?: unknown
  entryIds?: unknown
  entryStrategy?: unknown
  id?: unknown
  initiator?: unknown
  matchAll?: unknown
  name?: unknown
  notifyUserIds?: unknown
  priority?: unknown
  reminderMinutes?: unknown
  stopAfterMatch?: unknown
}

type SavedCondition = {
  fieldId?: unknown
  id?: unknown
  logic?: unknown
  value?: unknown
}

const normalizeAdvancedRule = (
  r: SavedAdvancedRule,
  index: number,
): SlaAdvancedRule => {
  const strategy = String(r.entryStrategy ?? '').toLowerCase()
  const type = String(r.breachAction?.type ?? 'none').toLowerCase()
  const on = String(r.breachAction?.on ?? 'resolution').toLowerCase()
  const reminder = Number(r.reminderMinutes)
  const priority = Number(r.priority)
  return {
    breachAction: {
      on: on === 'response' || on === 'both' ? on : 'resolution',
      stageId: toId(r.breachAction?.stageId),
      type:
        type === 'notify' || type === 'reassign' || type === 'stage'
          ? type
          : 'none',
    },
    conditions: Array.isArray(r.conditions)
      ? r.conditions.map((c: SavedCondition) => ({
          fieldId: String(c?.fieldId ?? ''),
          id: toId(c?.id) ?? `cond-${generateId()}`,
          logic: String(c?.logic || 'IS_EQUALS_TO').toUpperCase(),
          value: String(c?.value ?? ''),
        }))
      : [],
    enabled: r.enabled !== false,
    entryIds: Array.isArray(r.entryIds)
      ? r.entryIds.map(String).filter(Boolean)
      : [],
    entryStrategy: STRATEGY_IDS.has(strategy)
      ? (strategy as SlaEntryStrategy)
      : 'first',
    id: toId(r.id) ?? `sla-adv-${generateId()}`,
    initiator: Boolean(r.initiator),
    matchAll: r.matchAll !== false,
    name: String(r.name ?? ''),
    notifyUserIds: Array.isArray(r.notifyUserIds)
      ? r.notifyUserIds.map(String).filter(Boolean)
      : [],
    priority:
      r.priority !== null && r.priority !== '' && Number.isFinite(priority)
        ? priority
        : index + 1,
    reminderMinutes:
      Number.isFinite(reminder) && reminder > 0 ? Math.round(reminder) : null,
    stopAfterMatch: r.stopAfterMatch === true,
  }
}

/** Switching target type drops the other side's id so no stale value is saved. */
export const setEscalationType = (
  escalation: SlaEscalation | undefined,
  type: null | SlaEscalationType,
): SlaEscalation => {
  const current = escalation ?? emptyEscalation()
  if (current.type === type) return current
  return {
    stageId: null,
    type,
    userId: null,
    ...(type === 'group' ? { groupId: null } : {}),
  }
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
            initiator: isNotifyOn(rule) && rule.initiator,
            name: rule.name.trim(),
            notifyUserIds: isNotifyOn(rule) ? [...rule.notifyUserIds] : [],
          }
          if (scope === 'block') {
            const esc = rule.escalateTo ?? emptyEscalation()
            base.escalateTo = {
              stageId: esc.type === 'stage' ? esc.stageId : null,
              type: esc.type,
              userId: esc.type === 'user' ? esc.userId : null,
              ...(esc.type === 'group' ? { groupId: esc.groupId ?? null } : {}),
            }
          }
          return base
        }),
  slaMasterId: settings.mode === 'advanced' ? settings.slaMasterId : null,
  ...(settings.mode === 'advanced' && settings.selection
    ? {
        masterFieldId: settings.masterFieldId ?? null,
        selection: serializeSelection(settings.selection),
      }
    : {}),
  ...(settings.mode === 'advanced' &&
  settings.afterLastLevel &&
  settings.afterLastLevel.type !== 'none'
    ? { afterLastLevel: serializeAfterLast(settings.afterLastLevel) }
    : {}),
  ...(settings.mode === 'advanced' &&
  !settings.selection &&
  hasMasterEntry(settings)
    ? {
        masterEntries: (settings.masterEntries ?? []).map((row) => ({
          entryId: row.entryId,
          escalate: row.escalate,
          id: row.id,
          notify: row.notify,
        })),
        masterFieldId: settings.masterFieldId ?? null,
      }
    : {}),
  // Rule-based Advanced settings saved earlier keep working until an entry is chosen.
  ...(scope === 'workflow' &&
  settings.mode === 'advanced' &&
  !settings.selection &&
  !hasMasterEntry(settings) &&
  hasLegacyAdvanced(settings)
    ? serializeAdvanced(settings)
    : {}),
})

const serializeSelection = (selection: SlaSelection): SlaSelection => {
  const column = selection.method === 'column'
  return {
    defaultEntryId: selection.defaultEntryId,
    fieldId: selection.fieldId,
    method: selection.method,
    recordFormId: column ? selection.recordFormId : null,
    recordValueColumn: column ? selection.recordValueColumn : null,
    ruleColumn: column ? selection.ruleColumn : null,
    valueRules:
      selection.method === 'map'
        ? selection.valueRules.filter((r) => r.entryId)
        : [],
  }
}

const serializeAfterLast = (after: SlaAfterLast): SlaAfterLast => ({
  groupId: after.type === 'group' ? after.groupId : null,
  type: after.type,
  userId: after.type === 'user' ? after.userId : null,
  wait: after.wait,
  waitUnit: after.waitUnit,
})

const hasMasterEntry = (settings: SlaSettings) =>
  Boolean(settings.masterFieldId || settings.masterEntries?.length)

const hasLegacyAdvanced = (settings: SlaSettings) =>
  (settings.advancedRules?.length ?? 0) > 0 || Boolean(settings.fallbackEntryId)

const serializeAdvanced = (settings: SlaSettings) => ({
  advancedRules: (settings.advancedRules ?? []).map((rule) => ({
    breachAction: {
      on: rule.breachAction.on,
      stageId:
        rule.breachAction.type === 'stage' ? rule.breachAction.stageId : null,
      type: rule.breachAction.type,
    },
    conditions: rule.conditions.map((c) => ({
      fieldId: c.fieldId,
      id: c.id,
      logic: c.logic,
      value: conditionNeedsValue(c.logic) ? c.value.trim() : '',
    })),
    enabled: rule.enabled,
    entryIds: [...rule.entryIds],
    entryStrategy: rule.entryStrategy,
    id: rule.id,
    initiator: rule.initiator,
    matchAll: rule.matchAll,
    name: rule.name.trim(),
    notifyUserIds: [...rule.notifyUserIds],
    priority: rule.priority,
    reminderMinutes: rule.reminderMinutes,
    stopAfterMatch: rule.stopAfterMatch,
  })),
  fallbackEntryId: settings.fallbackEntryId ?? null,
  fieldMapping: { ...emptyFieldMapping(), ...settings.fieldMapping },
  responseStageId: settings.responseStageId ?? null,
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
      add('_config', 'slaMasterId', 'Select an SLA form')
    else if (settings.selection) validateSelection(settings.selection, add)
    else if (!hasMasterEntry(settings) && hasLegacyAdvanced(settings)) {
      if (scope === 'workflow') validateAdvanced(settings, add, validStageIds)
    } else if (!settings.masterEntries?.length)
      add('_config', 'entryId', 'Add at least one SLA entry')
    else
      settings.masterEntries.forEach((row) => {
        if (!row.entryId) add(row.id, 'entryId', 'Choose an SLA entry')
        if (!row.notify && !row.escalate)
          add(row.id, 'action', 'Tick Notify, Escalate or both')
      })
    validateAfterLast(settings.afterLastLevel, scope, add)
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
    // Matches WorkflowSlaSettingsValidator: a rule must notify or escalate, and
    // whichever is ticked must be complete.
    const notifyOn = isNotifyOn(rule)
    if (!notifyOn && !rule.escalateTo?.type)
      add(
        rule.id,
        'action',
        scope === 'block'
          ? 'Tick Send Notification, Enable Escalation or both'
          : 'Tick Send Notification',
      )
    if (notifyOn) {
      if (rule.notifyUserIds.length === 0 && !rule.initiator)
        add(rule.id, 'notifyUserIds', 'Choose who to notify')
      if (!rule.channels.email && !rule.channels.sms)
        add(rule.id, 'channels', 'Choose Email, SMS or both')
    }
    if (scope !== 'block') return
    const esc = rule.escalateTo
    if (esc?.type === 'user' && !esc.userId)
      add(rule.id, 'escalateTo', 'Select a user to escalate to')
    if (esc?.type === 'group' && !esc.groupId)
      add(rule.id, 'escalateTo', 'Select a group to escalate to')
    if (esc?.type === 'stage') {
      if (!esc.stageId) add(rule.id, 'escalateTo', 'Select a stage')
      else if (validStageIds && !validStageIds.includes(esc.stageId))
        add(rule.id, 'escalateTo', 'This stage is no longer in the workflow')
    }
  })
  return errors
}

/** Matches WorkflowSlaSettingsValidator.ValidateSelection. */
const validateSelection = (
  selection: SlaSelection,
  add: (key: string, field: string, message: string) => void,
) => {
  if (!selection.fieldId)
    add('_config', 'fieldId', 'Select the field that decides the time limit')
  if (
    selection.method === 'column' &&
    (!selection.recordFormId || !selection.ruleColumn)
  )
    add('_config', 'ruleColumn', 'Select the column that names the rule')
  if (
    selection.method === 'map' &&
    !selection.defaultEntryId &&
    !selection.valueRules.some((r) => r.entryId)
  )
    add('_config', 'valueRules', 'Choose a rule for at least one option')
}

/** Matches WorkflowSlaSettingsValidator.ValidateAfterLast. */
const validateAfterLast = (
  after: null | SlaAfterLast | undefined,
  scope: SlaScope,
  add: (key: string, field: string, message: string) => void,
) => {
  if (!after || after.type === 'none') return
  if (scope !== 'block' && after.type !== 'remind')
    add('_after', 'type', 'A workflow SLA can only send a reminder')
  if (after.wait === null || !(after.wait > 0))
    add('_after', 'wait', 'Enter how long to wait')
  if (after.type === 'group' && !after.groupId)
    add('_after', 'groupId', 'Select a group')
  if (after.type === 'user' && !after.userId)
    add('_after', 'userId', 'Select a user')
}

/** Matches WorkflowSlaSettingsValidator.ValidateAdvanced. */
const validateAdvanced = (
  settings: SlaSettings,
  add: (key: string, field: string, message: string) => void,
  validStageIds?: string[],
) => {
  const rules = settings.advancedRules ?? []
  const mapping = settings.fieldMapping ?? emptyFieldMapping()
  if (rules.length === 0 && !settings.fallbackEntryId) return
  if (!mapping.resolutionDuration || !mapping.resolutionUnit)
    add('_config', 'mapping', 'Map the Resolution time and Resolution type')
  if (settings.responseStageId) {
    if (!mapping.responseDuration || !mapping.responseUnit)
      add('_config', 'mapping', 'Map the Response time and Response type')
    if (validStageIds && !validStageIds.includes(settings.responseStageId))
      add(
        '_config',
        'responseStageId',
        'This stage is no longer in the workflow',
      )
  }
  const seen = new Set<string>()
  rules.forEach((rule) => {
    if (seen.has(rule.id)) add(rule.id, 'id', 'Duplicate rule id')
    seen.add(rule.id)
    if (!rule.name.trim()) add(rule.id, 'name', 'Name is required')
    if (rule.entryIds.length === 0)
      add(rule.id, 'entryIds', 'Select at least one SLA Master entry')
    rule.conditions.forEach((c) => {
      if (!c.fieldId)
        add(rule.id, 'conditions', 'Select a field for each condition')
      else if (!OPERATOR_IDS.has(c.logic))
        add(rule.id, 'conditions', 'Select an operator')
      else if (conditionNeedsValue(c.logic) && !c.value.trim())
        add(rule.id, 'conditions', 'Enter a value for each condition')
    })
    if (rule.reminderMinutes !== null && rule.reminderMinutes < 0)
      add(rule.id, 'reminderMinutes', 'Enter zero or more minutes')
    const action = rule.breachAction
    if (action.type === 'reassign' && !mapping.escalationUsers)
      add(rule.id, 'breachAction', 'Map the Escalate field to reassign')
    if (action.type === 'stage') {
      if (!action.stageId) add(rule.id, 'breachAction', 'Select a stage')
      else if (validStageIds && !validStageIds.includes(action.stageId))
        add(rule.id, 'breachAction', 'This stage is no longer in the workflow')
    }
  })
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
  const stageIds = nodes
    .filter((n) => isSlaEscalationTarget(n.data))
    .map((n) => n.id)
  const globalError = firstSlaError(
    validateSlaSettings(workflowSla, 'workflow', stageIds),
  )
  if (globalError) return { message: `Workflow SLA: ${globalError}` }

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
