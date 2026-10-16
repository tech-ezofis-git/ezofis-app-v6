/* eslint-disable @typescript-eslint/no-explicit-any */
import type { FormulaToken } from './formula'
import { decodeTableSumValue, encodeTableSumValue } from './formula'

export interface V5Calculation {
  fieldId: string
  formula: Array<V5FormulaToken | FormulaToken>
  id: string
  columnId?: string
}

export interface V5CalculationRule {
  id: string
  // Also allow V6 DeclarativeRule properties
  actions?: any[]
  calculations?: V5Calculation[]
  conditions?: Array<{
    fieldValue?: boolean
    id?: string
    logic: string
    name: string
    value: any
  }>
  elseActions?: any[]
  groupLogic?: 'ALL' | 'ANY'
  isConditionalRule?: boolean
  name?: string
}

export interface V5CurrencyValue {
  currency: string
  value: number | string
}

export interface V5FormulaToken {
  name:
    | 'DIVIDE'
    | 'FIELD'
    | 'LEFT_PARANTHESES'
    | 'MINUS'
    | 'MULTIPLY'
    | 'NUMBER'
    | 'PLUS'
    | 'RIGHT_PARANTHESES'
    | string
  value: string
  id?: string
  label?: string
}

export interface V5PhoneValue {
  code: string
  phoneNo: string
  alpha2Code?: string
  flag?: string
  verified?: boolean
}

const V5_OPERATOR_BY_NAME: Record<string, string> = {
  DIVIDE: '/',
  LEFT_PARANTHESES: '(',
  LEFT_PARENTHESES: '(',
  MINUS: '-',
  MULTIPLY: '*',
  PLUS: '+',
  RIGHT_PARANTHESES: ')',
  RIGHT_PARENTHESES: ')',
}

const V5_NAME_BY_OPERATOR: Record<string, V5FormulaToken['name']> = {
  '(': 'LEFT_PARANTHESES',
  ')': 'RIGHT_PARANTHESES',
  '*': 'MULTIPLY',
  '+': 'PLUS',
  '-': 'MINUS',
  '/': 'DIVIDE',
}

export const makeAdapterId = () => {
  try {
    return crypto.randomUUID()
  } catch {
    return (
      Math.random().toString(36).substring(2, 10) +
      Math.random().toString(36).substring(2, 10)
    )
  }
}

/**
 * Converts a V5 formula token array (or mixed V5/V6 token array) into V6 FormulaToken[].
 */
export function convertV5FormulaToV6Tokens(
  rawFormula: unknown,
  panels: any[] = [],
  contextTableId?: string,
): FormulaToken[] {
  if (!Array.isArray(rawFormula) || rawFormula.length === 0) return []

  const allFields = (panels || []).flatMap((p) => p?.fields || [])
  const tableByColumnId = new Map<string, string>()
  for (const field of allFields) {
    if (field?.type === 'TABLE' || field?.type === 'DYNAMIC_TABLE') {
      const cols = field?.settings?.specific?.tableColumns || []
      for (const col of cols) {
        if (col?.id) {
          tableByColumnId.set(col.id, field.id)
        }
      }
    }
  }

  const result: FormulaToken[] = []

  for (const item of rawFormula) {
    if (!item || typeof item !== 'object') continue
    const token = item as Record<string, any>

    // Already a V6 FormulaToken
    if (
      typeof token.type === 'string' &&
      ['FIELD', 'FUNCTION', 'NUMBER', 'OPERATOR', 'TABLE_SUM'].includes(
        token.type,
      ) &&
      !token.name
    ) {
      result.push({
        type: token.type as FormulaToken['type'],
        value: String(token.value ?? ''),
      })
      continue
    }

    const tokenName = String(token.name || token.type || '').toUpperCase()
    const rawValue = String(token.value ?? '').trim()

    if (tokenName in V5_OPERATOR_BY_NAME) {
      result.push({
        type: 'OPERATOR',
        value: V5_OPERATOR_BY_NAME[tokenName],
      })
      continue
    }

    if (['(', ')', '+', '-', '*', '/', ','].includes(rawValue)) {
      result.push({
        type: 'OPERATOR',
        value: rawValue,
      })
      continue
    }

    if (tokenName === 'NUMBER') {
      result.push({
        type: 'NUMBER',
        value: rawValue,
      })
      continue
    }

    if (tokenName === 'FUNCTION') {
      result.push({
        type: 'FUNCTION',
        value: rawValue.toUpperCase(),
      })
      continue
    }

    if (tokenName === 'TABLE_SUM') {
      result.push({
        type: 'TABLE_SUM',
        value: rawValue,
      })
      continue
    }

    if (tokenName === 'FIELD') {
      if (rawValue.toUpperCase().startsWith('SUM OF ')) {
        const colId = rawValue.slice(7).trim()
        const tblId = contextTableId || tableByColumnId.get(colId) || ''
        result.push({
          type: 'TABLE_SUM',
          value: encodeTableSumValue(tblId, colId),
        })
        continue
      }

      // In form-level formulas (no contextTableId), if a FIELD token references a table column ID
      // directly, V5 automatically sums that column across all table rows.
      if (!contextTableId && tableByColumnId.has(rawValue)) {
        const isTopLevelField = allFields.some((f) => f?.id === rawValue)
        if (!isTopLevelField) {
          const tblId = tableByColumnId.get(rawValue)!
          result.push({
            type: 'TABLE_SUM',
            value: encodeTableSumValue(tblId, rawValue),
          })
          continue
        }
      }

      result.push({
        type: 'FIELD',
        value: rawValue,
      })
    }
  }

  return result
}

/**
 * Converts V6 FormulaToken[] back to V5 formula array format (preserving LEFT_PARANTHESES / RIGHT_PARANTHESES
 * and existing V5 token IDs/labels where applicable).
 */
export function convertV6TokensToV5Formula(
  tokens: FormulaToken[] | undefined,
  contextTableId?: string,
  panels: any[] = [],
  existingV5Formula?: Array<V5FormulaToken | FormulaToken>,
): V5FormulaToken[] {
  if (!Array.isArray(tokens) || tokens.length === 0) return []

  const labelById = new Map<string, string>()
  for (const panel of panels || []) {
    for (const field of panel?.fields || []) {
      if (field?.id) {
        labelById.set(field.id, field.label || field.name || field.id)
      }
      if (field?.type === 'TABLE' || field?.type === 'DYNAMIC_TABLE') {
        for (const col of field?.settings?.specific?.tableColumns || []) {
          if (col?.id) {
            labelById.set(col.id, col.label || col.name || col.id)
          }
        }
      }
    }
  }

  const usedExistingIndices = new Set<number>()
  const findExistingMatch = (name: string, value: string) => {
    if (!Array.isArray(existingV5Formula)) return undefined
    for (let i = 0; i < existingV5Formula.length; i++) {
      if (usedExistingIndices.has(i)) continue
      const candidate = existingV5Formula[i] as V5FormulaToken
      if (
        candidate &&
        candidate.name === name &&
        String(candidate.value) === String(value)
      ) {
        usedExistingIndices.add(i)
        return candidate
      }
    }
    return undefined
  }

  const v5Tokens: V5FormulaToken[] = []

  for (const token of tokens) {
    if (!token) continue
    if (token.type === 'OPERATOR') {
      const name = V5_NAME_BY_OPERATOR[token.value] || 'PLUS'
      const existing = findExistingMatch(name, token.value)
      v5Tokens.push({
        id: existing?.id || makeAdapterId(),
        label: existing?.label || token.value,
        name,
        value: token.value,
      })
    } else if (token.type === 'NUMBER') {
      const val = String(token.value ?? '')
      const existing = findExistingMatch('NUMBER', val)
      v5Tokens.push({
        id: existing?.id || makeAdapterId(),
        label: existing?.label || 'Number',
        name: 'NUMBER',
        value: val,
      })
    } else if (token.type === 'FIELD') {
      const val = String(token.value ?? '')
      const existing = findExistingMatch('FIELD', val)
      v5Tokens.push({
        id: existing?.id || makeAdapterId(),
        label: existing?.label || labelById.get(val) || 'Field',
        name: 'FIELD',
        value: val,
      })
    } else if (token.type === 'TABLE_SUM') {
      const { columnId } = decodeTableSumValue(String(token.value ?? ''))
      const colId = columnId || String(token.value ?? '')
      const v5Val = contextTableId ? `SUM OF ${colId}` : colId
      const existing = findExistingMatch('FIELD', v5Val)
      const resolvedColLabel = labelById.get(colId)
      const defaultLabel = contextTableId
        ? resolvedColLabel
          ? `SUM OF ${resolvedColLabel}`
          : 'Field'
        : resolvedColLabel || 'Field'
      v5Tokens.push({
        id: existing?.id || makeAdapterId(),
        label: existing?.label || defaultLabel,
        name: 'FIELD',
        value: v5Val,
      })
    }
  }

  return v5Tokens
}

