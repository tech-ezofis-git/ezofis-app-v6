import type { LogicRule, Question } from '../store/formStore'

export interface DeclarativeRule {
  actions: RuleAction[]
  conditions: RuleCondition[]
  id: string
  elseActions?: RuleAction[]
  groupLogic?: 'ALL' | 'ANY'
  isConditionalRule?: boolean
  name?: string
}

export interface FieldComputedState {
  disabled: boolean
  required: boolean
  visible: boolean
}

export interface RuleAction {
  targetFieldId: string
  type:
    | 'SET_ENABLED'
    | 'ENABLE_FIELD'
    | 'DISABLE_FIELD'
    | 'SET_VISIBLE'
    | 'SET_REQUIRED'
    | 'SHOW'
    | 'HIDE'
  targetFieldIds?: string[]
  value?: boolean
}

export interface RuleCondition {
  fieldId: string
  operator:
    | 'EQUALS'
    | 'NOT_EQUALS'
    | 'GREATER_THAN'
    | 'LESS_THAN'
    | 'CONTAINS'
    | 'NOT_CONTAINS'
    | 'IS_EMPTY'
    | 'IS_NOT_EMPTY'
    | 'IN'
    | 'IS_ANY_OF'
    | 'IS_NOT_ANY_OF'
    | 'STARTS_WITH'
    | 'NOT_STARTS_WITH'
    | 'ENDS_WITH'
    | 'NOT_ENDS_WITH'
  id?: string
  value?: any
}

export const OPERATORS = {
  CONTAINS: (fieldVal: any, targetVal: any) =>
    Array.isArray(fieldVal)
      ? fieldVal.includes(targetVal)
      : String(fieldVal ?? '')
          .toLowerCase()
          .includes(String(targetVal ?? '').toLowerCase()),
  ENDS_WITH: (fieldVal: any, targetVal: any) =>
    String(fieldVal ?? '')
      .toLowerCase()
      .endsWith(String(targetVal ?? '').toLowerCase()),
  EQUALS: (fieldVal: any, targetVal: any) => {
    if (
      typeof fieldVal === 'number' ||
      (!isNaN(Number(fieldVal)) &&
        fieldVal !== '' &&
        fieldVal !== null &&
        !isNaN(Number(targetVal)) &&
        targetVal !== '' &&
        targetVal !== null)
    ) {
      return Number(fieldVal) === Number(targetVal)
    }
    return String(fieldVal ?? '').trim() === String(targetVal ?? '').trim()
  },
  GREATER_THAN: (fieldVal: any, targetVal: any) =>
    Number(fieldVal) > Number(targetVal),
  IN: (fieldVal: any, targetVal: any) =>
    Array.isArray(targetVal) && targetVal.includes(fieldVal),
  IS_ANY_OF: (fieldVal: any, targetVal: any) => {
    const list = Array.isArray(targetVal)
      ? targetVal
      : String(targetVal ?? '')
          .split(',')
          .map((v) => v.trim())
    return list
      .map((v) => String(v).toLowerCase())
      .includes(String(fieldVal ?? '').toLowerCase())
  },
  IS_EMPTY: (fieldVal: any) =>
    fieldVal === undefined ||
    fieldVal === null ||
    fieldVal === '' ||
    (Array.isArray(fieldVal) && fieldVal.length === 0),
  IS_NOT_ANY_OF: (fieldVal: any, targetVal: any) =>
    !OPERATORS.IS_ANY_OF(fieldVal, targetVal),
  IS_NOT_EMPTY: (fieldVal: any) => !OPERATORS.IS_EMPTY(fieldVal),
  LESS_THAN: (fieldVal: any, targetVal: any) =>
    Number(fieldVal) < Number(targetVal),
  NOT_CONTAINS: (fieldVal: any, targetVal: any) =>
    !OPERATORS.CONTAINS(fieldVal, targetVal),
  NOT_ENDS_WITH: (fieldVal: any, targetVal: any) =>
    !OPERATORS.ENDS_WITH(fieldVal, targetVal),
  NOT_EQUALS: (fieldVal: any, targetVal: any) =>
    !OPERATORS.EQUALS(fieldVal, targetVal),
  NOT_STARTS_WITH: (fieldVal: any, targetVal: any) =>
    !OPERATORS.STARTS_WITH(fieldVal, targetVal),
  STARTS_WITH: (fieldVal: any, targetVal: any) =>
    String(fieldVal ?? '')
      .toLowerCase()
      .startsWith(String(targetVal ?? '').toLowerCase()),
}

