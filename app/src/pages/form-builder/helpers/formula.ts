import type { Panel, Question } from '@/pages/form-builder/store/formStore'

export const FORMULA_SOURCE_TYPES = [
  'NUMBER',
  'COUNTER',
  'CURRENCY_AMOUNT',
] as const

export type FormulaToken = {
  type: 'FIELD' | 'FUNCTION' | 'NUMBER' | 'OPERATOR'
  value: string
}

export const isFormulaSourceType = (
  type?: string,
): type is (typeof FORMULA_SOURCE_TYPES)[number] =>
  Boolean(type && (FORMULA_SOURCE_TYPES as readonly string[]).includes(type))

export const extractNumericValue = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    return extractNumericValue(
      record.amount ?? record.value ?? record.number ?? record.count,
    )
  }
  if (typeof value !== 'string') return null
  const cleaned = value.replace(/[^0-9.+-]/g, '')
  if (!cleaned || cleaned === '+' || cleaned === '-' || cleaned === '.') {
    return null
  }
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : null
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

export const formatFormulaExpression = (
  tokens: FormulaToken[] | undefined,
  fields: Array<{ id: string; label?: string }>,
): string => {
  if (!tokens?.length) return ''

  return tokens
    .map((token, index) => {
      const previous = tokens[index - 1]
      let text = token.value
      if (token.type === 'FIELD') {
        text =
          fields.find((field) => field.id === token.value)?.label ||
          'Unknown field'
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

const getDecimalPrecision = (field: Question): number | undefined => {
  const specific = field.settings?.specific?.decimalPrecision
  const validation = field.settings?.validation?.decimalDigits
  const raw = specific ?? validation
  if (raw === undefined || raw === null || String(raw).trim() === '') return undefined
  const parsed = Number(raw)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined
}

export const evaluateFormula = (
  tokens: FormulaToken[] | undefined,
  values: Record<string, unknown>,
): number | null => {
  if (!tokens?.length) return null

  for (const token of tokens) {
    if (
      token.type === 'FIELD' &&
      extractNumericValue(values[token.value]) === null
    ) {
      return null
    }
  }

  let index = 0
  const peek = () => tokens[index]
  const consume = () => tokens[index++]

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
      const parsed = extractNumericValue(values[token.value])
      if (parsed === null) throw new Error('Missing field value')
      return parsed
    }

    throw new Error('Unexpected token')
  }

  try {
    const result = parseExpression()
    if (index < tokens.length) return null
    return Number.isFinite(result) ? result : null
  } catch {
    return null
  }
}

export const applyCalculatedFields = (
  panels: Panel[] | undefined,
  values: Record<string, unknown>,
): Record<string, unknown> => {
  const next = { ...values }
  const fields = (panels ?? []).flatMap((panel) => panel.fields ?? [])

  for (const field of fields) {
    if (field.type !== 'CALCULATED' || !isCalculationEnabled(field)) continue
    const result = evaluateFormula(
      field.settings?.specific?.formulaTokens,
      next,
    )
    next[field.id] =
      result === null
        ? ''
        : formatCalculatedResult(result, getDecimalPrecision(field))
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