/**
 * Maps V5 form layout ('CLASSIC' | 'CARD' | 'TAB') to V6 store layout ('CLASSIC' | 'SINGLE' | 'ACCORDION').
 */
export function mapV5LayoutToV6(
  rawLayout?: string,
): 'CLASSIC' | 'SINGLE' | 'ACCORDION' {
  const upper = String(rawLayout || 'CLASSIC').toUpperCase()
  if (
    upper === 'CARD' ||
    upper === 'SINGLE' ||
    upper === 'TYPEFORM' ||
    upper === 'STEPPER'
  ) {
    return 'SINGLE'
  }
  if (upper === 'TAB' || upper === 'ACCORDION' || upper === 'FULL') {
    return 'ACCORDION'
  }
  return 'CLASSIC'
}

/**
 * Maps V6 store layout ('CLASSIC' | 'SINGLE' | 'ACCORDION' | 'CARD' | 'TAB') back to V5 formJson layout ('CLASSIC' | 'CARD' | 'TAB').
 */
export function mapV6LayoutToV5(v6Layout?: string): 'CLASSIC' | 'CARD' | 'TAB' {
  const upper = String(v6Layout || 'CLASSIC').toUpperCase()
  if (
    upper === 'SINGLE' ||
    upper === 'CARD' ||
    upper === 'TYPEFORM' ||
    upper === 'STEPPER'
  ) {
    return 'CARD'
  }
  if (upper === 'ACCORDION' || upper === 'TAB' || upper === 'FULL') {
    return 'TAB'
  }
  return 'CLASSIC'
}

/**
 * Normalizes a V5 or V6 currency entry value into V5-compatible `{ currency, value }` structure
 * while remaining resilient to primitive number/string values.
 */
export function normalizeCurrencyEntryValue(
  raw: unknown,
  defaultCurrency = 'USD',
): V5CurrencyValue {
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, any>
    return {
      currency: String(obj.currency || obj.code || defaultCurrency),
      value: obj.value ?? obj.amount ?? '',
    }
  }
  if (typeof raw === 'number') {
    return { currency: defaultCurrency, value: raw }
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    const match = trimmed.match(/^([A-Z]{3})\s*(.*)$/i)
    if (match) {
      return {
        currency: match[1].toUpperCase(),
        value: match[2].trim(),
      }
    }
    return { currency: defaultCurrency, value: trimmed }
  }
  return { currency: defaultCurrency, value: '' }
}

/**
 * Normalizes a V5 or V6 phone entry value into V5-compatible `{ code, phoneNo, flag, alpha2Code, verified }` structure
 * while remaining resilient to primitive string values.
 */
export function normalizePhoneEntryValue(
  raw: unknown,
  defaultCode = '+1',
): V5PhoneValue {
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, any>
    return {
      ...(obj.alpha2Code !== undefined ? { alpha2Code: obj.alpha2Code } : {}),
      code: String(obj.code ?? obj.countryCode ?? defaultCode),
      ...(obj.flag !== undefined ? { flag: obj.flag } : {}),
      phoneNo: String(obj.phoneNo ?? obj.number ?? obj.value ?? ''),
      ...(obj.verified !== undefined
        ? { verified: Boolean(obj.verified) }
        : {}),
    }
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    const match = trimmed.match(/^(\+\d{1,4})[\s-]*(.*)$/)
    if (match) {
      return {
        code: match[1],
        phoneNo: match[2].trim(),
      }
    }
    return { code: defaultCode, phoneNo: trimmed }
  }
  if (typeof raw === 'number') {
    return { code: defaultCode, phoneNo: String(raw) }
  }
  return { code: defaultCode, phoneNo: '' }
}

const PREDEFINED_V5_TO_V6: Record<string, string> = {
  REPOSITORY: 'FOLDER',
  Repository: 'FOLDER',
  USER: 'USER',
  User: 'USER',
  WORKFLOW: 'WORKFLOW',
  Workflow: 'WORKFLOW',
  WORKSPACE: 'WORKSPACE',
  Workspace: 'WORKSPACE',
}

const PREDEFINED_V6_TO_V5: Record<string, string> = {
  FOLDER: 'Repository',
  USER: 'User',
  WORKFLOW: 'Workflow',
  WORKSPACE: 'Workspace',
}

const V5_DEFAULT_VALUE_MODES = [
  'USER_EMAIL',
  'USER_NAME',
  'LOGIN_NAME',
  'CURRENT_YEAR',
  'AUTO_GENERATE',
  'REQUEST_NO',
  'MASTER',
  'ASSIGN_PARENT_FIELD',
  'CUSTOM',
]

/**
 * Clones a single field (and any nested tableColumns, matrixColumns/matrixRows, fibFields),
 * regenerating all nested IDs and remapping intra-field references (e.g., table column formulas,
 * cascadeFromColumn, masterFormTableColumns, fibContent placeholders).
 */
