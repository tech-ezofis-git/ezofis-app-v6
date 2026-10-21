/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Panel, Question } from '@/pages/form-builder/store/formStore'
import { evaluateRuleConditions } from './ruleEngine'

export const FORMULA_SOURCE_TYPES = [
  'NUMBER',
  'COUNTER',
  'CURRENCY_AMOUNT',
  'CURRENCY',
  'CALCULATED',
  'DATE',
  'TIME',
  'DATE_TIME',
  'SINGLE_SELECT',
] as const

export const TABLE_SUM_SEPARATOR = '::'

export type FormulaToken = {
  id?: string
  label?: string
  name?: string
  type: 'FIELD' | 'FUNCTION' | 'NUMBER' | 'OPERATOR' | 'TABLE_SUM'
  value: string
}

type FormulaFieldRef = {
  id: string
  jsonId?: string
  label?: string
  name?: string
  settings?: {
    specific?: {
      calculationRules?: any[]
      decimalPrecision?: number | string
      formulaTokens?: FormulaToken[]
      isCalculationEnabled?: boolean
      tableColumns?: Array<{
        id: string
        jsonId?: string
        label?: string
        name?: string
        settings?: Record<string, any>
        type?: string
      }>
    }
    validation?: {
      contentRule?: string
      decimalDigits?: number | string
      decimalValue?: number | string
      isCalculationEnabled?: boolean
    }
  }
  type?: string
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

export const isFormulaSourceType = (
  type?: string,
): type is (typeof FORMULA_SOURCE_TYPES)[number] =>
  Boolean(type && (FORMULA_SOURCE_TYPES as readonly string[]).includes(type))

export const isTableFieldType = (type?: string) =>
  type === 'TABLE' || type === 'DYNAMIC_TABLE'

export const encodeTableSumValue = (tableFieldId: string, columnId: string) =>
  `${tableFieldId}${TABLE_SUM_SEPARATOR}${columnId}`

export const decodeTableSumValue = (value: string) => {
  const raw = String(value ?? '').trim()
  if (raw.toUpperCase().startsWith('SUM OF ')) {
    return {
      columnId: raw.slice(7).trim(),
      tableFieldId: '',
    }
  }

  const doubleColonIdx = raw.indexOf(TABLE_SUM_SEPARATOR)
  if (doubleColonIdx >= 0) {
    return {
      columnId: raw.slice(doubleColonIdx + TABLE_SUM_SEPARATOR.length),
      tableFieldId: raw.slice(0, doubleColonIdx),
    }
  }

  const singleColonIdx = raw.indexOf(':')
  if (singleColonIdx >= 0) {
    return {
      columnId: raw.slice(singleColonIdx + 1),
      tableFieldId: raw.slice(0, singleColonIdx),
    }
  }

  return { columnId: '', tableFieldId: raw }
}

export const getNumericTableColumns = (field?: FormulaFieldRef) =>
  (field?.settings?.specific?.tableColumns || []).filter((column) =>
    isFormulaSourceType(column.type),
  )

export const extractNumericValue = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'boolean') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (Array.isArray(value)) return null
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    return extractNumericValue(
      record.amount ?? record.value ?? record.number ?? record.count,
    )
  }
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null

  // Strip optional leading/trailing currency code or symbol (e.g. "$1,250.50", "USD 100.00")
  // while rejecting invalid arbitrary strings like "abc" or "12abc"
  const withoutCurrency = trimmed
    .replace(/^[A-Za-z]{3}\s+/, '')
    .replace(/\s+[A-Za-z]{3}$/, '')
    .replace(/^[$€£¥₹]\s*/, '')
    .replace(/,/g, '')
    .trim()

  if (!/^[+-]?(\d+(\.\d+)?|\.\d+)$/.test(withoutCurrency)) {
    return null
  }

  const parsed = Number(withoutCurrency)
  return Number.isFinite(parsed) ? parsed : null
}

