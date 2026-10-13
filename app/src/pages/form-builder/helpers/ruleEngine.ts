/* eslint-disable @typescript-eslint/no-explicit-any */
import type { LogicRule, Question } from '../store/formStore'

export interface DeclarativeRule {
  actions: RuleAction[]
  conditions: RuleCondition[]
  id: string
  elseActions?: RuleAction[]
  groupLogic?: 'ALL' | 'ANY' | 'AND' | 'OR'
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
  closeParen?: boolean | number
  condition?: 'AND' | 'OR' | string
  conditions?: any[]
  conditionType?: 'AND' | 'OR' | 'ALL' | 'ANY'
  field?: string
  fieldId?: string
  fieldValue?: boolean
  groupLogic?: 'ALL' | 'ANY' | 'AND' | 'OR'
  id?: string
  logic?: string
  logicalOperator?: 'AND' | 'OR'
  name?: string
  openParen?: boolean | number
  operator?: RuleOperatorName | string
  type?: string
  value?: any
}

export type RuleOperatorName =
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'GREATER_THAN'
  | 'GREATER_THAN_OR_EQUAL'
  | 'LESS_THAN'
  | 'LESS_THAN_OR_EQUAL'
  | 'CONTAINS'
  | 'NOT_CONTAINS'
  | 'IS_EMPTY'
  | 'IS_NOT_EMPTY'
  | 'IN'
  | 'NOT_IN'
  | 'IS_ANY_OF'
  | 'IS_NOT_ANY_OF'
  | 'STARTS_WITH'
  | 'NOT_STARTS_WITH'
  | 'ENDS_WITH'
  | 'NOT_ENDS_WITH'
  | 'DATE_RANGE'
  | 'IS_EQUALS_TO'
  | 'IS_NOT_EQUALS_TO'
  | 'IS_GREATER_THAN'
  | 'IS_GREATER_THAN_OR_EQUALS_TO'
  | 'IS_LESSER_THAN'
  | 'IS_LESSER_THAN_OR_EQUALS_TO'
  | '='
  | '=='
  | '==='
  | '!='
  | '!=='
  | '<>'
  | '>'
  | '>='
  | '<'
  | '<='
  | '{}'
  | '!{}'

function evaluateDateRange(fieldVal: any, targetVal: any): boolean {
  const rawDate = unwrapComparableScalar(fieldVal)
  if (
    rawDate === null ||
    rawDate === undefined ||
    String(rawDate).trim() === ''
  )
    return false
  const fieldTs = Date.parse(String(rawDate).trim())
  if (Number.isNaN(fieldTs)) return false

  let startRaw: any
  let endRaw: any
  if (Array.isArray(targetVal)) {
    ;[startRaw, endRaw] = targetVal
  } else if (targetVal && typeof targetVal === 'object') {
    startRaw = targetVal.from ?? targetVal.start ?? targetVal.min
    endRaw = targetVal.to ?? targetVal.end ?? targetVal.max
  } else if (typeof targetVal === 'string') {
    const parts = targetVal.includes(' to ')
      ? targetVal.split(' to ')
      : targetVal.split(',')
    startRaw = parts[0]
    endRaw = parts[1]
  }

  const startTs = startRaw ? Date.parse(String(startRaw).trim()) : Number.NaN
  const endTs = endRaw ? Date.parse(String(endRaw).trim()) : Number.NaN

  if (!Number.isNaN(startTs) && !Number.isNaN(endTs)) {
    return fieldTs >= startTs && fieldTs <= endTs
  }
  if (!Number.isNaN(startTs)) return fieldTs >= startTs
  if (!Number.isNaN(endTs)) return fieldTs <= endTs
  return false
}

function isStructuredValueEmpty(val: Record<string, any>): boolean {
  if ('phoneNo' in val) {
    return (
      val.phoneNo === undefined ||
      val.phoneNo === null ||
      String(val.phoneNo).trim() === ''
    )
  }
  if ('currency' in val && 'value' in val) {
    return (
      val.value === undefined ||
      val.value === null ||
      String(val.value).trim() === ''
    )
  }
  if ('value' in val && Object.keys(val).length <= 3) {
    return (
      val.value === undefined ||
      val.value === null ||
      String(val.value).trim() === ''
    )
  }
  return Object.keys(val).length === 0
}

function parseComparableNumber(val: any): number | null {
  const unwrapped = unwrapComparableScalar(val)
  if (
    unwrapped === null ||
    unwrapped === undefined ||
    unwrapped === '' ||
    typeof unwrapped === 'boolean' ||
    Array.isArray(unwrapped)
  ) {
    return null
  }
  if (typeof unwrapped === 'number') {
    return Number.isFinite(unwrapped) ? unwrapped : null
  }
  if (typeof unwrapped === 'string') {
    const trimmed = unwrapped.trim()
    if (!trimmed) return null
    const num = Number(trimmed)
    if (Number.isFinite(num)) return num
    // Check ISO-like date string (e.g. YYYY-MM-DD) for date relational comparisons
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      const ts = Date.parse(trimmed)
      if (!Number.isNaN(ts)) return ts
    }
  }
  return null
}

function parseComparableNumbers(
  left: any,
  right: any,
): { a: number; b: number } | null {
  const aUnwrapped = unwrapComparableScalar(left)
  const bUnwrapped = unwrapComparableScalar(right)

  // If both look like date strings, compare timestamps
  if (
    typeof aUnwrapped === 'string' &&
    typeof bUnwrapped === 'string' &&
    /^\d{4}-\d{2}-\d{2}/.test(aUnwrapped.trim()) &&
    /^\d{4}-\d{2}-\d{2}/.test(bUnwrapped.trim())
  ) {
    const tsA = Date.parse(aUnwrapped.trim())
    const tsB = Date.parse(bUnwrapped.trim())
    if (!Number.isNaN(tsA) && !Number.isNaN(tsB)) {
      return { a: tsA, b: tsB }
    }
  }

  const a = parseComparableNumber(aUnwrapped)
  const b = parseComparableNumber(bUnwrapped)
  if (a === null || b === null) return null
  return { a, b }
}