export function cloneFieldWithNewIds(
  rawField: any,
  sharedIdMap?: Map<string, string>,
  options?: { labelSuffix?: string },
): any {
  const cloned = JSON.parse(JSON.stringify(rawField))
  const idMap = sharedIdMap || new Map<string, string>()

  const oldFieldId = cloned.id
  const newFieldId = idMap.get(oldFieldId) || makeAdapterId()
  idMap.set(oldFieldId, newFieldId)
  cloned.id = newFieldId

  const suffix =
    options?.labelSuffix !== undefined ? options.labelSuffix : ' (Copy)'
  if (suffix && cloned.label) {
    cloned.label = `${cloned.label}${suffix}`
  }

  const spec = cloned.settings?.specific
  if (spec) {
    // 1. Table columns
    if (Array.isArray(spec.tableColumns)) {
      spec.tableColumns = spec.tableColumns.map((col: any) => {
        const oldColId = col.id
        const newColId = idMap.get(oldColId) || makeAdapterId()
        idMap.set(oldColId, newColId)
        return {
          ...col,
          id: newColId,
        }
      })

      // Remap intra-table references inside each column
      spec.tableColumns = spec.tableColumns.map((col: any) =>
        remapFieldReferences(col, idMap),
      )

      // Remap masterFormTableColumns
      if (Array.isArray(spec.masterFormTableColumns)) {
        spec.masterFormTableColumns = spec.masterFormTableColumns.map(
          (m: any) => ({
            ...m,
            id: makeAdapterId(),
            tableColumn: idMap.get(m.tableColumn) || m.tableColumn,
          }),
        )
      }

      // Remap tableFixedRowLabels if keyed by column ID
      if (
        spec.tableFixedRowLabels &&
        typeof spec.tableFixedRowLabels === 'object' &&
        !Array.isArray(spec.tableFixedRowLabels)
      ) {
        const nextRowLabels: Record<string, any> = {}
        for (const [k, v] of Object.entries(spec.tableFixedRowLabels)) {
          nextRowLabels[idMap.get(k) || k] = v
        }
        spec.tableFixedRowLabels = nextRowLabels
      } else if (Array.isArray(spec.tableFixedRowLabels)) {
        spec.tableFixedRowLabels = spec.tableFixedRowLabels.map((item: any) => {
          if (item && typeof item === 'object') {
            const nextItem: Record<string, any> = {}
            for (const [k, v] of Object.entries(item)) {
              nextItem[idMap.get(k) || k] = v
            }
            return nextItem
          }
          return item
        })
      }
    }

    // 2. Matrix columns & rows
    if (Array.isArray(spec.matrixColumnObjects)) {
      spec.matrixColumnObjects = spec.matrixColumnObjects.map((col: any) => {
        const nextId = makeAdapterId()
        if (col.id) idMap.set(col.id, nextId)
        return { ...col, id: nextId }
      })
      if (
        Array.isArray(spec.matrixColumns) &&
        typeof spec.matrixColumns[0] === 'object'
      ) {
        spec.matrixColumns = JSON.parse(
          JSON.stringify(spec.matrixColumnObjects),
        )
      }
    } else if (
      Array.isArray(spec.matrixColumns) &&
      typeof spec.matrixColumns[0] === 'object'
    ) {
      spec.matrixColumns = spec.matrixColumns.map((col: any) => {
        const nextId = makeAdapterId()
        if (col.id) idMap.set(col.id, nextId)
        return { ...col, id: nextId }
      })
    }

    if (Array.isArray(spec.matrixRowObjects)) {
      spec.matrixRowObjects = spec.matrixRowObjects.map((row: any) => {
        const nextId = makeAdapterId()
        if (row.id) idMap.set(row.id, nextId)
        return { ...row, id: nextId }
      })
      if (
        Array.isArray(spec.matrixRows) &&
        typeof spec.matrixRows[0] === 'object'
      ) {
        spec.matrixRows = JSON.parse(JSON.stringify(spec.matrixRowObjects))
      }
    } else if (
      Array.isArray(spec.matrixRows) &&
      typeof spec.matrixRows[0] === 'object'
    ) {
      spec.matrixRows = spec.matrixRows.map((row: any) => {
        const nextId = makeAdapterId()
        if (row.id) idMap.set(row.id, nextId)
        return { ...row, id: nextId }
      })
    }

    // 3. Fill in the Blanks sub-fields & HTML placeholders
    if (Array.isArray(spec.fibFields)) {
      spec.fibFields = spec.fibFields.map((sub: any) => {
        const oldSubId = sub.id
        const newSubId = makeAdapterId()
        if (oldSubId) {
          idMap.set(oldSubId, newSubId)
          if (typeof spec.fibContent === 'string') {
            spec.fibContent = spec.fibContent.split(oldSubId).join(newSubId)
          }
          if (typeof spec.fibMapping === 'string') {
            spec.fibMapping = spec.fibMapping.split(oldSubId).join(newSubId)
          }
        }
        return {
          ...sub,
          id: newSubId,
        }
      })
    }
  }

  return remapFieldReferences(cloned, idMap)
}

/**
 * Clones an entire panel and all of its fields, regenerating all field and nested IDs
 * and remapping all intra-panel references while preserving references to fields in other panels.
 */
export function clonePanelWithNewIds(rawPanel: any): any {
  const clonedPanel = JSON.parse(JSON.stringify(rawPanel))
  const idMap = new Map<string, string>()

  clonedPanel.id = makeAdapterId()

  // Pre-seed idMap for all top-level fields in this panel so forward references within the panel also remap
  for (const field of clonedPanel.fields || []) {
    if (field?.id) {
      idMap.set(field.id, makeAdapterId())
    }
    if (Array.isArray(field?.settings?.specific?.tableColumns)) {
      for (const col of field.settings.specific.tableColumns) {
        if (col?.id) {
          idMap.set(col.id, makeAdapterId())
        }
      }
    }
  }

  clonedPanel.fields = (clonedPanel.fields || []).map((field: any) =>
    cloneFieldWithNewIds(field, idMap, { labelSuffix: ' (Copy)' }),
  )

  return clonedPanel
}

/**
 * Normalizes a single V5 or V6 field/column object (returning a cloned normalized object)
 * so both V5 and V6 property paths are populated without losing any original properties.
 *
 * @param rawField - The raw field or table column object
 * @param mode - 'load' when hydrating from V5/saved JSON (V5 properties take precedence);
 *               'save' when updating/saving from V6 store (V6 properties overwrite V5 counterparts).
 */