function parseDateDaysOperand(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const ms = new Date(trimmed).getTime()
  if (!Number.isFinite(ms)) return null
  return ms / (1000 * 3600 * 24)
}

function parseDateTimeMinutesOperand(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const ms = new Date(trimmed).getTime()
  if (!Number.isFinite(ms)) return null
  return ms / 60000
}

function parseTimeMinutesOperand(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null

  const formatSplit = trimmed.split(/\s+/)
  const timeSplit = formatSplit[0].split(':')
  if (timeSplit.length < 2) return null

  const hours = Number.parseInt(timeSplit[0], 10)
  const mins = Number.parseInt(timeSplit[1], 10)
  if (!Number.isFinite(hours) || !Number.isFinite(mins)) return null

  const meridiem = (formatSplit[1] || '').toUpperCase()
  if (meridiem === 'AM') {
    const h = hours === 12 ? 0 : hours
    return h * 60 + mins
  }
  if (meridiem === 'PM') {
    const h = hours === 12 ? 12 : hours + 12
    return h * 60 + mins
  }
  return hours * 60 + mins
}

const normalizeTableRows = (rows: unknown): Array<Record<string, unknown>> => {
  let parsed: unknown = rows
  if (typeof parsed === 'string') {
    const trimmed = parsed.trim()
    if (!trimmed) return []
    try {
      parsed = JSON.parse(trimmed)
    } catch {
      return []
    }
  }
  if (!Array.isArray(parsed)) return []
  return parsed.filter(
    (row): row is Record<string, unknown> =>
      Boolean(row) && typeof row === 'object',
  )
}

const cellValueFromRow = (
  row: Record<string, unknown>,
  columnId: string,
  aliases: string[] = [],
) => {
  const keys = [columnId, ...aliases].filter(Boolean)
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
      return row[key]
    }
  }
  const wanted = columnId.trim().toLowerCase()
  if (!wanted) return undefined
  for (const [key, value] of Object.entries(row)) {
    if (key.startsWith('_')) continue
    if (key.trim().toLowerCase() === wanted) return value
  }
  return undefined
}

export const sumTableColumn = (
  rows: unknown,
  columnId: string,
  aliases: string[] = [],
): number => {
  if (!columnId) return 0
  return normalizeTableRows(rows).reduce((total, row) => {
    const parsed = extractNumericValue(cellValueFromRow(row, columnId, aliases))
    return total + (parsed ?? 0)
  }, 0)
}

const formatTableSumLabel = (
  tokenValue: string,
  fields: FormulaFieldRef[],
): string => {
  const { columnId, tableFieldId } = decodeTableSumValue(tokenValue)
  const table = fields.find(
    (field) =>
      field.id === tableFieldId ||
      (!tableFieldId &&
        field.settings?.specific?.tableColumns?.some((c) => c.id === columnId)),
  )
  const column = table?.settings?.specific?.tableColumns?.find(
    (item) => item.id === columnId,
  )
  const tableLabel = table?.label || 'Table'
  const columnLabel = column?.name || column?.label || 'Column'
  return `Sum(${tableLabel}.${columnLabel})`
}

const OPERATOR_LABELS: Record<string, string> = {
  '(': '(',
  ')': ')',
  '*': '×',
  '+': '+',
  ',': ',',
  '-': '−',
  '/': '÷',
}

