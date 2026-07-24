export type FilterFieldType =
  | 'date'
  | 'number'
  | 'category'
  | 'boolean'
  | 'unknown'

export interface FilterOption {
  label: string
  value: string
  count?: number
}

/**
 * Detects the field type by inspecting a sample of the dataset.
 */
export function detectFieldType(
  dataset: any[],
  fieldKey: string,
  valueGetter?: (item: any) => any,
): FilterFieldType {
  if (!dataset || dataset.length === 0) return 'unknown'

  // Take a sample of up to 50 non-null records
  const sample = dataset
    .map((item) => (valueGetter ? valueGetter(item) : item[fieldKey]))
    .filter(
      (val) => val !== null && val !== undefined && val !== '' && val !== '-',
    )
    .slice(0, 50)

  if (sample.length === 0) return 'unknown'

  const types = sample.map((val) => {
    if (typeof val === 'boolean') return 'boolean'
    if (typeof val === 'number') return 'number'

    // Check if it's a valid date string (simple heuristic)
    if (typeof val === 'string') {
      // Basic check for ISO date or common date formats
      const date = new Date(val)
      if (!isNaN(date.getTime()) && val.match(/\d{4}-\d{2}-\d{2}/)) {
        return 'date'
      }
      // If it has numbers but we know it's forced as number, we could parse it, but for now fallback
      return 'category'
    }

    return 'unknown'
  })

  // Majority vote
  const counts = types.reduce(
    (acc, type) => {
      acc[type] = (acc[type] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  let dominantType = 'unknown'
  let maxCount = 0
  for (const [type, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count
      dominantType = type
    }
  }

  return dominantType as FilterFieldType
}

/**
 * Extracts unique categories and their counts from the dataset.
 */
export function generateCategoryOptions(
  dataset: any[],
  fieldKey: string,
  valueGetter?: (item: any) => any,
): FilterOption[] {
  const counts: Record<string, number> = {}

  for (const item of dataset) {
    const val = valueGetter ? valueGetter(item) : item[fieldKey]
    if (val !== null && val !== undefined && val !== '' && val !== '-') {
      const strVal = String(val)
      counts[strVal] = (counts[strVal] || 0) + 1
    }
  }

  return Object.entries(counts)
    .map(([value, count]) => ({
      count,
      label: value,
      value,
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

/**
 * Generic date filter presets (created/modified dates, etc.).
 */
export const DEFAULT_DATE_RANGE_OPTIONS: FilterOption[] = [
  { label: 'Today', value: 'today' },
  { label: 'Tomorrow', value: 'tomorrow' },
  { label: 'This week', value: 'this_week' },
  { label: 'Next 7 days', value: 'next_7_days' },
  { label: 'This month', value: 'this_month' },
  { label: 'Last month', value: 'last_month' },
  { label: 'Custom Range', value: 'custom' },
]

/**
 * Due-date presets for Requests inbox triage.
 */
export const DUE_DATE_FILTER_OPTIONS: FilterOption[] = [
  { label: 'Overdue', value: 'overdue' },
  { label: 'Due Today', value: 'today' },
  { label: 'Due in Next 7 Days', value: 'next_7_days' },
  { label: 'Due in Next 15 Days', value: 'next_15_days' },
  { label: 'Due in Next 1 Month', value: 'next_1_month' },
  { label: 'No Due Date', value: 'no_due_date' },
  { label: 'Custom Range', value: 'custom' },
]

/**
 * Generates relative date ranges based on available data.
 */
export function generateDateRanges(
  _dataset: any[],
  _fieldKey: string,
  _valueGetter?: (item: any) => any,
): FilterOption[] {
  return [...DEFAULT_DATE_RANGE_OPTIONS]
}

/**
 * Generates numeric buckets based on min and max values.
 */
export function generateNumericBuckets(
  dataset: any[],
  fieldKey: string,
  valueGetter?: (item: any) => any,
): FilterOption[] {
  const values = dataset
    .map((item) => {
      const val = valueGetter ? valueGetter(item) : item[fieldKey]
      if (typeof val === 'number') return val
      if (typeof val === 'string') return Number(val.replace(/[^0-9.-]/g, ''))
      return NaN
    })
    .filter((val) => typeof val === 'number' && !isNaN(val)) as number[]

  if (values.length === 0) return []

  const min = Math.min(...values)
  const max = Math.max(...values)

  if (min === max) {
    return [{ count: values.length, label: `${min}`, value: `${min}-${min}` }]
  }

  // Dynamic scaling
  const range = max - min
  let bucketSize = 1

  // Find a reasonable bucket size
  if (range <= 10) bucketSize = 2
  else if (range <= 50) bucketSize = 10
  else if (range <= 100) bucketSize = 25
  else if (range <= 500) bucketSize = 100
  else if (range <= 1000) bucketSize = 250
  else if (range <= 5000) bucketSize = 1000
  else {
    const roughSize = range / 5
    const magnitude = Math.pow(10, Math.floor(Math.log10(roughSize)))
    bucketSize = Math.ceil(roughSize / magnitude) * magnitude
  }

  const buckets: { count: number; max: number; min: number }[] = []

  const startMin = Math.floor(min / bucketSize) * bucketSize

  for (let i = startMin; i <= max; i += bucketSize) {
    buckets.push({
      count: 0,
      max: i + bucketSize,
      min: i,
    })
  }

  for (const val of values) {
    const bucket =
      buckets.find((b) => val >= b.min && val < b.max) ||
      buckets[buckets.length - 1]
    if (bucket) {
      bucket.count++
    }
  }

  return buckets.map((b) => ({
    count: b.count,
    label: `${b.min} - ${b.max}`,
    value: `${b.min}-${b.max}`,
  }))
}

/** Multi-select values stored in CustomFilter string API */
export const FILTER_MULTI_SEP = '|'

export function parseFilterValues(
  value: string | string[] | null | undefined,
): string[] {
  if (value == null || value === '') return []
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  const raw = String(value)
  if (raw.includes(FILTER_MULTI_SEP)) {
    return raw.split(FILTER_MULTI_SEP).map((v) => v.trim()).filter(Boolean)
  }
  return [raw]
}

export function serializeFilterValues(values: string[]): string {
  return values.filter(Boolean).join(FILTER_MULTI_SEP)
}

export function isDateColumnType(dataType?: string) {
  const normalized = String(dataType || '')
    .trim()
    .toLowerCase()
  return (
    normalized === 'date' ||
    normalized === 'datetime' ||
    normalized.includes('date')
  )
}

export function isNumberColumnType(dataType?: string) {
  const normalized = String(dataType || '')
    .trim()
    .toLowerCase()
  return (
    normalized === 'number' ||
    normalized === 'numeric' ||
    normalized === 'int' ||
    normalized === 'integer' ||
    normalized === 'decimal' ||
    normalized === 'float' ||
    normalized === 'currency' ||
    normalized === 'amount' ||
    normalized.includes('number')
  )
}

const parseDay = (dateStr: string): Date | null => {
  if (!dateStr || dateStr === '-') return null
  if (dateStr.includes('T')) {
    const [y, m, d] = dateStr.split('T')[0].split('-').map(Number)
    if (!y || !m || !d) return null
    return new Date(y, m - 1, d)
  }
  if (dateStr.includes('-')) {
    const [y, m, d] = dateStr.split('-').map(Number)
    if (!y || !m || !d) return null
    return new Date(y, m - 1, d)
  }
  const fallback = new Date(dateStr)
  if (Number.isNaN(fallback.getTime())) return null
  return new Date(
    fallback.getFullYear(),
    fallback.getMonth(),
    fallback.getDate(),
  )
}

/** Match a row date against a date-range preset or custom:start_end value. */
export function matchesDateRangeValue(
  rowDateStr: string | null | undefined,
  val: string,
): boolean {
  if (!val) return true
  const hasNoDueDate =
    !rowDateStr ||
    rowDateStr === '-' ||
    String(rowDateStr).trim() === ''
  if (val === 'no_due_date') return hasNoDueDate

  const rowDay = parseDay(String(rowDateStr || '').split('T')[0])
  if (!rowDay) return false

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const t = rowDay.getTime()
  const dayMs = 86400000

  if (val.startsWith('custom:')) {
    const [startStr, endStr] = val.replace('custom:', '').split('_')
    const start = parseDay(startStr)
    const end = parseDay(endStr)
    if (!start || !end) return false
    return t >= start.getTime() && t <= end.getTime()
  }

  if (val === 'today') return t === today.getTime()
  if (val === 'tomorrow') return t === today.getTime() + dayMs
  if (val === 'overdue') return t < today.getTime()
  if (val === 'next_7_days')
    return t >= today.getTime() && t <= today.getTime() + 7 * dayMs
  if (val === 'next_15_days')
    return t >= today.getTime() && t <= today.getTime() + 15 * dayMs
  if (val === 'next_30_days')
    return t >= today.getTime() && t <= today.getTime() + 30 * dayMs
  if (val === 'days_2_to_7')
    return t >= today.getTime() + 2 * dayMs && t <= today.getTime() + 7 * dayMs
  if (val === 'days_8_to_30')
    return t >= today.getTime() + 8 * dayMs && t <= today.getTime() + 30 * dayMs
  if (val === 'after_30_days') return t > today.getTime() + 30 * dayMs
  if (val === 'this_week') {
    const startOfWeek = new Date(today.getTime() - today.getDay() * dayMs)
    const endOfWeek = new Date(startOfWeek.getTime() + 6 * dayMs)
    return t >= startOfWeek.getTime() && t <= endOfWeek.getTime()
  }
  if (val === 'last_week') {
    const startOfThisWeek = new Date(today.getTime() - today.getDay() * dayMs)
    const startOfLastWeek = new Date(startOfThisWeek.getTime() - 7 * dayMs)
    const endOfLastWeek = new Date(startOfThisWeek.getTime() - dayMs)
    return t >= startOfLastWeek.getTime() && t <= endOfLastWeek.getTime()
  }
  if (val === 'this_month')
    return (
      rowDay.getFullYear() === now.getFullYear() &&
      rowDay.getMonth() === now.getMonth()
    )
  if (val === 'next_month') {
    const nm = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    return (
      rowDay.getFullYear() === nm.getFullYear() &&
      rowDay.getMonth() === nm.getMonth()
    )
  }
  if (val === 'last_month') {
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return (
      rowDay.getFullYear() === lm.getFullYear() &&
      rowDay.getMonth() === lm.getMonth()
    )
  }
  if (val === 'last_3_months') {
    const start = new Date(now.getFullYear(), now.getMonth() - 3, today.getDate())
    return t >= start.getTime() && t <= today.getTime()
  }
  if (val === 'last_6_months') {
    const start = new Date(now.getFullYear(), now.getMonth() - 6, today.getDate())
    return t >= start.getTime() && t <= today.getTime()
  }
  if (val === 'this_year') return rowDay.getFullYear() === now.getFullYear()
  if (val === 'last_year') return rowDay.getFullYear() === now.getFullYear() - 1

  // Exact date (legacy InputDate value)
  const exact = parseDay(val.split('T')[0])
  if (exact) return t === exact.getTime()

  return String(rowDateStr) === val
}

/** Match a row value against one or more selected category values. */
export function matchesCategoryFilterValue(
  rowValue: unknown,
  filterValue: string | string[],
  mode: 'equals' | 'contains' = 'equals',
): boolean {
  const selected = parseFilterValues(filterValue).filter(
    (sel) => sel !== '__all__' && sel.toLowerCase() !== 'all',
  )
  if (selected.length === 0) return true
  const row = String(rowValue ?? '')
  const rowLower = row.toLowerCase()
  return selected.some((sel) => {
    const selLower = sel.toLowerCase()
    if (mode === 'contains') return rowLower.includes(selLower)
    return rowLower === selLower
  })
}