export function normalizeFieldSchema(
  rawField: any,
  mode: 'load' | 'save' = 'load',
): any {
  if (!rawField || typeof rawField !== 'object') return rawField
  const field = JSON.parse(JSON.stringify(rawField))

  if (typeof field.type === 'string') {
    field.type = field.type.toUpperCase()
  }

  // Decision 1: Normalize legacy V5 CURRENCY field to CURRENCY_AMOUNT while preserving legacyV5Type
  if (field.type === 'CURRENCY') {
    field.legacyV5Type = 'CURRENCY'
    field.type = 'CURRENCY_AMOUNT'
  }

  field.settings = field.settings || {}
  field.settings.general = field.settings.general || {}
  field.settings.specific = field.settings.specific || {}
  field.settings.validation = field.settings.validation || {}
  field.settings.lookupSettings = field.settings.lookupSettings || {}
  field.settings.aiSettings = field.settings.aiSettings || {}

  const gen = field.settings.general
  const spec = field.settings.specific
  const val = field.settings.validation
  const lookup = field.settings.lookupSettings

  // 1. General Settings synchronization
  if (mode === 'save') {
    if (field.displayLabel !== undefined) {
      gen.displayLabel = field.displayLabel
    } else if (gen.displayLabel !== undefined) {
      field.displayLabel = gen.displayLabel
    }
  } else {
    if (gen.displayLabel !== undefined) {
      field.displayLabel = gen.displayLabel
    } else if (field.displayLabel !== undefined) {
      gen.displayLabel = field.displayLabel
    }
  }

  const divType =
    mode === 'save'
      ? spec.dividerStyle || spec.dividerType || gen.dividerType
      : gen.dividerType || spec.dividerType || spec.dividerStyle
  if (divType) {
    gen.dividerType = divType
    spec.dividerType = divType
    spec.dividerStyle = divType
  }

  if (mode === 'save') {
    if (gen.visibility === 'READ_ONLY' || gen.readOnly === true) {
      gen.readOnly = gen.visibility === 'READ_ONLY' || Boolean(gen.readOnly)
      if (gen.readOnly && (!gen.visibility || gen.visibility === 'NORMAL')) {
        gen.visibility = 'READ_ONLY'
      }
    } else if (gen.visibility && gen.visibility !== 'READ_ONLY') {
      gen.readOnly = false
    }
  } else {
    if (gen.visibility === 'READ_ONLY') {
      gen.readOnly = true
    } else if (gen.readOnly && !gen.visibility) {
      gen.visibility = 'READ_ONLY'
    }
  }

  // 2. Specific Settings synchronization
  if (mode === 'save') {
    if (spec.fillValueType) {
      spec.defaultValue = spec.fillValueType
    } else if (
      typeof spec.defaultValue === 'string' &&
      V5_DEFAULT_VALUE_MODES.includes(spec.defaultValue)
    ) {
      spec.fillValueType = spec.defaultValue
    }
  } else {
    if (
      typeof spec.defaultValue === 'string' &&
      V5_DEFAULT_VALUE_MODES.includes(spec.defaultValue)
    ) {
      spec.fillValueType = spec.defaultValue
    } else if (spec.fillValueType && !spec.defaultValue) {
      spec.defaultValue = spec.fillValueType
    }
  }

  // Date & Time defaults
  if (field.type === 'DATE' || field.type === 'DATE_TIME') {
    if (mode === 'save') {
      if (spec.dateDefaultValueType === 'TODAY') {
        spec.defaultValue =
          field.type === 'DATE_TIME' ? 'CURRENT_DATE_TIME' : 'CURRENT_DATE'
      } else if (spec.dateDefaultValueType === 'PARENT_FIELD') {
        spec.defaultValue = 'PARENT_FIELD'
      } else if (spec.dateDefaultValueType === 'PARENT_FIELD_OPTIONS') {
        spec.defaultValue = 'PARENT_FIELD_OPTIONS'
      } else if (spec.dateDefaultValueType === 'CUSTOM') {
        spec.defaultValue = 'CUSTOM'
      }
      if (spec.parentDateFieldId !== undefined) {
        spec.parentDateField = spec.parentDateFieldId
      } else if (spec.parentDateField !== undefined) {
        spec.parentDateFieldId = spec.parentDateField
      }
      if (spec.parentDateOffset !== undefined) {
        spec.parentFieldsDays = Number(spec.parentDateOffset) || 0
      } else if (spec.parentFieldsDays !== undefined) {
        spec.parentDateOffset = Number(spec.parentFieldsDays) || 0
      }
    } else {
      if (
        spec.defaultValue === 'CURRENT_DATE' ||
        spec.defaultValue === 'CURRENT_DATE_TIME'
      ) {
        spec.dateDefaultValueType = 'TODAY'
      } else if (spec.defaultValue === 'PARENT_FIELD') {
        spec.dateDefaultValueType = 'PARENT_FIELD'
      } else if (spec.defaultValue === 'PARENT_FIELD_OPTIONS') {
        spec.dateDefaultValueType = 'PARENT_FIELD_OPTIONS'
      } else if (spec.dateDefaultValueType === 'TODAY' && !spec.defaultValue) {
        spec.defaultValue =
          field.type === 'DATE_TIME' ? 'CURRENT_DATE_TIME' : 'CURRENT_DATE'
      }
      if (spec.parentDateField !== undefined) {
        spec.parentDateFieldId = spec.parentDateField
      } else if (spec.parentDateFieldId !== undefined) {
        spec.parentDateField = spec.parentDateFieldId
      }
      if (spec.parentFieldsDays !== undefined) {
        spec.parentDateOffset = Number(spec.parentFieldsDays) || 0
      } else if (spec.parentDateOffset !== undefined) {
        spec.parentFieldsDays = Number(spec.parentDateOffset) || 0
      }
    }
  }

  if (field.type === 'TIME') {
    if (mode === 'save') {
      if (spec.timeDefaultValueType === 'NOW') {
        spec.defaultValue = 'CURRENT_TIME'
      } else if (spec.timeDefaultValueType === 'CUSTOM') {
        spec.defaultValue = 'CUSTOM'
      }
    } else {
      if (spec.defaultValue === 'CURRENT_TIME') {
        spec.timeDefaultValueType = 'NOW'
      } else if (spec.timeDefaultValueType === 'NOW' && !spec.defaultValue) {
        spec.defaultValue = 'CURRENT_TIME'
      }
    }
  }

  // Options & Select / Currency / Phone settings
  if (mode === 'save') {
    const src = spec.optionsType || spec.optionsSource
    if (src) {
      spec.optionsType = src
      spec.optionsSource = src
    }
  } else {
    if (spec.optionsType && !spec.optionsSource) {
      spec.optionsSource = spec.optionsType
    } else if (spec.optionsSource && !spec.optionsType) {
      spec.optionsType = spec.optionsSource
    }
  }

  if (field.type === 'CURRENCY_AMOUNT') {
    if (mode === 'save') {
      if (spec.currencyOptionsType === 'ALL') {
        spec.optionsType = 'ALL_CURRENCY'
      } else if (spec.currencyOptionsType === 'SPECIFIC') {
        spec.optionsType = 'SPECIFIC_CURRENCY'
      } else if (spec.optionsType === 'ALL_CURRENCY') {
        spec.currencyOptionsType = 'ALL'
      } else if (spec.optionsType === 'SPECIFIC_CURRENCY') {
        spec.currencyOptionsType = 'SPECIFIC'
      }

      if (Array.isArray(spec.specificCurrencies)) {
        spec.specificCurrencyOptions = spec.specificCurrencies
      } else if (Array.isArray(spec.specificCurrencyOptions)) {
        spec.specificCurrencies = spec.specificCurrencyOptions
      }

      if (spec.currencyParentFieldId !== undefined) {
        spec.currencyParentField = spec.currencyParentFieldId
      } else if (spec.currencyParentField !== undefined) {
        spec.currencyParentFieldId = spec.currencyParentField
      }
    } else {
      if (spec.optionsType === 'ALL_CURRENCY') {
        spec.currencyOptionsType = 'ALL'
      } else if (spec.optionsType === 'SPECIFIC_CURRENCY') {
        spec.currencyOptionsType = 'SPECIFIC'
      } else if (spec.currencyOptionsType === 'ALL') {
        spec.optionsType = 'ALL_CURRENCY'
      } else if (spec.currencyOptionsType === 'SPECIFIC') {
        spec.optionsType = 'SPECIFIC_CURRENCY'
      }

      if (Array.isArray(spec.specificCurrencyOptions)) {
        spec.specificCurrencies = spec.specificCurrencyOptions
      } else if (Array.isArray(spec.specificCurrencies)) {
        spec.specificCurrencyOptions = spec.specificCurrencies
      }

      if (spec.currencyParentField !== undefined) {
        spec.currencyParentFieldId = spec.currencyParentField
      } else if (spec.currencyParentFieldId !== undefined) {
        spec.currencyParentField = spec.currencyParentFieldId
      }
    }
  }

  // Predefined options
  if (mode === 'save') {
    if (spec.predefinedType) {
      spec.predefinedTable =
        PREDEFINED_V6_TO_V5[spec.predefinedType] || spec.predefinedType
    } else if (spec.predefinedTable) {
      spec.predefinedType =
        PREDEFINED_V5_TO_V6[spec.predefinedTable] || spec.predefinedTable
    }
    if (spec.predefinedColumn !== undefined) {
      spec.predefinedTableColumn = spec.predefinedColumn
    } else if (spec.predefinedTableColumn !== undefined) {
      spec.predefinedColumn = spec.predefinedTableColumn
    }
  } else {
    if (spec.predefinedTable) {
      spec.predefinedType =
        PREDEFINED_V5_TO_V6[spec.predefinedTable] || spec.predefinedTable
    } else if (spec.predefinedType) {
      spec.predefinedTable =
        PREDEFINED_V6_TO_V5[spec.predefinedType] || spec.predefinedType
    }
    if (spec.predefinedTableColumn !== undefined) {
      spec.predefinedColumn = spec.predefinedTableColumn
    } else if (spec.predefinedColumn !== undefined) {
      spec.predefinedTableColumn = spec.predefinedColumn
    }
  }

  // Master condition column normalization ({ formColumn, masterColumn } <-> { formField, masterColumn })
  if (Array.isArray(spec.masterFormConditionColumn)) {
    spec.masterFormConditionColumn = spec.masterFormConditionColumn.map(
      (cond: any) => {
        const resolvedFormCol =
          mode === 'save'
            ? cond.formField || cond.formColumn || ''
            : cond.formColumn || cond.formField || ''
        return {
          ...cond,
          formColumn: resolvedFormCol,
          formField: resolvedFormCol,
          masterColumn: cond.masterColumn || '',
        }
      },
    )
  }

  // Rating settings
  if (mode === 'save') {
    if (spec.iconType) {
      spec.ratingIcon = spec.iconType
    } else if (spec.ratingIcon) {
      spec.iconType = spec.ratingIcon
    }
    if (spec.iconCount !== undefined) {
      spec.ratingIconCount = Number(spec.iconCount) || 5
    } else if (spec.ratingIconCount !== undefined) {
      spec.iconCount = Number(spec.ratingIconCount) || 5
    }
  } else {
    if (spec.ratingIcon) {
      spec.iconType = spec.ratingIcon
    } else if (spec.iconType) {
      spec.ratingIcon = spec.iconType
    }
    if (spec.ratingIconCount !== undefined) {
      spec.iconCount = Number(spec.ratingIconCount) || 5
    } else if (spec.iconCount !== undefined) {
      spec.ratingIconCount = Number(spec.iconCount) || 5
    }
  }

  // File upload settings
  if (mode === 'save') {
    if (spec.fileInStageOnly !== undefined) {
      spec.fileInStage = Boolean(spec.fileInStageOnly)
    } else if (spec.fileInStage !== undefined) {
      spec.fileInStageOnly = Boolean(spec.fileInStage)
    }
  } else {
    if (spec.fileInStage !== undefined) {
      spec.fileInStageOnly = Boolean(spec.fileInStage)
    } else if (spec.fileInStageOnly !== undefined) {
      spec.fileInStage = Boolean(spec.fileInStageOnly)
    }
  }

  // Table settings & columns
  if (field.type === 'TABLE' || field.type === 'DYNAMIC_TABLE') {
    if (mode === 'save') {
      if (spec.rowsType) {
        spec.tableRowsType = spec.rowsType
      } else if (spec.tableRowsType) {
        spec.rowsType = spec.tableRowsType
      }

      if (spec.fixedRowCount !== undefined) {
        spec.tableFixedRowCount = Number(spec.fixedRowCount) || 0
      } else if (spec.tableFixedRowCount !== undefined) {
        spec.fixedRowCount = Number(spec.tableFixedRowCount) || 0
      }

      if (spec.rowSelection) {
        if (spec.rowSelection === 'SINGLE') {
          spec.tableRowChooseType = 'SINGLE_ROW'
        } else if (spec.rowSelection === 'MULTIPLE') {
          spec.tableRowChooseType = 'MULTIPLE_ROW'
        } else {
          spec.tableRowChooseType = ''
        }
      } else if (spec.tableRowChooseType !== undefined) {
        if (spec.tableRowChooseType === 'SINGLE_ROW') {
          spec.rowSelection = 'SINGLE'
        } else if (spec.tableRowChooseType === 'MULTIPLE_ROW') {
          spec.rowSelection = 'MULTIPLE'
        } else {
          spec.rowSelection = 'NONE'
        }
      }

      if (spec.importExportEnabled !== undefined) {
        spec.importOption = Boolean(spec.importExportEnabled)
      } else if (spec.importOption !== undefined) {
        spec.importExportEnabled = Boolean(spec.importOption)
      }
    } else {
      if (spec.tableRowsType) {
        spec.rowsType = spec.tableRowsType
      } else if (spec.rowsType) {
        spec.tableRowsType = spec.rowsType
      }

      if (spec.tableFixedRowCount !== undefined) {
        spec.fixedRowCount = Number(spec.tableFixedRowCount) || 0
      } else if (spec.fixedRowCount !== undefined) {
        spec.tableFixedRowCount = Number(spec.fixedRowCount) || 0
      }

      if (spec.tableRowChooseType !== undefined) {
        if (spec.tableRowChooseType === 'SINGLE_ROW') {
          spec.rowSelection = 'SINGLE'
        } else if (spec.tableRowChooseType === 'MULTIPLE_ROW') {
          spec.rowSelection = 'MULTIPLE'
        } else {
          spec.rowSelection = 'NONE'
        }
      } else if (spec.rowSelection) {
        if (spec.rowSelection === 'SINGLE') {
          spec.tableRowChooseType = 'SINGLE_ROW'
        } else if (spec.rowSelection === 'MULTIPLE') {
          spec.tableRowChooseType = 'MULTIPLE_ROW'
        } else {
          spec.tableRowChooseType = ''
        }
      }

      if (spec.importOption !== undefined) {
        spec.importExportEnabled = Boolean(spec.importOption)
      } else if (spec.importExportEnabled !== undefined) {
        spec.importOption = Boolean(spec.importExportEnabled)
      }
    }

    if (spec.defaultValue === 'MASTER' || spec.fillValueType === 'MASTER') {
      spec.fillValueType = 'MASTER'
      spec.defaultValue = 'MASTER'
      spec.isMasterTable = true
    }

    if (Array.isArray(spec.tableColumns)) {
      spec.tableColumns = spec.tableColumns.map((rawCol: any) => {
        const col = normalizeFieldSchema(rawCol, mode)
        if (mode === 'save') {
          const colName = col.name || col.label || 'Column'
          col.name = colName
          col.label = colName
        } else {
          const colName = col.label || col.name || 'Column'
          col.name = col.name || colName
          col.label = col.label || colName
        }
        col.size = col.size || 'MEDIUM'
        if (
          col.settings?.specific?.showColumnTotal &&
          spec.showSummaryRow === undefined
        ) {
          spec.showSummaryRow = true
        }
        return col
      })
    }
  }

  // Matrix settings: preserve structured V5 objects while also supporting string label arrays
  if (field.type === 'MATRIX') {
    const defaultColType =
      spec.matrixSelectionType === 'MULTIPLE' ? 'CHECKBOX' : 'SHORT_TEXT'

    if (Array.isArray(spec.matrixColumns) && spec.matrixColumns.length > 0) {
      if (typeof spec.matrixColumns[0] === 'object') {
        spec.matrixColumnObjects = spec.matrixColumns.map(
          (c: any, idx: number) => ({
            ...c,
            id: c.id || `col_${idx + 1}`,
            label: c.label || c.name || `Column ${idx + 1}`,
            type: c.type || defaultColType,
          }),
        )
        spec.matrixColumnLabels = spec.matrixColumnObjects.map(
          (c: any) => c.label,
        )
      } else if (typeof spec.matrixColumns[0] === 'string') {
        const labels = spec.matrixColumns as string[]
        spec.matrixColumnLabels = labels
        const existingObjs = Array.isArray(spec.matrixColumnObjects)
          ? spec.matrixColumnObjects
          : []
        spec.matrixColumnObjects = labels.map((label: string, idx: number) => {
          const prev = existingObjs[idx]
          return prev
            ? { ...prev, label }
            : {
                id: `col_${idx + 1}`,
                label,
                type: defaultColType,
              }
        })
      }
    }

    if (Array.isArray(spec.matrixRows) && spec.matrixRows.length > 0) {
      if (typeof spec.matrixRows[0] === 'object') {
        spec.matrixRowObjects = spec.matrixRows.map((r: any, idx: number) => ({
          ...r,
          id: r.id || `row_${idx + 1}`,
          label: r.label || r.name || `Row ${idx + 1}`,
        }))
        spec.matrixRowLabels = spec.matrixRowObjects.map((r: any) => r.label)
      } else if (typeof spec.matrixRows[0] === 'string') {
        const labels = spec.matrixRows as string[]
        spec.matrixRowLabels = labels
        const existingObjs = Array.isArray(spec.matrixRowObjects)
          ? spec.matrixRowObjects
          : []
        spec.matrixRowObjects = labels.map((label: string, idx: number) => {
          const prev = existingObjs[idx]
          return prev
            ? { ...prev, label }
            : {
                id: `row_${idx + 1}`,
                label,
              }
        })
      }
    }
  }

  // 3. Validation Settings synchronization
  if (val.fieldRule === 'MANDATORY') {
    val.fieldRule = 'REQUIRED'
  }

  if (mode === 'save') {
    if (val.decimalDigits !== undefined) {
      val.decimalValue = Number(val.decimalDigits)
    } else if (val.decimalValue !== undefined) {
      val.decimalDigits = Number(val.decimalValue)
    }
    if (val.expiryFieldId !== undefined) {
      val.documentExpiryField = val.expiryFieldId
    } else if (val.documentExpiryField !== undefined) {
      val.expiryFieldId = val.documentExpiryField
    }
  } else {
    if (val.decimalValue !== undefined) {
      val.decimalDigits = Number(val.decimalValue)
    } else if (val.decimalDigits !== undefined) {
      val.decimalValue = Number(val.decimalDigits)
    }
    if (val.documentExpiryField !== undefined) {
      val.expiryFieldId = val.documentExpiryField
    } else if (val.expiryFieldId !== undefined) {
      val.documentExpiryField = val.expiryFieldId
    }
  }

  if (
    spec.decimalPrecision !== undefined &&
    val.decimalDigits === undefined &&
    val.decimalValue === undefined
  ) {
    val.decimalDigits = Number(spec.decimalPrecision)
    val.decimalValue = Number(spec.decimalPrecision)
  }

  if (val.rangeType === 'MINIMUM') {
    val.rangeType = 'MIN_FLEX_MAX_FIXED'
  } else if (val.rangeType === 'MAXIMUM') {
    val.rangeType = 'MIN_FIXED_MAX_FLEX'
  }

  // 4. Lookup Settings synchronization
  if (mode === 'save') {
    if (lookup.connectionType) {
      lookup.connection = String(lookup.connectionType).toLowerCase()
    } else if (lookup.connection) {
      lookup.connectionType = String(lookup.connection).toUpperCase()
    }
  } else {
    if (lookup.connection) {
      lookup.connectionType = String(lookup.connection).toUpperCase()
    } else if (lookup.connectionType) {
      lookup.connection = String(lookup.connectionType).toLowerCase()
    }
  }

  if (Array.isArray(lookup.syncFieldsForAPI)) {
    lookup.syncFieldsForAPI = lookup.syncFieldsForAPI.map((item: any) => {
      const apiParam =
        mode === 'save'
          ? (item.apiParam ?? item.inputName ?? '')
          : (item.inputName ?? item.apiParam ?? '')
      const formField =
        mode === 'save'
          ? (item.formField ?? item.fieldName ?? '')
          : (item.fieldName ?? item.formField ?? '')
      return {
        ...item,
        apiParam,
        fieldName: formField,
        formField,
        id: item.id || makeAdapterId(),
        inputName: apiParam,
      }
    })
  }

  return field
}