function normalizeRuntimeToken(raw: any): FormulaToken | null {
  if (!raw || typeof raw !== 'object') return null

  const rawType = String(raw.type || '').toUpperCase()
  const rawName = String(raw.name || '').toUpperCase()
  const rawValue = String(raw.value ?? '').trim()

  if (
    ['FIELD', 'FUNCTION', 'NUMBER', 'OPERATOR', 'TABLE_SUM'].includes(
      rawType,
    ) &&
    !rawName
  ) {
    return {
      type: rawType as FormulaToken['type'],
      value: rawValue,
    }
  }

  const key = rawName || rawType
  if (key in V5_OPERATOR_BY_NAME) {
    return {
      type: 'OPERATOR',
      value: V5_OPERATOR_BY_NAME[key],
    }
  }

  if (
    key === 'ARITHMETIC_OPERATOR' ||
    ['(', ')', '+', '-', '*', '/', ','].includes(rawValue)
  ) {
    return {
      type: 'OPERATOR',
      value: rawValue,
    }
  }

  if (key === 'NUMBER') {
    return {
      type: 'NUMBER',
      value: rawValue,
    }
  }

  if (key === 'FUNCTION') {
    return {
      type: 'FUNCTION',
      value: rawValue.toUpperCase(),
    }
  }

  if (key === 'TABLE_SUM') {
    return {
      type: 'TABLE_SUM',
      value: rawValue,
    }
  }

  if (key === 'FIELD') {
    if (rawValue.toUpperCase().startsWith('SUM OF ')) {
      const colId = rawValue.slice(7).trim()
      return {
        type: 'TABLE_SUM',
        value: encodeTableSumValue('', colId),
      }
    }
    return {
      type: 'FIELD',
      value: rawValue,
    }
  }

  return null
}

export const formatFormulaExpression = (
  tokens: FormulaToken[] | undefined,
  fields: FormulaFieldRef[],
): string => {
  if (!tokens?.length) return ''

  const normalized = tokens
    .map(normalizeRuntimeToken)
    .filter((t): t is FormulaToken => Boolean(t))

  return normalized
    .map((token, index) => {
      const previous = normalized[index - 1]
      let text = token.value
      if (token.type === 'FIELD') {
        text =
          fields.find((field) => field.id === token.value)?.label ||
          'Unknown field'
      } else if (token.type === 'TABLE_SUM') {
        text = formatTableSumLabel(token.value, fields)
      } else if (token.type === 'FUNCTION') {
        text = token.value.toUpperCase()
      } else if (token.type === 'OPERATOR') {
        text = OPERATOR_LABELS[token.value] ?? token.value
      }

      const skipSpace =
        token.value === ')' ||
        token.value === ',' ||
        previous?.value === '(' ||
        previous?.type === 'FUNCTION'
      return `${skipSpace || index === 0 ? '' : ' '}${text}`
    })
    .join('')
}

export const formatCalculatedResult = (
  value: number,
  precision?: number,
): string => {
  if (!Number.isFinite(value)) return ''
  if (precision !== undefined && precision >= 0) {
    return value.toFixed(precision)
  }
  if (Number.isInteger(value)) return String(value)
  return String(Number(value.toFixed(6)))
}

const isCalculationEnabled = (field: Question): boolean =>
  field.settings?.validation?.isCalculationEnabled !== false &&
  field.settings?.specific?.isCalculationEnabled !== false

const getDecimalPrecision = (field: FormulaFieldRef): number | undefined => {
  const specific = field.settings?.specific?.decimalPrecision
  const validationDigits = field.settings?.validation?.decimalDigits
  const validationValue = field.settings?.validation?.decimalValue
  const raw = specific ?? validationDigits ?? validationValue
  if (raw === undefined || raw === null || String(raw).trim() === '')
    return undefined
  const parsed = Number(raw)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined
}

function findFieldOrColumnMeta(
  refId: string,
  fields: FormulaFieldRef[],
): {
  column?: NonNullable<
    NonNullable<
      NonNullable<FormulaFieldRef['settings']>['specific']
    >['tableColumns']
  >[number]
  field?: FormulaFieldRef
  isTableColumn: boolean
  parentTable?: FormulaFieldRef
} {
  for (const field of fields) {
    if (
      field.id === refId ||
      field.jsonId === refId ||
      (field.name && field.name === refId)
    ) {
      return { field, isTableColumn: false }
    }
  }
  for (const field of fields) {
    if (!isTableFieldType(field.type)) continue
    for (const col of field.settings?.specific?.tableColumns || []) {
      if (
        col.id === refId ||
        col.jsonId === refId ||
        (col.name && col.name === refId)
      ) {
        return {
          column: col,
          isTableColumn: true,
          parentTable: field,
        }
      }
    }
  }
  return { isTableColumn: false }
}