function scalarEquals(
  fieldVal: any,
  targetVal: any,
  caseInsensitive = false,
): boolean {
  if (Array.isArray(fieldVal)) {
    if (Array.isArray(targetVal)) {
      if (fieldVal.length !== targetVal.length) return false
      return fieldVal.every((item, idx) =>
        scalarEquals(item, targetVal[idx], caseInsensitive),
      )
    }
    return fieldVal.some((item) =>
      scalarEquals(item, targetVal, caseInsensitive),
    )
  }

  if (
    fieldVal &&
    typeof fieldVal === 'object' &&
    'currency' in fieldVal &&
    'value' in fieldVal
  ) {
    if (
      typeof targetVal === 'string' &&
      /^[A-Za-z]{3}$/.test(targetVal.trim()) &&
      String(fieldVal.currency ?? '')
        .trim()
        .toLowerCase() === targetVal.trim().toLowerCase()
    ) {
      return true
    }
  }

  if (fieldVal && typeof fieldVal === 'object' && 'phoneNo' in fieldVal) {
    const phoneNo = String(fieldVal.phoneNo ?? '').trim()
    const code = String(fieldVal.code ?? '').trim()
    const targetStr = String(unwrapComparableScalar(targetVal) ?? '').trim()
    if (!phoneNo && !targetStr) return true
    if (
      phoneNo === targetStr ||
      `${code}${phoneNo}` === targetStr ||
      `${code} ${phoneNo}`.trim() === targetStr
    ) {
      return true
    }
  }

  const left = unwrapComparableScalar(fieldVal)
  const right = unwrapComparableScalar(targetVal)

  if (typeof left === 'boolean' || typeof right === 'boolean') {
    const leftBool =
      typeof left === 'boolean'
        ? left
        : String(left ?? '')
            .trim()
            .toLowerCase() === 'true'
    const rightBool =
      typeof right === 'boolean'
        ? right
        : String(right ?? '')
            .trim()
            .toLowerCase() === 'true'
    if (
      String(left ?? '')
        .trim()
        .toLowerCase() === 'true' ||
      String(left ?? '')
        .trim()
        .toLowerCase() === 'false' ||
      typeof left === 'boolean'
    ) {
      if (
        String(right ?? '')
          .trim()
          .toLowerCase() === 'true' ||
        String(right ?? '')
          .trim()
          .toLowerCase() === 'false' ||
        typeof right === 'boolean'
      ) {
        return leftBool === rightBool
      }
    }
  }

  const nums = parseComparableNumbers(left, right)
  if (nums !== null) {
    return nums.a === nums.b
  }

  const leftStr = String(left ?? '').trim()
  const rightStr = String(right ?? '').trim()
  if (caseInsensitive) {
    return leftStr.toLowerCase() === rightStr.toLowerCase()
  }
  return leftStr === rightStr
}

function unwrapComparableScalar(val: any): any {
  if (val === null || val === undefined) return val
  if (typeof val !== 'object' || Array.isArray(val)) return val
  if ('currency' in val && 'value' in val) return val.value
  if ('phoneNo' in val) return val.phoneNo
  if ('value' in val) return val.value
  if ('label' in val) return val.label
  return val
}

export const OPERATORS: Record<
  string,
  (fieldVal: any, targetVal?: any) => boolean
> = {
  CONTAINS: (fieldVal: any, targetVal: any) => {
    if (OPERATORS.IS_EMPTY(fieldVal)) return false
    if (Array.isArray(fieldVal)) {
      return fieldVal.some((item) => scalarEquals(item, targetVal, true))
    }
    const left = String(unwrapComparableScalar(fieldVal) ?? '').toLowerCase()
    const right = String(unwrapComparableScalar(targetVal) ?? '').toLowerCase()
    if (!right) return false
    return left.includes(right)
  },
  DATE_RANGE: (fieldVal: any, targetVal: any) =>
    evaluateDateRange(fieldVal, targetVal),
  ENDS_WITH: (fieldVal: any, targetVal: any) => {
    if (OPERATORS.IS_EMPTY(fieldVal)) return false
    const left = String(unwrapComparableScalar(fieldVal) ?? '').toLowerCase()
    const right = String(unwrapComparableScalar(targetVal) ?? '').toLowerCase()
    if (!right) return false
    return left.endsWith(right)
  },
  EQUALS: (fieldVal: any, targetVal: any) =>
    scalarEquals(fieldVal, targetVal, false),
  GREATER_THAN: (fieldVal: any, targetVal: any) => {
    const nums = parseComparableNumbers(fieldVal, targetVal)
    return nums !== null && nums.a > nums.b
  },
  GREATER_THAN_OR_EQUAL: (fieldVal: any, targetVal: any) => {
    const nums = parseComparableNumbers(fieldVal, targetVal)
    return nums !== null && nums.a >= nums.b
  },
  IN: (fieldVal: any, targetVal: any) =>
    OPERATORS.IS_ANY_OF(fieldVal, targetVal),
  IS_ANY_OF: (fieldVal: any, targetVal: any) => {
    if (OPERATORS.IS_EMPTY(fieldVal)) return false
    const list = Array.isArray(targetVal)
      ? targetVal
      : String(targetVal ?? '')
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean)
    if (list.length === 0) return false
    if (Array.isArray(fieldVal)) {
      return fieldVal.some((fv) =>
        list.some((tv) => scalarEquals(fv, tv, true)),
      )
    }
    return list.some((tv) => scalarEquals(fieldVal, tv, true))
  },
  IS_EMPTY: (fieldVal: any) => {
    if (fieldVal === undefined || fieldVal === null) return true
    if (typeof fieldVal === 'string') return fieldVal.trim() === ''
    if (Array.isArray(fieldVal)) return fieldVal.length === 0
    if (typeof fieldVal === 'object') return isStructuredValueEmpty(fieldVal)
    return false
  },
  IS_NOT_ANY_OF: (fieldVal: any, targetVal: any) =>
    !OPERATORS.IS_ANY_OF(fieldVal, targetVal),
  IS_NOT_EMPTY: (fieldVal: any) => !OPERATORS.IS_EMPTY(fieldVal),
  LESS_THAN: (fieldVal: any, targetVal: any) => {
    const nums = parseComparableNumbers(fieldVal, targetVal)
    return nums !== null && nums.a < nums.b
  },
  LESS_THAN_OR_EQUAL: (fieldVal: any, targetVal: any) => {
    const nums = parseComparableNumbers(fieldVal, targetVal)
    return nums !== null && nums.a <= nums.b
  },
  NOT_CONTAINS: (fieldVal: any, targetVal: any) =>
    !OPERATORS.CONTAINS(fieldVal, targetVal),
  NOT_ENDS_WITH: (fieldVal: any, targetVal: any) =>
    !OPERATORS.ENDS_WITH(fieldVal, targetVal),
  NOT_EQUALS: (fieldVal: any, targetVal: any) =>
    !OPERATORS.EQUALS(fieldVal, targetVal),
  NOT_IN: (fieldVal: any, targetVal: any) =>
    !OPERATORS.IS_ANY_OF(fieldVal, targetVal),
  NOT_STARTS_WITH: (fieldVal: any, targetVal: any) =>
    !OPERATORS.STARTS_WITH(fieldVal, targetVal),
  STARTS_WITH: (fieldVal: any, targetVal: any) => {
    if (OPERATORS.IS_EMPTY(fieldVal)) return false
    const left = String(unwrapComparableScalar(fieldVal) ?? '').toLowerCase()
    const right = String(unwrapComparableScalar(targetVal) ?? '').toLowerCase()
    if (!right) return false
    return left.startsWith(right)
  },
}