/**
 * Normalizes an entire V5 or V6 formJson payload:
 * - Normalizes every panel and secondaryPanel field (and table column)
 * - Hydrates field-level and column-level `formulaTokens` from `settings.rules` if present
 * - Preserves all unknown root and settings properties
 */
export function normalizeV5FormJson(rawJson: any): {
  panels: any[]
  rawFormRoot: Record<string, any>
  rawSettings: Record<string, any>
  rules: V5CalculationRule[]
  secondaryPanels: any[]
  settings: any
} {
  if (!rawJson || typeof rawJson !== 'object') {
    return {
      panels: [],
      rawFormRoot: {},
      rawSettings: {},
      rules: [],
      secondaryPanels: [],
      settings: {},
    }
  }

  const {
    panels: rawPanels,
    secondaryPanels: rawSecondaryPanels,
    settings: rawSettingsObj,
    ...rawFormRoot
  } = rawJson

  const panels = (rawPanels || []).map((panel: any) => ({
    ...panel,
    fields: (panel.fields || []).map((f: any) =>
      normalizeFieldSchema(f, 'load'),
    ),
    settings: {
      description: '',
      title: 'Section',
      ...panel.settings,
    },
  }))

  const secondaryPanels = (rawSecondaryPanels || []).map((panel: any) => ({
    ...panel,
    fields: (panel.fields || []).map((f: any) =>
      normalizeFieldSchema(f, 'load'),
    ),
    settings: {
      description: '',
      title: 'Secondary Section',
      ...panel.settings,
    },
  }))

  const rules: V5CalculationRule[] = Array.isArray(rawSettingsObj?.rules)
    ? JSON.parse(JSON.stringify(rawSettingsObj.rules))
    : []

  // Hydrate formulaTokens and calculationRules from V5 settings.rules calculations onto target fields/columns.
  // Process unconditional rules first so base formulas take priority over conditional overrides.
  const orderedRules = [
    ...rules.filter((r) => !r.isConditionalRule),
    ...rules.filter((r) => r.isConditionalRule),
  ]

  for (const rule of orderedRules) {
    if (!Array.isArray(rule.calculations)) continue
    for (const calc of rule.calculations) {
      if (!calc.fieldId || !Array.isArray(calc.formula)) continue
      if (calc.columnId) {
        // Table column calculation
        for (const panel of panels) {
          const tableField = (panel.fields || []).find(
            (f: any) => f.id === calc.fieldId,
          )
          if (!tableField) continue
          const col = (tableField.settings?.specific?.tableColumns || []).find(
            (c: any) => c.id === calc.columnId,
          )
          if (col) {
            col.settings = col.settings || {}
            col.settings.specific = col.settings.specific || {}
            const convertedTokens = convertV5FormulaToV6Tokens(
              calc.formula,
              panels,
              tableField.id,
            )
            if (
              !rule.isConditionalRule &&
              (!Array.isArray(col.settings.specific.formulaTokens) ||
                col.settings.specific.formulaTokens.length === 0)
            ) {
              col.settings.specific.formulaTokens = convertedTokens
            }
            col.settings.specific.calculationRules = Array.isArray(
              col.settings.specific.calculationRules,
            )
              ? col.settings.specific.calculationRules
              : []
            col.settings.specific.calculationRules.push({
              calcId: calc.id,
              columnId: calc.columnId,
              conditions: Array.isArray(rule.conditions)
                ? JSON.parse(JSON.stringify(rule.conditions))
                : [],
              fieldId: calc.fieldId,
              formulaTokens: convertedTokens,
              groupLogic: rule.groupLogic || 'ALL',
              isConditionalRule: Boolean(rule.isConditionalRule),
              ruleId: rule.id,
              ruleName: rule.name || '',
            })
          }
        }
      } else {
        // Top-level field calculation
        for (const panel of panels) {
          const targetField = (panel.fields || []).find(
            (f: any) => f.id === calc.fieldId,
          )
          if (targetField) {
            targetField.settings = targetField.settings || {}
            targetField.settings.specific = targetField.settings.specific || {}
            const convertedTokens = convertV5FormulaToV6Tokens(
              calc.formula,
              panels,
            )
            if (
              !rule.isConditionalRule &&
              (!Array.isArray(targetField.settings.specific.formulaTokens) ||
                targetField.settings.specific.formulaTokens.length === 0)
            ) {
              targetField.settings.specific.formulaTokens = convertedTokens
            }
            targetField.settings.specific.calculationRules = Array.isArray(
              targetField.settings.specific.calculationRules,
            )
              ? targetField.settings.specific.calculationRules
              : []
            targetField.settings.specific.calculationRules.push({
              calcId: calc.id,
              columnId: '',
              conditions: Array.isArray(rule.conditions)
                ? JSON.parse(JSON.stringify(rule.conditions))
                : [],
              fieldId: calc.fieldId,
              formulaTokens: convertedTokens,
              groupLogic: rule.groupLogic || 'ALL',
              isConditionalRule: Boolean(rule.isConditionalRule),
              ruleId: rule.id,
              ruleName: rule.name || '',
            })
          }
        }
      }
    }
  }

  return {
    panels,
    rawFormRoot: JSON.parse(JSON.stringify(rawFormRoot || {})),
    rawSettings: JSON.parse(JSON.stringify(rawSettingsObj || {})),
    rules,
    secondaryPanels,
    settings: rawSettingsObj || {},
  }
}

