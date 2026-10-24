import type { ReportStatusRule } from '../types'

// Monetary fields arrive as text ("$1,234.50"), so strip everything but the
// number before comparing.
const toNumber = (value: string | undefined): number | null => {
  const cleaned = String(value ?? '').replace(/[^0-9.-]/g, '')
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return null
  const num = Number(cleaned)
  return Number.isNaN(num) ? null : num
}

const isEmptyValue = (value: string | undefined) =>
  value === undefined || value === null || String(value).trim() === ''

/**
 * Whether a raw cell value satisfies a highlight rule. Text comparisons are
 * case-insensitive; gt/gte/lt/lte/between compare numerically.
 */
export const matchesHighlightRule = (
  rule: ReportStatusRule,
  rawValue: string | undefined,
  row: Record<string, string>,
): boolean => {
  const target = rule.compareField ? row[rule.compareField] : rule.match
  const text = String(rawValue ?? '').trim().toLowerCase()
  const targetText = String(target ?? '').trim().toLowerCase()

  switch (rule.operator ?? 'eq') {
    case 'between': {
      const num = toNumber(rawValue)
      const min = toNumber(target)
      const max = toNumber(rule.value2)
      return num !== null && min !== null && max !== null
        ? num >= min && num <= max
        : false
    }
    case 'contains':
      return targetText !== '' && text.includes(targetText)
    case 'empty':
      return isEmptyValue(rawValue)
    case 'eq':
      return text === targetText
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte': {
      const num = toNumber(rawValue)
      const other = toNumber(target)
      if (num === null || other === null) return false
      if (rule.operator === 'gt') return num > other
      if (rule.operator === 'gte') return num >= other
      if (rule.operator === 'lt') return num < other
      return num <= other
    }
    case 'neq':
      return text !== targetText
    case 'notContains':
      return targetText === '' || !text.includes(targetText)
    case 'notEmpty':
      return !isEmptyValue(rawValue)
    default:
      return false
  }
}
