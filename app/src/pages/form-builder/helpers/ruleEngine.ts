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
  IS_EMPTY: (fieldVal: any) =>
    fieldVal === undefined ||
    fieldVal === null ||
    fieldVal === '' ||
    (Array.isArray(fieldVal) && fieldVal.length === 0),
  IS_NOT_EMPTY: (fieldVal: any) => !OPERATORS.IS_EMPTY(fieldVal),
  LESS_THAN: (fieldVal: any, targetVal: any) =>
    Number(fieldVal) < Number(targetVal),
  NOT_CONTAINS: (fieldVal: any, targetVal: any) =>
    !OPERATORS.CONTAINS(fieldVal, targetVal),
  NOT_EQUALS: (fieldVal: any, targetVal: any) =>
    !OPERATORS.EQUALS(fieldVal, targetVal),
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

      for (const rule of fieldRules) {
        const isMet = evaluateCondition(rule, formValues)
        switch (rule.action) {
          case 'SHOW':
            fieldStates[field.id].visible = isMet
            break
          case 'HIDE':
            fieldStates[field.id].visible = !isMet
            break
          case 'ENABLE':
            fieldStates[field.id].disabled = !isMet
            break
          case 'DISABLE':
            fieldStates[field.id].disabled = isMet
            break
          case 'REQUIRE':
            fieldStates[field.id].required = isMet
            break
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