/**
 * Synchronizes V6 field/column `formulaTokens` back into V5 `settings.rules` array
 * while preserving any conditional calculation rules, declarative rules, and existing token metadata.
 */
export function syncFormulaTokensToRules(
  panels: any[],
  existingRules: V5CalculationRule[] = [],
): V5CalculationRule[] {
  const clonedRules: V5CalculationRule[] = JSON.parse(
    JSON.stringify(existingRules || []),
  )

  const upsertCalculation = (
    fieldId: string,
    columnId: string,
    tokens: FormulaToken[],
    label: string,
  ) => {
    // Look for an existing unconditional calculation targeting this fieldId + columnId
    for (const rule of clonedRules) {
      if (rule.isConditionalRule) continue
      if (!Array.isArray(rule.calculations)) continue
      const existingCalc = rule.calculations.find(
        (c) =>
          c.fieldId === fieldId &&
          String(c.columnId || '') === String(columnId || ''),
      )
      if (existingCalc) {
        existingCalc.formula = convertV6TokensToV5Formula(
          tokens,
          columnId ? fieldId : undefined,
          panels,
          existingCalc.formula,
        )
        return
      }
    }

    const v5Formula = convertV6TokensToV5Formula(
      tokens,
      columnId ? fieldId : undefined,
      panels,
    )

    // Create a new V5 calculation rule entry
    clonedRules.push({
      calculations: [
        {
          columnId: columnId || '',
          fieldId,
          formula: v5Formula,
          id: makeAdapterId(),
        },
      ],
      conditions: [],
      groupLogic: 'ANY',
      id: makeAdapterId(),
      isConditionalRule: false,
      name: `Calculation - ${label}`,
    })
  }

  for (const panel of panels || []) {
    for (const field of panel.fields || []) {
      if (
        field.type === 'CALCULATED' &&
        Array.isArray(field.settings?.specific?.formulaTokens) &&
        field.settings.specific.formulaTokens.length > 0
      ) {
        upsertCalculation(
          field.id,
          '',
          field.settings.specific.formulaTokens,
          field.label || field.id,
        )
      }

      if (field.type === 'TABLE' || field.type === 'DYNAMIC_TABLE') {
        const cols = field.settings?.specific?.tableColumns || []
        for (const col of cols) {
          if (
            col.type === 'CALCULATED' &&
            Array.isArray(col.settings?.specific?.formulaTokens) &&
            col.settings.specific.formulaTokens.length > 0
          ) {
            upsertCalculation(
              field.id,
              col.id,
              col.settings.specific.formulaTokens,
              `${field.label || 'Table'}.${col.name || col.label || col.id}`,
            )
          }
        }
      }
    }
  }

  return clonedRules
}