export class FormRuleEngine {
  fields: Question[]
  rules: DeclarativeRule[]
  dependencyMap: Map<string, Set<string>> // fieldId -> Set(ruleIds)

  constructor(fields: Question[] = [], rules: DeclarativeRule[] = []) {
    this.fields = fields
    this.rules = rules
    this.dependencyMap = new Map()
    this.buildDependencyGraph()
  }

  buildDependencyGraph() {
    this.dependencyMap.clear()
    for (const rule of this.rules) {
      if (!rule.conditions) continue
      for (const cond of rule.conditions) {
        if (!this.dependencyMap.has(cond.fieldId)) {
          this.dependencyMap.set(cond.fieldId, new Set())
        }
        this.dependencyMap.get(cond.fieldId)!.add(rule.id)
      }
    }
    for (const field of this.fields) {
      const v = field.settings?.validation
      if (
        v?.mandatorySettings?.length ||
        v?.readonlySettings?.length ||
        v?.enableSettings?.length
      ) {
        if (!this.dependencyMap.has(field.id)) {
          this.dependencyMap.set(field.id, new Set())
        }
        this.dependencyMap.get(field.id)!.add(`validation-rules-${field.id}`)
      }
    }
  }

  evaluateAll(
    formValues: Record<string, any>,
  ): Record<string, FieldComputedState> {
    const fieldStates: Record<string, FieldComputedState> = {}

    for (const field of this.fields) {
      const fAny = field as any
      const isHiddenByDefault =
        Boolean(field.settings?.general?.hidden) ||
        field.settings?.general?.visibility === 'HIDDEN' ||
        fAny.hidden === true

      const isReadOnlyByDefault =
        field.type === 'CALCULATED' ||
        Boolean(field.settings?.general?.readOnly) ||
        field.settings?.general?.visibility === 'READ_ONLY' ||
        fAny.readOnly === true ||
        fAny.disabled === true

      const isRequiredByDefault =
        field.settings?.validation?.fieldRule === 'REQUIRED' ||
        Boolean(fAny.isRequired || fAny.required || fAny.isMandatory)

      fieldStates[field.id] = {
        disabled: isReadOnlyByDefault,
        required: isRequiredByDefault,
        visible: !isHiddenByDefault,
      }
    }

    // Process declarative rules
    for (const rule of this.rules) {
      const isMet = evaluateDeclarativeRule(rule, formValues)
      const activeActions = isMet ? rule.actions : rule.elseActions || []

      if (activeActions) {
        for (const action of activeActions) {
          this.applyAction(action, fieldStates)
        }
      }
    }

    // Process per-field settings.logic rules
    for (const field of this.fields) {
      const fieldRules: LogicRule[] = field.settings?.logic || []
      if (!fieldRules.length) continue

      // Rules on one field are combined (OR) per axis instead of the last
      // rule overwriting the earlier ones. SHOW / ENABLE / REQUIRE take
      // priority: HIDE / DISABLE are ignored when the same field also has
      // a positive rule for that axis.
      const metOf = (action: LogicRule['action']) => {
        const list = fieldRules.filter((r) => r.action === action)
        return {
          any: list.some((r) => evaluateCondition(r, formValues)),
          has: list.length > 0,
        }
      }
      const show = metOf('SHOW')
      const hide = metOf('HIDE')
      const enable = metOf('ENABLE')
      const disable = metOf('DISABLE')
      const require = metOf('REQUIRE')
      const state = fieldStates[field.id]

      if (show.has) state.visible = show.any
      else if (hide.has) state.visible = !hide.any

      if (enable.has) state.disabled = !enable.any
      else if (disable.has) state.disabled = disable.any

      if (require.has) state.required = state.required || require.any
    }

    // Process source-driven validation conditional rules (mandatorySettings, readonlySettings)
    for (const field of this.fields) {
      const valSettings = field.settings?.validation
      if (!valSettings) continue
      const rawVal = formValues[field.id]
      const currentValStr = String(rawVal ?? '').trim()

      // 1. mandatorySettings: [{ id, value, controls }]
      const mandatoryRules = valSettings.mandatorySettings || []
      for (const rule of mandatoryRules) {
        if (!rule.controls || !rule.controls.length) continue
        const ruleValStr = String(rule.value ?? '').trim()
        const isMatched =
          currentValStr !== '' &&
          currentValStr.toLowerCase() === ruleValStr.toLowerCase()
        if (isMatched) {
          for (const targetId of rule.controls) {
            if (fieldStates[targetId]) {
              fieldStates[targetId].required = true
            }
          }
        }
      }

      // 2. readonlySettings: [{ id, value, controls, notEqual }]
      const readonlyRules = valSettings.readonlySettings || []
      for (const rule of readonlyRules) {
        if (!rule.controls || !rule.controls.length) continue
        const ruleValStr = String(rule.value ?? '').trim()
        const isValueMatch =
          currentValStr.toLowerCase() === ruleValStr.toLowerCase()
        const shouldLock = rule.notEqual
          ? !isValueMatch
          : currentValStr !== '' && isValueMatch
        if (shouldLock) {
          for (const targetId of rule.controls) {
            if (fieldStates[targetId]) {
              fieldStates[targetId].disabled = true
            }
          }
        }
      }

      // 3. enableSettings: [{ id, value, controls }] (Show target controls when value matches)
      const enableRules = valSettings.enableSettings || []
      for (const rule of enableRules) {
        if (!rule.controls || !rule.controls.length) continue
        const ruleValStr = String(rule.value ?? '').trim()
        const isMatched =
          currentValStr !== '' &&
          currentValStr.toLowerCase() === ruleValStr.toLowerCase()
        for (const targetId of rule.controls) {
          if (fieldStates[targetId]) {
            fieldStates[targetId].visible = isMatched
          }
        }
      }
    }

    return fieldStates
  }