// Register V5 operator aliases and symbolic operators
const OPERATOR_ALIASES: Record<string, string> = {
  '!=': 'NOT_EQUALS',
  '!==': 'NOT_EQUALS',
  '!{}': 'IS_NOT_EMPTY',
  '<': 'LESS_THAN',
  '<=': 'LESS_THAN_OR_EQUAL',
  '<>': 'NOT_EQUALS',
  '=': 'EQUALS',
  '==': 'EQUALS',
  '===': 'EQUALS',
  '>': 'GREATER_THAN',
  '>=': 'GREATER_THAN_OR_EQUAL',
  'EMPTY': 'IS_EMPTY',
  'EQUAL': 'EQUALS',
  'EQUAL_TO': 'EQUALS',
  'GT': 'GREATER_THAN',
  'GTE': 'GREATER_THAN_OR_EQUAL',
  'IS': 'EQUALS',
  'IS_EMPTY ({})': 'IS_EMPTY',
  'IS_EMPTY_BRACES': 'IS_EMPTY',
  'IS_EQUALS_TO': 'EQUALS',
  'IS_EQUALS_TO (=)': 'EQUALS',
  'IS_GREATER_THAN': 'GREATER_THAN',
  'IS_GREATER_THAN (>)': 'GREATER_THAN',
  'IS_GREATER_THAN_OR_EQUALS_TO': 'GREATER_THAN_OR_EQUAL',
  'IS_GREATER_THAN_OR_EQUALS_TO (>=)': 'GREATER_THAN_OR_EQUAL',
  'IS_LESS_THAN': 'LESS_THAN',
  'IS_LESS_THAN (<)': 'LESS_THAN',
  'IS_LESS_THAN_OR_EQUALS_TO': 'LESS_THAN_OR_EQUAL',
  'IS_LESS_THAN_OR_EQUALS_TO (<=)': 'LESS_THAN_OR_EQUAL',
  'IS_LESSER_THAN': 'LESS_THAN',
  'IS_LESSER_THAN (<)': 'LESS_THAN',
  'IS_LESSER_THAN_OR_EQUALS_TO': 'LESS_THAN_OR_EQUAL',
  'IS_LESSER_THAN_OR_EQUALS_TO (<=)': 'LESS_THAN_OR_EQUAL',
  'IS_NOT': 'NOT_EQUALS',
  'IS_NOT_EMPTY (!{})': 'IS_NOT_EMPTY',
  'IS_NOT_EQUALS_TO': 'NOT_EQUALS',
  'IS_NOT_EQUALS_TO (!=)': 'NOT_EQUALS',
  'LT': 'LESS_THAN',
  'LTE': 'LESS_THAN_OR_EQUAL',
  'NOT_EMPTY': 'IS_NOT_EMPTY',
  'NOT_EQUAL': 'NOT_EQUALS',
  'NOT_EQUAL_TO': 'NOT_EQUALS',
  '{}': 'IS_EMPTY',
}

for (const [alias, target] of Object.entries(OPERATOR_ALIASES)) {
  OPERATORS[alias] = OPERATORS[target]
}

type BoolToken =
  | { type: 'AND' | 'OR' | 'LPAREN' | 'RPAREN' }
  | { type: 'VAL'; value: boolean }

export class FormRuleEngine {
  fields: Question[]
  panels: any[]
  rules: DeclarativeRule[]
  dependencyMap: Map<string, Set<string>> // fieldId -> Set(ruleIds)
  aliasMap: Map<string, string>

  constructor(
    fields: Question[] = [],
    rules: DeclarativeRule[] = [],
    panels: any[] = [],
  ) {
    this.fields = fields
    this.panels = panels
    this.rules = rules
    this.dependencyMap = new Map()
    this.aliasMap = buildFieldAliasMap(fields)
    this.buildDependencyGraph()
  }

  resolveTargetId(rawId: string): string {
    return this.aliasMap.get(rawId) || rawId
  }