/**
 * Remaps field/column references inside a cloned field using `idMap`.
 * Any ID not present in `idMap` (such as an external field in another panel) is preserved untouched.
 */
function remapFieldReferences(field: any, idMap: Map<string, string>): any {
  const remap = (id: any): any => {
    if (typeof id !== 'string') return id
    if (idMap.has(id)) return idMap.get(id)!
    if (id.includes('.')) {
      const parts = id.split('.')
      if (parts.length === 2) {
        const remappedTbl = idMap.has(parts[0]) ? idMap.get(parts[0])! : parts[0]
        const remappedCol = idMap.has(parts[1]) ? idMap.get(parts[1])! : parts[1]
        return `${remappedTbl}.${remappedCol}`
      }
    }
    return id
  }

  const spec = field.settings?.specific
  const val = field.settings?.validation
  const lookup = field.settings?.lookupSettings
  const ai = field.settings?.aiSettings

  if (spec) {
    if (spec.parentFieldId) spec.parentFieldId = remap(spec.parentFieldId)
    if (spec.masterPreselectSourceFieldId) {
      spec.masterPreselectSourceFieldId = remap(spec.masterPreselectSourceFieldId)
    }
    if (spec.parentDateField) spec.parentDateField = remap(spec.parentDateField)
    if (spec.parentDateFieldId) {
      spec.parentDateFieldId = remap(spec.parentDateFieldId)
    }
    if (spec.currencyParentField) {
      spec.currencyParentField = remap(spec.currencyParentField)
    }
    if (spec.currencyParentFieldId) {
      spec.currencyParentFieldId = remap(spec.currencyParentFieldId)
    }
    if (spec.existingFieldId) spec.existingFieldId = remap(spec.existingFieldId)
    if (Array.isArray(spec.formSyncField)) {
      spec.formSyncField = spec.formSyncField.map(remap)
    }
    if (Array.isArray(spec.masterFormConditionColumn)) {
      spec.masterFormConditionColumn = spec.masterFormConditionColumn.map(
        (c: any) => {
          const nextCol = remap(c.formColumn || c.formField || '')
          return {
            ...c,
            formColumn: nextCol,
            formField: nextCol,
          }
        },
      )
    }
    if (Array.isArray(spec.masterFormSyncSettings)) {
      spec.masterFormSyncSettings = spec.masterFormSyncSettings.map(
        (s: any) => ({
          ...s,
          formField: remap(s.formField),
          id: makeAdapterId(),
        }),
      )
    }
    if (Array.isArray(spec.addressMatchingFields)) {
      spec.addressMatchingFields = spec.addressMatchingFields.map((a: any) => ({
        ...a,
        id: makeAdapterId(),
        selectFieldColumn: Array.isArray(a.selectFieldColumn)
          ? a.selectFieldColumn.map(remap)
          : a.selectFieldColumn,
      }))
    }
    const remapFormulaTokensList = (tokens: FormulaToken[]) =>
      tokens.map((tok: FormulaToken) => {
        if (tok.type === 'FIELD') {
          return { ...tok, value: remap(tok.value) }
        }
        if (tok.type === 'TABLE_SUM') {
          const { columnId, tableFieldId } = decodeTableSumValue(tok.value)
          if (columnId) {
            return {
              ...tok,
              value: encodeTableSumValue(remap(tableFieldId), remap(columnId)),
            }
          }
          return { ...tok, value: remap(tok.value) }
        }
        return tok
      })

    if (Array.isArray(spec.formulaTokens)) {
      spec.formulaTokens = remapFormulaTokensList(spec.formulaTokens)
    }
    if (Array.isArray(spec.calculationRules)) {
      spec.calculationRules = spec.calculationRules.map((cr: any) => ({
        ...cr,
        calcId: makeAdapterId(),
        columnId: cr.columnId ? remap(cr.columnId) : '',
        conditions: Array.isArray(cr.conditions)
          ? cr.conditions.map((cond: any) => ({
              ...cond,
              ...(cond.field ? { field: remap(cond.field) } : {}),
              ...(cond.fieldId ? { fieldId: remap(cond.fieldId) } : {}),
              ...(cond.name ? { name: remap(cond.name) } : {}),
              ...(cond.fieldValue && typeof cond.value === 'string'
                ? { value: remap(cond.value) }
                : {}),
            }))
          : [],
        fieldId: remap(cr.fieldId),
        formulaTokens: Array.isArray(cr.formulaTokens)
          ? remapFormulaTokensList(cr.formulaTokens)
          : cr.formulaTokens,
        ruleId: makeAdapterId(),
      }))
    }
  }

  if (val) {
    if (val.minimumNumberField) {
      val.minimumNumberField = remap(val.minimumNumberField)
    }
    if (val.maximumNumberField) {
      val.maximumNumberField = remap(val.maximumNumberField)
    }
    if (val.documentExpiryField) {
      val.documentExpiryField = remap(val.documentExpiryField)
    }
    if (val.expiryFieldId) {
      val.expiryFieldId = remap(val.expiryFieldId)
    }
    if (Array.isArray(val.assignOtherControls)) {
      val.assignOtherControls = val.assignOtherControls.map(remap)
    }
    if (Array.isArray(val.enableSettings)) {
      val.enableSettings = val.enableSettings.map((r: any) => ({
        ...r,
        controls: Array.isArray(r.controls) ? r.controls.map(remap) : [],
        id: makeAdapterId(),
      }))
    }
    if (Array.isArray(val.mandatorySettings)) {
      val.mandatorySettings = val.mandatorySettings.map((r: any) => ({
        ...r,
        controls: Array.isArray(r.controls) ? r.controls.map(remap) : [],
        id: makeAdapterId(),
      }))
    }
    if (Array.isArray(val.readonlySettings)) {
      val.readonlySettings = val.readonlySettings.map((r: any) => ({
        ...r,
        controls: Array.isArray(r.controls) ? r.controls.map(remap) : [],
        id: makeAdapterId(),
      }))
    }
  }

  if (lookup) {
    if (lookup.parentField) lookup.parentField = remap(lookup.parentField)
    if (lookup.cascadeFromColumn) {
      lookup.cascadeFromColumn = remap(lookup.cascadeFromColumn)
    }
    if (Array.isArray(lookup.syncFieldsForAPI)) {
      lookup.syncFieldsForAPI = lookup.syncFieldsForAPI.map((item: any) => {
        const mappedField = remap(item.formField || item.fieldName || '')
        return {
          ...item,
          fieldName: mappedField,
          formField: mappedField,
          id: makeAdapterId(),
        }
      })
    }
    if (Array.isArray(lookup.conditionMappings)) {
      lookup.conditionMappings = lookup.conditionMappings.map((cm: any) => ({
        ...cm,
        fieldId: remap(cm.fieldId),
      }))
    }
  }

  if (ai) {
    if (ai.lineItemSourceFieldId) {
      ai.lineItemSourceFieldId = remap(ai.lineItemSourceFieldId)
    }
    if (Array.isArray(ai.imageFileValidate?.formFields)) {
      ai.imageFileValidate.formFields =
        ai.imageFileValidate.formFields.map(remap)
    }
    if (ai.formControlValidate) {
      if (typeof ai.formControlValidate.formFields === 'string') {
        ai.formControlValidate.formFields = remap(
          ai.formControlValidate.formFields,
        )
      }
      if (Array.isArray(ai.formControlValidate.existingFormFields)) {
        ai.formControlValidate.existingFormFields =
          ai.formControlValidate.existingFormFields.map(remap)
      }
    }
  }

  return field
}