  applyAction(
    action: RuleAction,
    fieldStates: Record<string, FieldComputedState>,
  ) {
    const targetIds =
      action.targetFieldIds ||
      (action.targetFieldId ? [action.targetFieldId] : [])

    for (const targetId of targetIds) {
      if (!fieldStates[targetId]) continue

      switch (action.type) {
        case 'SET_ENABLED':
          fieldStates[targetId].disabled = !action.value
          break
        case 'ENABLE_FIELD':
          fieldStates[targetId].disabled = false
          break
        case 'DISABLE_FIELD':
          fieldStates[targetId].disabled = true
          break
        case 'SET_VISIBLE':
        case 'SHOW':
          fieldStates[targetId].visible = action.value !== false
          break
        case 'HIDE':
          fieldStates[targetId].visible = false
          break
        case 'SET_REQUIRED':
          fieldStates[targetId].required = !!action.value
          break
      }
    }
  }
}

export function evaluateCondition(
  condition: RuleCondition | LogicRule,
  formValues: Record<string, any>,
): boolean {
  if ('condition' in condition) {
    // Legacy / Builder LogicRule
    const rule = condition as LogicRule
    const fieldValue = formValues[rule.fieldId]
    switch (rule.condition) {
      case 'IS':
        return OPERATORS.EQUALS(fieldValue, rule.value)
      case 'IS_NOT':
        return OPERATORS.NOT_EQUALS(fieldValue, rule.value)
      case 'CONTAINS':
        return OPERATORS.CONTAINS(fieldValue, rule.value)
      case 'NOT_CONTAINS':
        return OPERATORS.NOT_CONTAINS(fieldValue, rule.value)
      case 'GT':
        return OPERATORS.GREATER_THAN(fieldValue, rule.value)
      case 'LT':
        return OPERATORS.LESS_THAN(fieldValue, rule.value)
      case 'EMPTY':
        return OPERATORS.IS_EMPTY(fieldValue)
      case 'NOT_EMPTY':
        return OPERATORS.IS_NOT_EMPTY(fieldValue)
      default:
        return true
    }
  }

  // Declarative RuleCondition
  const cond = condition as RuleCondition
  const fieldValue = formValues[cond.fieldId]
  const evaluator = OPERATORS[cond.operator]

  if (!evaluator) {
    console.warn(`Unsupported operator: ${cond.operator}`)
    return false
  }

  return evaluator(fieldValue, cond.value)
}

export function evaluateDeclarativeRule(
  rule: DeclarativeRule,
  formValues: Record<string, any>,
): boolean {
  if (!rule.conditions || rule.conditions.length === 0) return true

  const results = rule.conditions.map((cond) =>
    evaluateCondition(cond, formValues),
  )

  if (rule.groupLogic === 'ANY') {
    return results.some(Boolean)
  }

  return results.every(Boolean)
}

/**
 * Utility helper to evaluate form rules dynamically for a set of panels and current formModel.
 */
export function evaluateFormRules(
  panels: any[],
  formModel: Record<string, any>,
  declarativeRules: DeclarativeRule[] = [],
): Record<string, FieldComputedState> {
  const allFields: Question[] = (panels || []).flatMap((p) => p.fields || [])
  const engine = new FormRuleEngine(allFields, declarativeRules)
  return engine.evaluateAll(formModel)
}