function resolveTableSumByIds(
  tableFieldId: string,
  columnId: string,
  values: Record<string, unknown>,
  fields: FormulaFieldRef[],
): number {
  const table = fields.find(
    (field) =>
      (tableFieldId &&
        (field.id === tableFieldId ||
          field.jsonId === tableFieldId ||
          field.name === tableFieldId)) ||
      (!tableFieldId &&
        isTableFieldType(field.type) &&
        field.settings?.specific?.tableColumns?.some(
          (item) =>
            item.id === columnId ||
            item.jsonId === columnId ||
            item.name === columnId,
        )),
  )

  const column = table?.settings?.specific?.tableColumns?.find(
    (item) =>
      item.id === columnId ||
      item.jsonId === columnId ||
      item.name === columnId,
  )

  const aliases = [
    column?.id || '',
    column?.jsonId || '',
    column?.name || '',
    column?.label || '',
  ].filter(Boolean)

  const directRows =
    (tableFieldId ? values[tableFieldId] : undefined) ??
    (table?.id ? values[table.id] : undefined) ??
    (table?.jsonId ? values[table.jsonId] : undefined) ??
    (table?.name ? values[table.name] : undefined)

  if (directRows !== undefined) {
    return sumTableColumn(directRows, columnId, aliases)
  }

  // Fallback: if tableFieldId is unknown or not in `fields`, scan array entries in `values`
  let fallbackTotal = 0
  for (const val of Object.values(values)) {
    if (Array.isArray(val)) {
      fallbackTotal += sumTableColumn(val, columnId, aliases)
    }
  }
  return fallbackTotal
}

