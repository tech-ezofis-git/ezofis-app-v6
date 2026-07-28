import type { V6FilterField, V6SearchFilterClause } from '@/api/v6/workflows'

/** Helper to format a Date object as YYYY-MM-DD string */
export const formatDateISO = (date: Date): string => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Converts UI date presets (e.g. 'last_7_days', 'next_7_days', 'this_month') into a V6 between/eq filter clause
 */
export const convertDatePresetToFilterClause = (
  criteria: string,
  presetValue: string,
  dataType: string = 'DATE',
): V6SearchFilterClause | null => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  if (presetValue === 'today') {
    return {
      condition: 'eq',
      criteria,
      dataType,
      value: formatDateISO(today),
    }
  }

  if (presetValue === 'tomorrow') {
    const tomorrow = new Date(today.getTime() + 86400000)
    return {
      condition: 'eq',
      criteria,
      dataType,
      value: formatDateISO(tomorrow),
    }
  }

  if (presetValue.startsWith('custom:')) {
    const rangeStr = presetValue.replace('custom:', '')
    const [startStr, endStr] = rangeStr.split('_')
    if (startStr && endStr) {
      return {
        condition: 'between',
        criteria,
        dataType,
        value: startStr,
        valueTo: endStr,
      }
    }
    return null
  }

  let startDate: Date
  let endDate: Date

  switch (presetValue) {
    case 'last_7_days':
      startDate = new Date(today.getTime() - 7 * 86400000)
      endDate = today
      break
    case 'next_7_days':
    case 'days_2_to_7':
      startDate = today
      endDate = new Date(today.getTime() + 7 * 86400000)
      break
    case 'next_15_days':
      startDate = today
      endDate = new Date(today.getTime() + 15 * 86400000)
      break
    case 'next_30_days':
    case 'days_8_to_30':
      startDate = today
      endDate = new Date(today.getTime() + 30 * 86400000)
      break
    case 'after_30_days':
      startDate = new Date(today.getTime() + 30 * 86400000)
      endDate = new Date(today.getTime() + 365 * 86400000)
      break
    case 'this_week': {
      startDate = new Date(today.getTime() - today.getDay() * 86400000)
      endDate = new Date(startDate.getTime() + 6 * 86400000)
      break
    }
    case 'last_week': {
      const startOfThisWeek = new Date(
        today.getTime() - today.getDay() * 86400000,
      )
      startDate = new Date(startOfThisWeek.getTime() - 7 * 86400000)
      endDate = new Date(startOfThisWeek.getTime() - 86400000)
      break
    }
    case 'this_month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      break
    case 'last_month':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      endDate = new Date(now.getFullYear(), now.getMonth(), 0)
      break
    case 'next_month':
      startDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0)
      break
    case 'last_3_months':
      startDate = new Date(
        now.getFullYear(),
        now.getMonth() - 3,
        today.getDate(),
      )
      endDate = today
      break
    case 'last_6_months':
      startDate = new Date(
        now.getFullYear(),
        now.getMonth() - 6,
        today.getDate(),
      )
      endDate = today
      break
    case 'this_year':
      startDate = new Date(now.getFullYear(), 0, 1)
      endDate = new Date(now.getFullYear(), 11, 31)
      break
    case 'last_year':
      startDate = new Date(now.getFullYear() - 1, 0, 1)
      endDate = new Date(now.getFullYear() - 1, 11, 31)
      break
    default:
      return null
  }

  return {
    condition: 'between',
    criteria,
    dataType,
    value: formatDateISO(startDate),
    valueTo: formatDateISO(endDate),
  }
}

/**
 * Maps UI active filter entries to V6 search filter clauses
 */