  buildDependencyGraph() {
    this.dependencyMap.clear()
    for (const rule of this.rules) {
      if (!rule.conditions) continue
      for (const cond of rule.conditions) {
        const fid = this.resolveTargetId(
          cond.fieldId || cond.field || cond.name || '',
        )
        if (!fid) continue
        if (!this.dependencyMap.has(fid)) {
          this.dependencyMap.set(fid, new Set())
        }
        this.dependencyMap.get(fid)!.add(rule.id)
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
    const fieldPanelMap = new Map<
      string,
      { panelId: string; panelIndex: number }
    >()

    // Initialize panel states if panels were provided
    this.panels.forEach((panel, panelIndex) => {
      if (!panel?.id) return
      const isHiddenPanel =
        Boolean(panel.settings?.hidden) ||
        panel.settings?.visibility === 'HIDDEN' ||
        panel.hidden === true
      fieldStates[panel.id] = {
        disabled: Boolean(panel.settings?.readOnly || panel.disabled),
        required: false,
        visible: panelIndex === 0 ? true : !isHiddenPanel,
      }
      for (const f of panel.fields || []) {
        if (f?.id) {
          fieldPanelMap.set(f.id, { panelId: panel.id, panelIndex })
        }
      }
    })

    // Collect all source rule owners (fields + table columns)
    const allControlSources: Array<{
      id: string
      parentFieldId?: string
      validation?: Record<string, any>
    }> = []

    for (const field of this.fields) {
      const fAny = field as any
      const isHiddenByDefault =
        Boolean(field.settings?.general?.hidden) ||
        field.settings?.general?.visibility === 'HIDDEN' ||
        fAny.hidden === true

      const isReadOnlyByDefault =
        field.type === 'CALCULATED' ||
        Boolean(field.settings?.general?.readOnly) ||
        Boolean((field.settings?.specific as any)?.isReadOnly) ||
        Boolean((field.settings?.validation as any)?.readonlySettings?.isReadOnly) ||
        Boolean((field.settings?.validation as any)?.readonlySettings?.state) ||
        field.settings?.general?.visibility === 'READ_ONLY' ||
        field.settings?.general?.visibility === 'DISABLE' ||
        fAny.readOnly === true ||
        fAny.disabled === true

      const isRequiredByDefault =
        field.settings?.validation?.fieldRule === 'REQUIRED' ||
        String(field.settings?.validation?.fieldRule) === 'MANDATORY' ||
        Boolean(fAny.isRequired || fAny.required || fAny.isMandatory)

      fieldStates[field.id] = {
        disabled: isReadOnlyByDefault,
        required: isRequiredByDefault,
        visible: !isHiddenByDefault,
      }

      if (field.settings?.validation) {
        allControlSources.push({
          id: field.id,
          validation: field.settings.validation,
        })
      }

      // Initialize table column states as well
      const tableCols = field.settings?.specific?.tableColumns || []
      for (const col of tableCols) {
        if (!col?.id) continue
        const cAny = col as any
        const colHidden =
          Boolean(cAny.settings?.general?.hidden) ||
          cAny.settings?.general?.visibility === 'HIDDEN' ||
          cAny.hidden === true
        const colReadOnly =
          col.type === 'CALCULATED' ||
          Boolean(cAny.settings?.general?.readOnly) ||
          cAny.settings?.general?.visibility === 'READ_ONLY' ||
          cAny.settings?.general?.visibility === 'DISABLE' ||
          cAny.readOnly === true ||
          cAny.disabled === true
        const colRequired =
          cAny.settings?.validation?.fieldRule === 'REQUIRED' ||
          cAny.settings?.validation?.fieldRule === 'MANDATORY' ||
          Boolean(cAny.isRequired || cAny.required || cAny.isMandatory)

        fieldStates[col.id] = {
          disabled: colReadOnly,
          required: colRequired,
          visible: !colHidden,
        }

        if (cAny.settings?.validation) {
          allControlSources.push({
            id: col.id,
            parentFieldId: field.id,
            validation: cAny.settings.validation,
          })
        }
      }
    }

    // V5 enableSettings default-hidden semantics:
    // Any control referenced in any `enableSettings[].controls` starts hidden (except panel index 0),
    // and becomes visible if at least one active/visible parent rule matches.
    const enableControlledIds = new Set<string>()
    for (const src of allControlSources) {
      const rawEnable = src.validation?.enableSettings
      const enableRules = Array.isArray(rawEnable) ? rawEnable : []
      for (const rule of enableRules) {
        if (!Array.isArray(rule?.controls)) continue
        for (const rawTargetId of rule.controls) {
          const targetId = this.resolveTargetId(rawTargetId)
          if (!targetId) continue
          // Panel 0 in V5 is never hidden by enableSettings
          if (this.panels[0]?.id && targetId === this.panels[0].id) continue
          enableControlledIds.add(targetId)
        }
      }
      if (
        rawEnable &&
        !Array.isArray(rawEnable) &&
        typeof rawEnable === 'object' &&
        rawEnable.enable &&
        Array.isArray(rawEnable.conditions) &&
        rawEnable.conditions.length > 0
      ) {
        const targetId = this.resolveTargetId(src.id)
        if (targetId && (!this.panels[0]?.id || targetId !== this.panels[0].id)) {
          enableControlledIds.add(targetId)
        }
      }
    }

    // Compute cascading visibility via fixed-point iteration so that hidden fields
    // cannot trigger downstream enableSettings rules.
    const applyBaseVisibility = () => {
      for (const targetId of enableControlledIds) {
        if (fieldStates[targetId]) {
          fieldStates[targetId].visible = false
        }
      }
    }

    const isSourceVisible = (
      sourceId: string,
      parentFieldId?: string,
    ): boolean => {
      if (
        parentFieldId &&
        fieldStates[parentFieldId] &&
        !fieldStates[parentFieldId].visible
      ) {
        return false
      }
      const panelInfo = fieldPanelMap.get(sourceId)
      if (
        panelInfo &&
        panelInfo.panelIndex > 0 &&
        fieldStates[panelInfo.panelId] &&
        !fieldStates[panelInfo.panelId].visible
      ) {
        return false
      }
      return fieldStates[sourceId] ? fieldStates[sourceId].visible : true
    }

    const buildEffectiveValues = (): Record<string, any> => {
      const effective: Record<string, any> = { ...formValues }
      for (const field of this.fields) {
        if (!isSourceVisible(field.id)) {
          effective[field.id] = undefined
          const fAny = field as any
          if (fAny.jsonId) effective[fAny.jsonId] = undefined
          if (fAny.name) effective[fAny.name] = undefined
        }
      }
      return effective
    }

    applyBaseVisibility()

    const maxPasses = Math.max(
      2,
      allControlSources.length + this.rules.length + 1,
    )
    for (let pass = 0; pass < maxPasses; pass += 1) {
      const prevSnapshot = JSON.stringify(
        Object.entries(fieldStates).map(([k, v]) => [k, v.visible]),
      )

      const effectiveValues = buildEffectiveValues()
      applyBaseVisibility()

      // 1. Declarative visibility actions
      for (const rule of this.rules) {
        const isMet = evaluateDeclarativeRule(
          rule,
          effectiveValues,
          this.aliasMap,
        )
        const activeActions = isMet
          ? rule.actions || (rule as any).then || []
          : rule.elseActions || (rule as any).else || []
        if (activeActions) {
          for (const action of activeActions) {
            const aType = String(action.type || action.action || '').toUpperCase()
            if (
              aType === 'SET_VISIBLE' ||
              aType === 'SHOW' ||
              aType === 'HIDE'
            ) {
              this.applyAction(action, fieldStates)
            }
          }
        }
      }

      // 2. Per-field settings.logic visibility actions
      for (const field of this.fields) {
        const fieldRules: LogicRule[] = field.settings?.logic || []
        for (const rule of fieldRules) {
          if (rule.action !== 'SHOW' && rule.action !== 'HIDE') continue
          const isMet = evaluateCondition(rule, effectiveValues, this.aliasMap)
          if (rule.action === 'SHOW') {
            fieldStates[field.id].visible = isMet
          } else if (rule.action === 'HIDE') {
            fieldStates[field.id].visible = !isMet
          }
        }
      }

      // 3. Source-driven and target-driven enableSettings
      for (const src of allControlSources) {
        const rawEnable = src.validation?.enableSettings
        const enableRules = Array.isArray(rawEnable) ? rawEnable : []
        if (enableRules.length > 0 && isSourceVisible(src.id, src.parentFieldId)) {
          for (const rule of enableRules) {
            if (!Array.isArray(rule?.controls) || !rule.controls.length) continue
            const isMatched = evaluateEnableRuleMatch(
              src.id,
              rule,
              effectiveValues,
              this.aliasMap,
            )
            if (isMatched) {
              for (const rawTargetId of rule.controls) {
                const targetId = this.resolveTargetId(rawTargetId)
                if (fieldStates[targetId]) {
                  fieldStates[targetId].visible = true
                }
              }
            }
          }
        }
        if (
          rawEnable &&
          !Array.isArray(rawEnable) &&
          typeof rawEnable === 'object' &&
          rawEnable.enable &&
          Array.isArray(rawEnable.conditions) &&
          rawEnable.conditions.length > 0
        ) {
          const isMatched = evaluateRuleConditions(
            rawEnable.conditions,
            effectiveValues,
            'ALL',
            undefined,
            this.aliasMap,
          )
          const targetId = this.resolveTargetId(src.id)
          if (isMatched && fieldStates[targetId]) {
            fieldStates[targetId].visible = true
          }
        }
      }

      // Propagate hidden panel state to child fields
      for (const [fieldId, panelInfo] of fieldPanelMap.entries()) {
        if (
          panelInfo.panelIndex > 0 &&
          fieldStates[panelInfo.panelId] &&
          !fieldStates[panelInfo.panelId].visible &&
          fieldStates[fieldId]
        ) {
          fieldStates[fieldId].visible = false
        }
      }

      const nextSnapshot = JSON.stringify(
        Object.entries(fieldStates).map(([k, v]) => [k, v.visible]),
      )
      if (prevSnapshot === nextSnapshot) break
    }

    // Final effective values with hidden fields suppressed
    const effectiveValues = buildEffectiveValues()

    // Process non-visibility declarative rules
    for (const rule of this.rules) {
      const isMet = evaluateDeclarativeRule(
        rule,
        effectiveValues,
        this.aliasMap,
      )
      const activeActions = isMet
        ? rule.actions || (rule as any).then || []
        : rule.elseActions || (rule as any).else || []
      if (activeActions) {
        for (const action of activeActions) {
          const aType = String(action.type || action.action || '').toUpperCase()
          if (
            aType !== 'SET_VISIBLE' &&
            aType !== 'SHOW' &&
            aType !== 'HIDE'
          ) {
            this.applyAction(action, fieldStates)
          }
        }
      }
    }

    // Process non-visibility per-field settings.logic rules
    for (const field of this.fields) {
      const fieldRules: LogicRule[] = field.settings?.logic || []
      if (!fieldRules.length) continue

      const state = fieldStates[field.id]
      const result = combineLogicRules(fieldRules, formValues)
      if (result.visible !== undefined) state.visible = result.visible
      if (result.disabled !== undefined) state.disabled = result.disabled
      if (result.required) state.required = true
    }

    // Process source-driven and target-driven mandatorySettings and readonlySettings
    // OR-accumulated across rules so a non-matching rule never overwrites a matching rule.
    for (const src of allControlSources) {
      const valSettings = src.validation
      if (!valSettings) continue

      // Target-driven object-form mandatorySettings: { mandatory: true, conditions: [...] }
      const rawMandatory = valSettings.mandatorySettings
      if (
        rawMandatory &&
        !Array.isArray(rawMandatory) &&
        typeof rawMandatory === 'object' &&
        rawMandatory.mandatory &&
        Array.isArray(rawMandatory.conditions) &&
        rawMandatory.conditions.length > 0
      ) {
        const isMatched = evaluateRuleConditions(
          rawMandatory.conditions,
          effectiveValues,
          'ALL',
          undefined,
          this.aliasMap,
        )
        const targetId = this.resolveTargetId(src.id)
        if (isMatched && fieldStates[targetId]) {
          fieldStates[targetId].required = true
        }
      }

      // Target-driven object-form readonlySettings: { readonly: true, notEqual?: boolean, conditions: [...] }
      const rawReadonly = valSettings.readonlySettings
      if (
        rawReadonly &&
        !Array.isArray(rawReadonly) &&
        typeof rawReadonly === 'object' &&
        rawReadonly.readonly &&
        Array.isArray(rawReadonly.conditions) &&
        rawReadonly.conditions.length > 0
      ) {
        const isValueMatch = evaluateRuleConditions(
          rawReadonly.conditions,
          effectiveValues,
          'ALL',
          undefined,
          this.aliasMap,
        )
        const shouldLock = rawReadonly.notEqual ? !isValueMatch : isValueMatch
        const targetId = this.resolveTargetId(src.id)
        if (shouldLock && fieldStates[targetId]) {
          fieldStates[targetId].disabled = true
        }
      }

      if (!isSourceVisible(src.id, src.parentFieldId)) continue
      const rawVal = resolveValueFromModel(
        src.id,
        effectiveValues,
        this.aliasMap,
      )

      // 1. Source-driven mandatorySettings: [{ id, value, controls }]
      const mandatoryRules = Array.isArray(rawMandatory) ? rawMandatory : []
      for (const rule of mandatoryRules) {
        if (!Array.isArray(rule?.controls) || !rule.controls.length) continue
        const isMatched =
          Array.isArray(rule.conditions) && rule.conditions.length > 0
            ? evaluateEnableRuleMatch(
                src.id,
                rule,
                effectiveValues,
                this.aliasMap,
              )
            : isRuleValueMatched(
                rawVal,
                rule.value,
                rule.operator || rule.logic,
              )
        if (isMatched) {
          for (const rawTargetId of rule.controls) {
            const targetId = this.resolveTargetId(rawTargetId)
            if (fieldStates[targetId]) {
              fieldStates[targetId].required = true
            }
          }
        }
      }

      // 2. Source-driven readonlySettings: [{ id, value, controls, notEqual }]
      const readonlyRules = Array.isArray(rawReadonly) ? rawReadonly : []
      for (const rule of readonlyRules) {
        if (!Array.isArray(rule?.controls) || !rule.controls.length) continue
        const isValueMatch = isRuleValueMatched(
          rawVal,
          rule.value,
          rule.operator || rule.logic,
        )
        const shouldLock = rule.notEqual ? !isValueMatch : isValueMatch
        if (shouldLock) {
          for (const rawTargetId of rule.controls) {
            const targetId = this.resolveTargetId(rawTargetId)
            if (fieldStates[targetId]) {
              fieldStates[targetId].disabled = true
            }
          }
        }
      }
    }

    return fieldStates
  }

  applyAction(
    action: RuleAction | any,
    fieldStates: Record<string, FieldComputedState>,
  ) {
    const rawIds =
      action.targetFieldIds ||
      (action.targetFieldId ? [action.targetFieldId] : undefined) ||
      (action.field ? [action.field] : undefined) ||
      (action.controls ? action.controls : []) ||
      []
    const targetIds = Array.isArray(rawIds) ? rawIds : [rawIds]

    for (const rawTargetId of targetIds) {
      const targetId = this.resolveTargetId(rawTargetId)
      if (!fieldStates[targetId]) continue

      const aType = String(action.type || action.action || '').toUpperCase()
      switch (aType) {
        case 'SET_ENABLED':
          fieldStates[targetId].disabled = !action.value
          break
        case 'ENABLE_FIELD':
        case 'ENABLE':
          fieldStates[targetId].disabled = false
          break
        case 'DISABLE_FIELD':
        case 'DISABLE':
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
        case 'REQUIRE':
        case 'MANDATORY':
          fieldStates[targetId].required = action.value !== false
          break
      }
    }
  }
}

export interface LogicRuleResult {
  disabled?: boolean
  required?: boolean
  visible?: boolean
}

/**
 * Combines every logic rule of one field/section (OR per axis) instead of
 * letting the last rule overwrite the earlier ones. SHOW / ENABLE / REQUIRE
 * take priority: HIDE / DISABLE are ignored when the same target also has a
 * positive rule for that axis. An axis with no rules stays undefined.
 */
export function combineLogicRules(
  rules: LogicRule[],
  formValues: Record<string, any>,
): LogicRuleResult {
  const metOf = (action: LogicRule['action']) => {
    const list = rules.filter((r) => r.action === action)
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
  const result: LogicRuleResult = {}

  if (show.has) result.visible = show.any
  else if (hide.has) result.visible = !hide.any

  if (enable.has) result.disabled = !enable.any
  else if (disable.has) result.disabled = disable.any

  if (require.has) result.required = require.any
  return result
}

export interface PanelComputedState {
  disabled: boolean
  visible: boolean
}

/** Computes the show/hide/enable/disable state of every section. */
export function evaluatePanelRules(
  panels: any[],
  formValues: Record<string, any>,
): Record<string, PanelComputedState> {
  const states: Record<string, PanelComputedState> = {}
  for (const panel of panels || []) {
    const result = combineLogicRules(
      (panel.settings?.logic as LogicRule[]) || [],
      formValues,
    )
    states[panel.id] = {
      disabled: result.disabled ?? false,
      visible: result.visible ?? true,
    }
  }
  return states
}

export function evaluateCondition(
  condition: RuleCondition | LogicRule | Record<string, any>,
  formValues: Record<string, any>,
  aliasMap?: Map<string, string>,
): boolean {
  if (!condition || typeof condition !== 'object') return true
  const condAny = condition as Record<string, any>

  // Nested condition group support: { conditions: [...], groupLogic: 'ALL' | 'ANY' | 'AND' | 'OR' }
  if (Array.isArray(condAny.conditions) && condAny.conditions.length > 0) {
    const logic =
      condAny.groupLogic || condAny.logic || condAny.condition || 'ALL'
    return evaluateRuleConditions(
      condAny.conditions,
      formValues,
      logic,
      undefined,
      aliasMap,
    )
  }

  // Resolve source field ID across V6 (`fieldId`, `field`) and V5 (`name`)
  const sourceFieldId = condAny.fieldId ?? condAny.field ?? condAny.name ?? ''
  const fieldValue = resolveValueFromModel(sourceFieldId, formValues, aliasMap)

  // Resolve target value (if `fieldValue: true`, `cond.value` is another field's ID in V5)
  const targetValue =
    condAny.fieldValue === true && typeof condAny.value === 'string'
      ? resolveValueFromModel(condAny.value, formValues, aliasMap)
      : condAny.value

  // Determine operator across V6 (`operator`, `condition`) and V5 (`logic`)
  const rawOperator =
    condAny.operator ??
    condAny.logic ??
    (typeof condAny.condition === 'string' &&
    !['AND', 'OR', 'ALL', 'ANY'].includes(condAny.condition.toUpperCase())
      ? condAny.condition
      : 'EQUALS')

  const opKey = normalizeOperatorKey(rawOperator)
  const evaluator = OPERATORS[opKey]

  if (!evaluator) {
    console.warn(`Unsupported operator: ${String(rawOperator)}`)
    return false
  }

  return evaluator(fieldValue, targetValue)
}

export function evaluateDeclarativeRule(
  rule: DeclarativeRule,
  formValues: Record<string, any>,
  aliasMap?: Map<string, string>,
): boolean {
  if (!rule.conditions || rule.conditions.length === 0) return true
  return evaluateRuleConditions(
    rule.conditions,
    formValues,
    rule.groupLogic || 'ALL',
    undefined,
    aliasMap,
  )
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
  const fieldStates = engine.evaluateAll(formModel)

  // Section rules override their fields: a hidden section hides (and un-requires)
  // all its fields, a disabled section disables all of them.
  const panelStates = evaluatePanelRules(panels, formModel)
  for (const panel of panels || []) {
    const panelState = panelStates[panel.id]
    if (!panelState || (panelState.visible && !panelState.disabled)) continue
    for (const field of panel.fields || []) {
      const state = fieldStates[field.id]
      if (!state) continue
      if (!panelState.visible) {
        state.visible = false
        state.required = false
      }
      if (panelState.disabled) state.disabled = true
    }
  }
  return fieldStates
}

/**
 * Evaluates a list of V5 or V6 rule conditions supporting:
 * - `groupLogic`: 'ALL' | 'ANY' | 'AND' | 'OR'
 * - Per-clause `AND` / `OR` combinators (`condition`, `conditionType`, `logicalOperator`)
 * - Nested condition groups (`{ conditions: [...], groupLogic: 'ANY' }`)
 * - Explicit parenthesis tokens (`LEFT_PARANTHESES`, `RIGHT_PARANTHESES`, `(`, `)`) and `openParen`/`closeParen` flags
 */
export function evaluateRuleConditions(
  conditions: any[] | undefined,
  formValues: Record<string, any>,
  groupLogic: 'ALL' | 'ANY' | 'AND' | 'OR' = 'ALL',
  fields?: Question[],
  existingAliasMap?: Map<string, string>,
): boolean {
  if (!Array.isArray(conditions) || conditions.length === 0) return true

  const aliasMap = existingAliasMap ?? buildFieldAliasMap(fields)
  const defaultComb: 'AND' | 'OR' =
    String(groupLogic).toUpperCase() === 'ANY' ||
    String(groupLogic).toUpperCase() === 'OR'
      ? 'OR'
      : 'AND'

  const tokens: BoolToken[] = []

  const pushWithCombinatorIfNeeded = (comb: 'AND' | 'OR') => {
    const prev = tokens.at(-1)
    if (prev && (prev.type === 'VAL' || prev.type === 'RPAREN')) {
      tokens.push({ type: comb })
    }
  }

  for (const rawItem of conditions) {
    if (!rawItem || typeof rawItem !== 'object') continue
    const item = rawItem as Record<string, any>

    if (isOpenParenToken(item)) {
      pushWithCombinatorIfNeeded(extractClauseCombinator(item, defaultComb))
      tokens.push({ type: 'LPAREN' })
      continue
    }

    if (isCloseParenToken(item)) {
      tokens.push({ type: 'RPAREN' })
      continue
    }

    const standaloneComb = isCombinatorOnlyToken(item)
    if (standaloneComb) {
      tokens.push({ type: standaloneComb })
      continue
    }

    const clauseComb = extractClauseCombinator(item, defaultComb)
    pushWithCombinatorIfNeeded(clauseComb)

    const openCount =
      typeof item.openParen === 'number'
        ? item.openParen
        : item.openParen || item.leftParenthesis
          ? 1
          : 0
    for (let i = 0; i < openCount; i += 1) {
      tokens.push({ type: 'LPAREN' })
    }

    const val = evaluateCondition(item, formValues, aliasMap)
    tokens.push({ type: 'VAL', value: val })

    const closeCount =
      typeof item.closeParen === 'number'
        ? item.closeParen
        : item.closeParen || item.rightParenthesis
          ? 1
          : 0
    for (let i = 0; i < closeCount; i += 1) {
      tokens.push({ type: 'RPAREN' })
    }
  }

  if (tokens.length === 0) return true

  let index = 0
  const peek = () => tokens[index]
  const consume = () => tokens[index++]

  // Standard boolean precedence: parentheses -> AND -> OR
  // Note: when all combinators are uniform (all AND or all OR), precedence is identical.
  const parseOr = (): boolean => {
    let left = parseAnd()
    while (peek()?.type === 'OR') {
      consume()
      const right = parseAnd()
      left = left || right
    }
    return left
  }

  const parseAnd = (): boolean => {
    let left = parsePrimary()
    while (peek()?.type === 'AND') {
      consume()
      const right = parsePrimary()
      left = left && right
    }
    return left
  }

  const parsePrimary = (): boolean => {
    const tok = peek()
    if (!tok) return true
    if (tok.type === 'LPAREN') {
      consume()
      const inner = parseOr()
      if (peek()?.type === 'RPAREN') {
        consume()
      }
      return inner
    }
    if (tok.type === 'VAL') {
      consume()
      return tok.value
    }
    // Unexpected token recovery
    consume()
    return parsePrimary()
  }

  return parseOr()
}

/**
 * Clears values of fields that are currently hidden by conditional rules,
 * matching V5's behavior of resetting child field values when hidden by a parent rule.
 */
export function sanitizeHiddenFieldValues(
  panels: any[],
  formModel: Record<string, any>,
  declarativeRules: DeclarativeRule[] = [],
): Record<string, any> {
  const states = evaluateFormRules(panels, formModel, declarativeRules)
  const next = { ...formModel }
  const allFields: Question[] = (panels || []).flatMap((p) => p?.fields || [])

  for (const field of allFields) {
    if (!field?.id) continue
    if (states[field.id] && !states[field.id].visible && field.id in next) {
      next[field.id] = Array.isArray(next[field.id]) ? [] : ''
    }
  }
  return next
}

function buildFieldAliasMap(fields: Question[] = []): Map<string, string> {
  const aliasMap = new Map<string, string>()
  for (const field of fields) {
    if (!field) continue
    const fAny = field as any
    if (field.id) aliasMap.set(field.id, field.id)
    if (fAny.jsonId) aliasMap.set(String(fAny.jsonId), field.id)
    if (fAny.name) aliasMap.set(String(fAny.name), field.id)
    const tableCols = field.settings?.specific?.tableColumns || []
    for (const col of tableCols) {
      if (!col?.id) continue
      aliasMap.set(col.id, col.id)
      if ((col as any).jsonId) aliasMap.set(String((col as any).jsonId), col.id)
      if (col.name) aliasMap.set(String(col.name), col.id)
    }
  }
  return aliasMap
}

function evaluateEnableRuleMatch(
  sourceFieldId: string,
  rule: Record<string, any>,
  effectiveValues: Record<string, any>,
  aliasMap: Map<string, string>,
): boolean {
  const rawVal = resolveValueFromModel(sourceFieldId, effectiveValues, aliasMap)
  const hasPrimaryValue =
    rule.value !== undefined &&
    rule.value !== null &&
    String(rule.value).trim() !== ''

  const primaryMatch = hasPrimaryValue
    ? isRuleValueMatched(rawVal, rule.value, rule.operator || rule.logic)
    : !OPERATORS.IS_EMPTY(rawVal)

  // V6 compoundCondition + otherConditions
  const hasOtherConditions =
    Boolean(rule.compoundCondition) &&
    Array.isArray(rule.otherConditions) &&
    rule.otherConditions.length > 0

  // V5 / nested conditions array on enableSettings item
  const hasNestedConditions =
    Array.isArray(rule.conditions) && rule.conditions.length > 0

  if (!hasOtherConditions && !hasNestedConditions) {
    return primaryMatch
  }

  const extraClauses = hasOtherConditions
    ? rule.otherConditions
    : rule.conditions
  const combMode = String(
    rule.condition || rule.groupLogic || 'AND',
  ).toUpperCase()
  const extraGroupLogic: 'ALL' | 'ANY' =
    combMode === 'OR' || combMode === 'ANY' ? 'ANY' : 'ALL'

  const extraMatch = evaluateRuleConditions(
    extraClauses,
    effectiveValues,
    extraGroupLogic,
    undefined,
    aliasMap,
  )

  if (!hasPrimaryValue && hasNestedConditions) {
    return extraMatch
  }

  if (extraGroupLogic === 'ANY') {
    return primaryMatch || extraMatch
  }
  return primaryMatch && extraMatch
}

function extractClauseCombinator(
  item: Record<string, any>,
  defaultCombinator: 'AND' | 'OR',
): 'AND' | 'OR' {
  const raw = String(
    item.logicalOperator ??
      item.conditionType ??
      (typeof item.condition === 'string' &&
      ['AND', 'OR', 'ALL', 'ANY'].includes(item.condition.toUpperCase())
        ? item.condition
        : ''),
  )
    .trim()
    .toUpperCase()
  if (raw === 'OR' || raw === 'ANY') return 'OR'
  if (raw === 'AND' || raw === 'ALL') return 'AND'
  return defaultCombinator
}

function isCloseParenToken(item: Record<string, any>): boolean {
  const t = String(item.type ?? item.name ?? item.operator ?? item.logic ?? '')
    .trim()
    .toUpperCase()
  const v = String(item.value ?? '').trim()
  return (
    t === 'RIGHT_PARANTHESES' ||
    t === 'RIGHT_PARENTHESES' ||
    t === 'RPAREN' ||
    t === ')' ||
    (v === ')' && !item.fieldId && !item.field && !item.name)
  )
}

function isCombinatorOnlyToken(item: Record<string, any>): 'AND' | 'OR' | null {
  if (item.fieldId || item.field) return null
  const candidate = String(
    item.type ??
      item.operator ??
      item.logic ??
      item.condition ??
      item.value ??
      '',
  )
    .trim()
    .toUpperCase()
  if (candidate === 'AND' || candidate === 'ALL') return 'AND'
  if (candidate === 'OR' || candidate === 'ANY') return 'OR'
  return null
}

function isOpenParenToken(item: Record<string, any>): boolean {
  const t = String(item.type ?? item.name ?? item.operator ?? item.logic ?? '')
    .trim()
    .toUpperCase()
  const v = String(item.value ?? '').trim()
  return (
    t === 'LEFT_PARANTHESES' ||
    t === 'LEFT_PARENTHESES' ||
    t === 'LPAREN' ||
    t === '(' ||
    (v === '(' && !item.fieldId && !item.field && !item.name)
  )
}

function isRuleValueMatched(
  rawVal: any,
  ruleValue: any,
  operator?: string,
): boolean {
  if (operator) {
    const opKey = normalizeOperatorKey(operator)
    const fn = OPERATORS[opKey]
    if (fn) return fn(rawVal, ruleValue)
  }
  if (OPERATORS.IS_EMPTY(rawVal)) return false
  return scalarEquals(rawVal, ruleValue, true)
}

function normalizeOperatorKey(rawOp: unknown): string {
  const trimmed = String(rawOp ?? 'EQUALS').trim()
  if (trimmed in OPERATORS) return trimmed
  const upper = trimmed.toUpperCase()
  if (upper in OPERATORS) return upper
  const stripped = upper.replace(/\s*\([^)]*\)\s*$/, '').trim()
  if (stripped in OPERATORS) return stripped
  return upper
}

function resolveValueFromModel(
  refId: string | undefined,
  formValues: Record<string, any>,
  aliasMap?: Map<string, string>,
): any {
  if (!refId) return undefined
  if (refId in formValues) return formValues[refId]
  const canonicalId = aliasMap?.get(refId)
  if (canonicalId && canonicalId in formValues) {
    return formValues[canonicalId]
  }
  return undefined
}