export const evaluateFormula = (
  rawTokens: Array<FormulaToken | Record<string, any>> | undefined,
  values: Record<string, unknown>,
  fields: FormulaFieldRef[] = [],
): number | null => {
  if (!rawTokens?.length) return null

  const tokens = rawTokens
    .map(normalizeRuntimeToken)
    .filter((t): t is FormulaToken => Boolean(t))

  if (!tokens.length) return null

  let index = 0
  let timeCalculation = false
  const peek = () => tokens[index]
  const consume = () => tokens[index++]

  const resolveFieldOperand = (refId: string): number => {
    if (refId.toUpperCase().startsWith('SUM OF ')) {
      const colId = refId.slice(7).trim()
      return resolveTableSumByIds('', colId, values, fields)
    }

    const meta = findFieldOrColumnMeta(refId, fields)

    // Lookup direct scalar value in `values` (supporting row context or top-level form context)
    const candidateKeys = [
      refId,
      meta.field?.id,
      meta.field?.jsonId,
      meta.field?.name,
      meta.column?.id,
      meta.column?.jsonId,
      meta.column?.name,
    ].filter((k): k is string => Boolean(k))

    let rawVal: unknown
    let foundDirect = false
    for (const key of candidateKeys) {
      if (key in values && !Array.isArray(values[key])) {
        rawVal = values[key]
        foundDirect = true
        break
      }
    }

    // If not found as a direct scalar, check if this `FIELD` token references a table column
    // in a form-level formula (V5 formula.js automatic column sum behavior)
    if (!foundDirect) {
      if (meta.isTableColumn && meta.parentTable) {
        return resolveTableSumByIds(
          meta.parentTable.id,
          meta.column?.id || refId,
          values,
          fields,
        )
      }
      // Or if `values` contains table row arrays that have `refId` as a cell property
      const hasTableRowsWithCol = Object.values(values).some(
        (v) =>
          Array.isArray(v) &&
          v.some((row) => row && typeof row === 'object' && refId in row),
      )
      if (hasTableRowsWithCol) {
        return resolveTableSumByIds('', refId, values, fields)
      }
      throw new Error('Missing field value')
    }

    const effectiveType = (
      meta.field?.type ||
      meta.column?.type ||
      ''
    ).toUpperCase()

    if (effectiveType === 'DATE') {
      const days = parseDateDaysOperand(rawVal)
      if (days === null) throw new Error('Invalid date value')
      return days
    }

    if (effectiveType === 'TIME') {
      timeCalculation = true
      const mins = parseTimeMinutesOperand(rawVal)
      if (mins === null) throw new Error('Invalid time value')
      return mins
    }

    if (effectiveType === 'DATE_TIME') {
      const mins = parseDateTimeMinutesOperand(rawVal)
      if (mins === null) throw new Error('Invalid date_time value')
      return mins
    }

    const parsed = extractNumericValue(rawVal)
    if (parsed === null) {
      // A blank Qty / Price / Discount is 0. Throwing here wipes the
      // calculated Subtotal column back to "" on save.
      const blank =
        rawVal == null ||
        (typeof rawVal === 'string' && rawVal.trim() === '')
      if (blank && meta.isTableColumn) return 0
      throw new Error('Missing or invalid field value')
    }
    return parsed
  }

  const parseExpression = (): number => {
    let left = parseTerm()
    while (
      peek()?.type === 'OPERATOR' &&
      (peek().value === '+' || peek().value === '-')
    ) {
      const operator = consume().value
      const right = parseTerm()
      left = operator === '+' ? left + right : left - right
    }
    return left
  }

  const parseTerm = (): number => {
    let left = parseFactor()
    while (
      peek()?.type === 'OPERATOR' &&
      (peek().value === '*' || peek().value === '/')
    ) {
      const operator = consume().value
      const right = parseFactor()
      if (operator === '/') {
        if (right === 0) throw new Error('Division by zero')
        left = left / right
      } else {
        left = left * right
      }
    }
    return left
  }

  const expectClosingParen = () => {
    if (peek()?.type === 'OPERATOR' && peek().value === ')') consume()
    else throw new Error('Missing closing parenthesis')
  }

  const parseAverage = (): number => {
    consume()
    if (peek()?.type === 'OPERATOR' && peek().value === '(') consume()
    else throw new Error('Average requires parentheses')

    const args: number[] = []
    if (!(peek()?.type === 'OPERATOR' && peek().value === ')')) {
      args.push(parseExpression())
      while (peek()?.type === 'OPERATOR' && peek().value === ',') {
        consume()
        args.push(parseExpression())
      }
    }
    expectClosingParen()
    if (args.length === 0) throw new Error('Average needs at least one value')
    return args.reduce((sum, value) => sum + value, 0) / args.length
  }

  const parseFactor = (): number => {
    const token = peek()
    if (!token) throw new Error('Unexpected end of formula')

    if (token.type === 'OPERATOR' && token.value === '-') {
      consume()
      return -parseFactor()
    }

    if (token.type === 'OPERATOR' && token.value === '+') {
      consume()
      return parseFactor()
    }

    if (token.type === 'OPERATOR' && token.value === '(') {
      consume()
      const value = parseExpression()
      expectClosingParen()
      return value
    }

    if (token.type === 'FUNCTION' && token.value.toUpperCase() === 'AVG') {
      return parseAverage()
    }

    if (token.type === 'NUMBER') {
      consume()
      const parsed = Number(token.value)
      if (!Number.isFinite(parsed)) throw new Error('Invalid number')
      return parsed
    }

    if (token.type === 'FIELD') {
      consume()
      return resolveFieldOperand(token.value)
    }

    if (token.type === 'TABLE_SUM') {
      consume()
      const { columnId, tableFieldId } = decodeTableSumValue(token.value)
      return resolveTableSumByIds(tableFieldId, columnId, values, fields)
    }

    throw new Error('Unexpected token')
  }

  try {
    let result = parseExpression()
    if (index < tokens.length) return null
    if (!Number.isFinite(result)) return null
    if (timeCalculation && result <= 0) {
      result += 24
    }
    return result
  } catch {
    return null
  }
}