const TRANSIENT_FIELD_KEYS = [
  'filterBy',
  'filter',
  'filters',
  'isManualChange',
  'lookupFilterBy',
  'lookupFilter',
]

/**
 * Cleans and normalizes a field for saving to V5/V6 formJson payload.
 */
export function serializeFieldForSave(rawField: any): any {
  const cleaned = normalizeFieldSchema(rawField, 'save')
  for (const key of TRANSIENT_FIELD_KEYS) {
    delete cleaned[key]
  }

  // Ensure MATRIX fields serialize structured V5 object arrays in matrixColumns & matrixRows
  if (cleaned.type === 'MATRIX' && cleaned.settings?.specific) {
    const spec = cleaned.settings.specific
    if (
      Array.isArray(spec.matrixColumnObjects) &&
      spec.matrixColumnObjects.length > 0
    ) {
      spec.matrixColumns = spec.matrixColumnObjects
    }
    if (
      Array.isArray(spec.matrixRowObjects) &&
      spec.matrixRowObjects.length > 0
    ) {
      spec.matrixRows = spec.matrixRowObjects
    }
  }

  return cleaned
}

/**
 * Serializes the V6 FormStore state back into a lossless V5/V6 compatible `formJson` object.
 */
export function serializeFormPayload(state: any): Record<string, any> {
  const cleanedPanels = (state.panels || []).map((p: any) => ({
    ...p,
    fields: (p.fields || []).map((f: any) => serializeFieldForSave(f)),
  }))

  const cleanedSecondaryPanels = (state.secondaryPanels || []).map(
    (p: any) => ({
      ...p,
      fields: (p.fields || []).map((f: any) => serializeFieldForSave(f)),
    }),
  )

  const syncedRules = syncFormulaTokensToRules(cleanedPanels, state.rules || [])

  const v5Layout = mapV6LayoutToV5(state.layout)

  return {
    isDeleted: false,
    ...(state.rawFormRoot || {}),
    panels: cleanedPanels,
    secondaryPanels: cleanedSecondaryPanels,
    uid: state.uid,
    settings: {
      ...(state.rawSettings || {}),
      general: {
        ...(state.rawSettingsGeneral || {}),
        closedMessage: state.closedMessage,
        conversationalMode: state.conversationalMode,
        coordinator: state.coordinator || (state.superUser?.[0] ?? ''),
        description: state.description || '',
        entryUser: state.entryUser || [],
        footerText: state.footerText || '',
        headerText: state.headerText || '',
        layout: v5Layout,
        name: state.name || 'Untitled Form',
        qrFields: state.qrFields || [],
        responseLimit: state.responseLimit,
        showHeaderFooter: state.showHeaderFooter,
        superUser: state.superUser || [],
        type: state.formType || 'WORKFLOW',
        uniqueColumns: state.uniqueColumns || [],
      },
      hubLinkIds: state.hubLinkIds ?? state.rawSettings?.hubLinkIds ?? [],
      publish: {
        ...(state.rawPublish || {}),
        publishOption: state.publishStatus || 'DRAFT',
        publishSchedule:
          state.scheduleStart ?? state.rawPublish?.publishSchedule ?? '',
        unpublishSchedule:
          state.scheduleEnd ?? state.rawPublish?.unpublishSchedule ?? '',
      },
      rules: syncedRules,
    },
  }
}