export const buildV6FilterClauses = (
  activeFilters: Record<string, string | string[]>,
  filterFields: V6FilterField[],
  activeQuickFilters: string[] = [],
): V6SearchFilterClause[] => {
  const clausesMap = new Map<string, V6SearchFilterClause>()

  // Create lookup maps for quick field resolution by sqlColumnName, exact name, or lowercase label
  const fieldByColumn = new Map<string, V6FilterField>()
  const fieldByName = new Map<string, V6FilterField>()

  for (const f of filterFields) {
    if (f.sqlColumnName) fieldByColumn.set(f.sqlColumnName, f)
    if (f.name) {
      fieldByName.set(f.name.toLowerCase().trim(), f)
    }
  }

  const findField = (key: string): V6FilterField | undefined => {
    return (
      fieldByColumn.get(key) ||
      fieldByName.get(key.toLowerCase().trim()) ||
      Array.from(filterFields).find(
        (f) =>
          f.name.toLowerCase().includes(key.toLowerCase().trim()) ||
          key.toLowerCase().trim().includes(f.name.toLowerCase()),
      )
    )
  }

  // Find Matched Status and Date fields from schema
  const matchedStatusField =
    fieldByName.get('matched status') ||
    fieldByName.get('status') ||
    fieldByName.get('decision')

  const dateField =
    fieldByName.get('invoice date') ||
    fieldByName.get('po date') ||
    fieldByName.get('due date') ||
    fieldByName.get('duedate') ||
    Array.from(filterFields).find(
      (f) =>
        f.dataType?.toUpperCase() === 'DATE' ||
        f.dataType?.toUpperCase() === 'DATETIME',
    )

  // 1. Process Quick Filters first
  for (const qf of activeQuickFilters) {
    if (qf === 'matched') {
      const criteria =
        matchedStatusField?.sqlColumnName || '2MH_BMDFEVKsU0uAQjoI1'
      clausesMap.set(criteria, {
        condition: 'eq',
        criteria,
        dataType: matchedStatusField?.dataType || 'SINGLE_SELECT',
        value: 'Matched',
      })
    } else if (qf === 'discrepancies') {
      const criteria =
        matchedStatusField?.sqlColumnName || '2MH_BMDFEVKsU0uAQjoI1'
      clausesMap.set(criteria, {
        condition: 'eq',
        criteria,
        dataType: matchedStatusField?.dataType || 'SINGLE_SELECT',
        value: 'Not Matched',
      })
    } else if (qf === 'overdue' || qf.startsWith('due_date:')) {
      const criteria = dateField?.sqlColumnName || '9F6tPVHoRnmONGx3kYJu2'
      const presetVal = qf.replace('due_date:', '')
      const clause = convertDatePresetToFilterClause(
        criteria,
        presetVal === 'overdue' ? 'last_7_days' : presetVal,
        dateField?.dataType || 'DATE',
      )
      if (clause) clausesMap.set(criteria, clause)
    }
  }

  // 2. Process active custom filters (overriding or adding to clausesMap)
  Object.entries(activeFilters).forEach(([fieldKey, val]) => {
    if (!val || (Array.isArray(val) && val.length === 0)) return

    let schemaField = findField(fieldKey)
    if (!schemaField) {
      const keyLower = fieldKey.toLowerCase()
      if (
        keyLower.includes('due') ||
        keyLower.includes('overdue') ||
        keyLower.includes('date')
      ) {
        schemaField = dateField
      } else if (
        keyLower.includes('status') ||
        keyLower.includes('matched') ||
        keyLower.includes('decision')
      ) {
        schemaField = matchedStatusField
      }
    }

    const criteria = schemaField?.sqlColumnName || fieldKey
    const dataType = schemaField?.dataType || 'SHORT_TEXT'
    const valuesArr = Array.isArray(val) ? val : [val]

    // Handle Date types
    if (
      dataType.toUpperCase() === 'DATE' ||
      dataType.toUpperCase() === 'DATETIME' ||
      fieldKey.toLowerCase().includes('due') ||
      fieldKey.toLowerCase().includes('date')
    ) {
      valuesArr.forEach((singleVal) => {
        const clause = convertDatePresetToFilterClause(
          criteria,
          singleVal,
          dataType.toUpperCase().includes('DATE') ? dataType : 'DATE',
        )
        if (clause) {
          clausesMap.set(criteria, clause)
        } else if (
          singleVal &&
          singleVal !== 'all' &&
          singleVal !== '__all__'
        ) {
          clausesMap.set(criteria, {
            condition: 'eq',
            criteria,
            dataType,
            value: singleVal,
          })
        }
      })
      return
    }

    // Filter out 'all' wildcard tokens
    const cleanValues = valuesArr.filter(
      (v) => v !== '__all__' && v.toLowerCase() !== 'all',
    )
    if (cleanValues.length === 0) return

    if (cleanValues.length === 1) {
      const v = cleanValues[0]
      if (v.startsWith('custom:')) {
        const [min, max] = v.replace('custom:', '').split('-')
        clausesMap.set(criteria, {
          condition: 'between',
          criteria,
          dataType: 'SHORT_TEXT',
          value: min,
          valueTo: max,
        })
      } else {
        const condition = schemaField?.supportedOperators?.includes('contains')
          ? 'contains'
          : 'eq'
        clausesMap.set(criteria, {
          condition,
          criteria,
          dataType,
          value: v,
        })
      }
    } else {
      clausesMap.set(criteria, {
        condition: 'in',
        criteria,
        dataType,
        value: cleanValues,
        values: cleanValues,
      })
    }
  })

  return Array.from(clausesMap.values())
}