interface NormalizedCalculationEntry {
  columnId: string
  conditions: any[]
  fieldId: string
  formulaTokens: Array<FormulaToken | Record<string, any>>
  groupLogic: 'ALL' | 'ANY' | 'AND' | 'OR'
  isConditionalRule: boolean
}

function collectCalculationEntries(
  fields: FormulaFieldRef[],
  explicitRules?: any[],
): NormalizedCalculationEntry[] {
  const entries: NormalizedCalculationEntry[] = []
  const seenKeys = new Set<string>()

  const addEntry = (entry: NormalizedCalculationEntry, dedupeKey?: string) => {
    if (dedupeKey && seenKeys.has(dedupeKey)) return
    if (dedupeKey) seenKeys.add(dedupeKey)
    entries.push(entry)
  }

  // 1. From explicit `rules` (e.g. `form.settings.rules` or `useFormStore().rules`)
  if (Array.isArray(explicitRules)) {
    for (const rule of explicitRules) {
      if (!rule || !Array.isArray(rule.calculations)) continue
      for (const calc of rule.calculations) {
        if (!calc?.fieldId || !Array.isArray(calc.formula)) continue
        const key = `${rule.id || ''}::${calc.id || ''}::${calc.fieldId}::${calc.columnId || ''}`
        addEntry(
          {
            columnId: String(calc.columnId || ''),
            conditions: Array.isArray(rule.conditions) ? rule.conditions : [],
            fieldId: String(calc.fieldId),
            formulaTokens: calc.formula,
            groupLogic: rule.groupLogic || 'ALL',
            isConditionalRule: Boolean(rule.isConditionalRule),
          },
          key,
        )
      }
    }
  }

  // 2. From hydrated `calculationRules` attached to fields/columns by `v5SchemaAdapter`
  for (const field of fields) {
    const fieldCalcRules = field.settings?.specific?.calculationRules
    if (Array.isArray(fieldCalcRules)) {
      for (const cr of fieldCalcRules) {
        if (!cr) continue
        const tokens = cr.formulaTokens || cr.formula
        if (!Array.isArray(tokens)) continue
        const key = `${cr.ruleId || ''}::${cr.calcId || ''}::${field.id}::`
        addEntry(
          {
            columnId: '',
            conditions: Array.isArray(cr.conditions) ? cr.conditions : [],
            fieldId: field.id,
            formulaTokens: tokens,
            groupLogic: cr.groupLogic || 'ALL',
            isConditionalRule: Boolean(cr.isConditionalRule),
          },
          key,
        )
      }
    }

    if (isTableFieldType(field.type)) {
      for (const col of field.settings?.specific?.tableColumns || []) {
        const colCalcRules = (col as any).settings?.specific?.calculationRules
        if (Array.isArray(colCalcRules)) {
          for (const cr of colCalcRules) {
            if (!cr) continue
            const tokens = cr.formulaTokens || cr.formula
            if (!Array.isArray(tokens)) continue
            const key = `${cr.ruleId || ''}::${cr.calcId || ''}::${field.id}::${col.id}`
            addEntry(
              {
                columnId: col.id,
                conditions: Array.isArray(cr.conditions) ? cr.conditions : [],
                fieldId: field.id,
                formulaTokens: tokens,
                groupLogic: cr.groupLogic || 'ALL',
                isConditionalRule: Boolean(cr.isConditionalRule),
              },
              key,
            )
          }
        }
      }
    }
  }

  return entries
}

function resolveActiveFormulaTokens(
  baseTokens: Array<FormulaToken | Record<string, any>> | undefined,
  calcEntries: NormalizedCalculationEntry[],
  evalContext: Record<string, any>,
  allFields: Question[],
): Array<FormulaToken | Record<string, any>> | undefined {
  let activeTokens: Array<FormulaToken | Record<string, any>> | undefined =
    baseTokens && baseTokens.length > 0 ? baseTokens : undefined

  // Unconditional rules provide/override the base formula if present
  for (const entry of calcEntries) {
    if (!entry.isConditionalRule && entry.formulaTokens.length > 0) {
      activeTokens = entry.formulaTokens
    }
  }

  // Conditional rules override when their conditions match
  for (const entry of calcEntries) {
    if (!entry.isConditionalRule) continue
    const isMatched = evaluateRuleConditions(
      entry.conditions,
      evalContext,
      entry.groupLogic || 'ALL',
      allFields,
    )
    if (isMatched) {
      activeTokens = entry.formulaTokens
    }
  }

  return activeTokens
}

