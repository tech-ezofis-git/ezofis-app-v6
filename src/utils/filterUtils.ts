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
 * Generates relative date ranges based on available data.
 */
export function generateDateRanges(
  dataset: any[],
  fieldKey: string,
  valueGetter?: (item: any) => any,
): FilterOption[] {
  const dates = dataset
    .map((item) => new Date(valueGetter ? valueGetter(item) : item[fieldKey]))
    .filter((date) => !isNaN(date.getTime()))

  const ranges: FilterOption[] = []

  // For due dates, we need future-facing filters
  ranges.push({ label: 'Overdue', value: 'overdue' })
  ranges.push({ label: 'Today', value: 'today' })
  ranges.push({ label: 'Tomorrow', value: 'tomorrow' })
  ranges.push({ label: 'Next 7 Days', value: 'next_7_days' })
  ranges.push({ label: 'Next 30 Days', value: 'next_30_days' })
  ranges.push({ label: 'This Month', value: 'this_month' })
  ranges.push({ label: 'Next Month', value: 'next_month' })
  ranges.push({ label: 'Last Week', value: 'last_week' })
  ranges.push({ label: 'Last Month', value: 'last_month' })
  ranges.push({ label: 'Last 3 Months', value: 'last_3_months' })
  ranges.push({ label: 'This Year', value: 'this_year' })
  ranges.push({ label: 'Last Year', value: 'last_year' })

  // Custom option for date picker (if implemented later)
  ranges.push({ label: 'Custom Range...', value: 'custom' })

  return ranges
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