const compactFormulaLabel = (value: string) =>
  value.toLowerCase().replace(/[\s._-]+/g, '')

const formulaQuoteScope = (label: string) => {
  const compact = compactFormulaLabel(label)
  if (compact.includes('quote3') || compact.startsWith('opt')) return 'opt'
  if (compact.includes('quote2') || compact.startsWith('alt')) return 'alt'
  return 'main'
}

const formulaBaseLabel = (label: string) => {
  let compact = compactFormulaLabel(label)
  if (compact.startsWith('quote3')) compact = compact.slice('quote3'.length)
  else if (compact.startsWith('quote2')) compact = compact.slice('quote2'.length)
  else if (compact.startsWith('optional')) compact = compact.slice('optional'.length)
  else if (compact.startsWith('opt')) compact = compact.slice('opt'.length)
  else if (compact.startsWith('alternative'))
    compact = compact.slice('alternative'.length)
  else if (compact.startsWith('alt')) compact = compact.slice('alt'.length)
  return compact
}

const formulaFieldLabel = (field: FormulaFieldRef) =>
  String(field.label || field.name || '')

/** Retarget Quote 1 operands inside a quote_2 / quote_3 formula onto that quote. */
const remapCrossVariantFormulaTokens = (
  rawTokens: Array<FormulaToken | Record<string, any>> | undefined,
  target: FormulaFieldRef,
  fields: FormulaFieldRef[],
) => {
  if (!rawTokens?.length) return rawTokens
  const targetScope = formulaQuoteScope(formulaFieldLabel(target))
  if (targetScope === 'main') return rawTokens
  return rawTokens.map((token) => {
    const type = String((token as FormulaToken).type || '')
    const value = String((token as FormulaToken).value || '')
    if (type !== 'FIELD' || !value) return token
    const ref = fields.find(
      (field) =>
        field.id === value || field.jsonId === value || field.name === value,
    )
    if (!ref || formulaQuoteScope(formulaFieldLabel(ref)) === targetScope) {
      return token
    }
    const base = formulaBaseLabel(formulaFieldLabel(ref))
    const replacement = fields.find(
      (field) =>
        formulaQuoteScope(formulaFieldLabel(field)) === targetScope &&
        formulaBaseLabel(formulaFieldLabel(field)) === base,
    )
    if (!replacement) return token
    return { ...token, value: replacement.id }
  })
}

export const applyCalculatedFields = (
  panels: Panel[] | undefined,
  values: Record<string, unknown>,
  rules?: any[],
): Record<string, unknown> => {
  const next: Record<string, unknown> = { ...values }
  const fields = (panels ?? []).flatMap((panel) => panel?.fields ?? [])
  const calcEntries = collectCalculationEntries(fields, rules)

  // Step 1: Evaluate row-level CALCULATED columns inside TABLE / DYNAMIC_TABLE fields first,
  // so form-level TABLE_SUM tokens referencing calculated table columns see up-to-date row values.
  for (const field of fields) {
    if (!isTableFieldType(field.type)) continue
    const rawRows = next[field.id]
    if (!Array.isArray(rawRows) || rawRows.length === 0) continue

    const tableCols = field.settings?.specific?.tableColumns || []
    const calcCols = tableCols.filter((col) => {
      const colAny = col as any
      const hasTokens =
        Array.isArray(colAny.settings?.specific?.formulaTokens) &&
        colAny.settings.specific.formulaTokens.length > 0
      const hasRule = calcEntries.some(
        (e) => e.fieldId === field.id && e.columnId === col.id,
      )
      return col.type === 'CALCULATED' || hasTokens || hasRule
    })

    if (calcCols.length === 0) continue

    const updatedRows = rawRows.map((row) =>
      row && typeof row === 'object'
        ? { ...(row as Record<string, unknown>) }
        : row,
    )

    const colRefs: FormulaFieldRef[] = [
      ...fields,
      ...tableCols.map((c) => ({
        id: c.id,
        jsonId: (c as any).jsonId,
        label: (c as any).label || c.name,
        name: c.name,
        type: c.type,
        settings: (c as any).settings,
      })),
    ]

    for (let pass = 0; pass < Math.max(1, calcCols.length); pass += 1) {
      let rowChanged = false
      for (let rIdx = 0; rIdx < updatedRows.length; rIdx += 1) {
        const rowObj = updatedRows[rIdx]
        if (!rowObj || typeof rowObj !== 'object') continue
        const rowRecord = rowObj as Record<string, unknown>

        for (const col of calcCols) {
          const colAny = col as any
          const colEntries = calcEntries.filter(
            (e) => e.fieldId === field.id && e.columnId === col.id,
          )
          const rowContext: Record<string, unknown> = {
            ...next,
            ...rowRecord,
            [field.id]: updatedRows,
          }
          const activeTokens = resolveActiveFormulaTokens(
            colAny.settings?.specific?.formulaTokens,
            colEntries,
            rowContext,
            fields,
          )
          const result = evaluateFormula(activeTokens, rowContext, colRefs)
          const precision = getDecimalPrecision({
            id: col.id,
            settings: colAny.settings,
          })
          const formatted =
            result === null ? '' : formatCalculatedResult(result, precision)
          if (rowRecord[col.id] !== formatted) {
            rowRecord[col.id] = formatted
            rowChanged = true
          }
        }
      }
      if (!rowChanged) break
    }

    next[field.id] = updatedRows
  }

  // Step 2: Evaluate top-level CALCULATED fields and fields targeted by calculation rules.
  // quote_2 / quote_3 totals are often saved with Quote 1's Subtotal/Freight/HST
  // ids in the formula. Point those operands at the same quote before evaluating.
  const targetFields = fields.filter((field) => {
    if (!isCalculationEnabled(field)) return false
    const hasRule = calcEntries.some(
      (e) => e.fieldId === field.id && !e.columnId,
    )
    return field.type === 'CALCULATED' || hasRule
  })

  for (let pass = 0; pass < Math.max(1, targetFields.length); pass += 1) {
    let changed = false
    for (const field of targetFields) {
      const fieldEntries = calcEntries.filter(
        (e) => e.fieldId === field.id && !e.columnId,
      )
      const activeTokens = remapCrossVariantFormulaTokens(
        resolveActiveFormulaTokens(
          field.settings?.specific?.formulaTokens,
          fieldEntries,
          next,
          fields,
        ),
        field,
        fields,
      )
      const result = evaluateFormula(activeTokens, next, fields)
      const formatted =
        result === null
          ? ''
          : formatCalculatedResult(result, getDecimalPrecision(field))
      if (next[field.id] !== formatted) {
        next[field.id] = formatted
        changed = true
      }
    }
    if (!changed) break
  }

  return next
}

export const isInsideUnclosedAverage = (tokens: FormulaToken[]): boolean => {
  const avgParenDepths: number[] = []
  let parenDepth = 0

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i]
    if (token.type !== 'OPERATOR') continue

    if (token.value === '(') {
      parenDepth += 1
      const previous = tokens[i - 1]
      if (
        previous?.type === 'FUNCTION' &&
        previous.value.toUpperCase() === 'AVG'
      ) {
        avgParenDepths.push(parenDepth)
      }
    } else if (token.value === ')') {
      if (avgParenDepths.at(-1) === parenDepth) avgParenDepths.pop()
      parenDepth = Math.max(0, parenDepth - 1)
    }
  }

  return avgParenDepths.length > 0
}
