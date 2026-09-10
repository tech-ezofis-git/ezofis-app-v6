import type { V6FilterField, V6SearchFilterClause } from '@/api/v6/workflows'

/** Helper to format a Date object as YYYY-MM-DD string */
export const formatDateISO = (date: Date): string => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Normalizes status string variants to exact V6 status keywords
 */
export const normalizeMatchedStatusValue = (val: string): string => {
  if (!val) return val
  const cleanVal = val.startsWith('discrepancies:')
    ? val.replace('discrepancies:', '')
    : val
  const upper = cleanVal.trim().toUpperCase()
  if (
    upper === 'MATCHED' ||
    upper === 'APPROVED' ||
    upper === 'FULLY MATCHED' ||
    upper === 'FULLY_MATCHED'
  ) {
    return 'Matched'
  }
  if (
    upper === 'NOT MATCHED' ||
    upper === 'NOT_MATCHED' ||
    upper === 'NO MATCH' ||
    upper === 'REJECTED' ||
    upper === 'DISCREPANCIES'
  ) {
    return 'Not Matched'
  }
  if (
    upper === 'PARTIALLY MATCHED' ||
    upper === 'PARTIALLY_MATCHED' ||
    upper === 'PARTIALLY APPROVED' ||
    upper === 'PARTIALLY_APPROVED'
  ) {
    return 'Partially Matched'
  }
  return val
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

  if (
    presetValue === 'next_1_month' ||
    presetValue === 'next_month' ||
    presetValue === '1_month'
  ) {
    startDate = today
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, today.getDate())
  } else if (presetValue === 'last_1_month' || presetValue === 'last_month') {
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, today.getDate())
    endDate = today
  } else if (/^next_(\d+)_months?$/i.test(presetValue)) {
    const num = Number(presetValue.match(/^next_(\d+)_months?$/i)?.[1] || 1)
    startDate = today
    endDate = new Date(now.getFullYear(), now.getMonth() + num, today.getDate())
  } else if (/^last_(\d+)_months?$/i.test(presetValue)) {
    const num = Number(presetValue.match(/^last_(\d+)_months?$/i)?.[1] || 1)
    startDate = new Date(
      now.getFullYear(),
      now.getMonth() - num,
      today.getDate(),
    )
    endDate = today
  } else if (/^next_(\d+)_days?$/i.test(presetValue)) {
    const num = Number(presetValue.match(/^next_(\d+)_days?$/i)?.[1] || 1)
    startDate = today
    endDate = new Date(today.getTime() + num * 86400000)
  } else if (/^last_(\d+)_days?$/i.test(presetValue)) {
    const num = Number(presetValue.match(/^last_(\d+)_days?$/i)?.[1] || 1)
    startDate = new Date(today.getTime() - num * 86400000)
    endDate = today
  } else {
    switch (presetValue) {
      case 'days_2_to_7':
        startDate = today
        endDate = new Date(today.getTime() + 7 * 86400000)
        break
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
      case 'next_month':
        startDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0)
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
 * Resolves a UI column ID to its backend sqlColumnName and dataType using V6FilterField schema.
 */
export const resolveFieldSqlColumnName = (
  colId: string | undefined,
  fields: V6FilterField[],
): { criteria: string; dataType: string; isStatus: boolean } => {
  const fieldByColumn = new Map<string, V6FilterField>()
  const fieldByName = new Map<string, V6FilterField>()

  for (const f of fields) {
    if (f.sqlColumnName) fieldByColumn.set(f.sqlColumnName, f)
    if (f.name) {
      fieldByName.set(f.name.toLowerCase().trim(), f)
    }
  }

  const findField = (key: string): V6FilterField | undefined => {
    return (
      fieldByColumn.get(key) ||
      fieldByName.get(key.toLowerCase().trim()) ||
      Array.from(fields).find(
        (f) =>
          f.name.toLowerCase().includes(key.toLowerCase().trim()) ||
          key.toLowerCase().trim().includes(f.name.toLowerCase()),
      )
    )
  }

  const matchedStatusField =
    fieldByName.get('matched status') ||
    fieldByName.get('status') ||
    fieldByName.get('decision')

  const dueDateField =
    fieldByName.get('due date') ||
    fieldByName.get('duedate') ||
    fieldByColumn.get('792IWMnNXLKyfXjCGcowU')

  if (!colId) {
    const invoiceNoField =
      fieldByName.get('invoice no') ||
      fieldByName.get('invoice number') ||
      fieldByName.get('invoiceno') ||
      fieldByName.get('invoice_no')
    return {
      criteria: invoiceNoField?.sqlColumnName || 'kvcYuknkDumkTenjvrVLj',
      dataType: invoiceNoField?.dataType || 'SHORT_TEXT',
      isStatus: false,
    }
  }

  const directField = findField(colId)
  if (directField) {
    const isStat =
      directField.sqlColumnName === matchedStatusField?.sqlColumnName ||
      directField.name.toLowerCase().includes('status') ||
      directField.name.toLowerCase().includes('matched')
    return {
      criteria: directField.sqlColumnName,
      dataType: directField.dataType || 'SHORT_TEXT',
      isStatus: isStat,
    }
  }

  const cleanKey = colId.toLowerCase().replace(/[^a-z0-9]/g, '')

  if (cleanKey.includes('supplier') || cleanKey.includes('vendor')) {
    const f =
      fieldByName.get('supplier') ||
      fieldByName.get('vendor name') ||
      fieldByName.get('supplier name')
    return {
      criteria: f?.sqlColumnName || 'UtfgJy6Z0qyfRC5Bclf-c',
      dataType: f?.dataType || 'SHORT_TEXT',
      isStatus: false,
    }
  }
  if (
    cleanKey.includes('po') &&
    (cleanKey.includes('num') || cleanKey.includes('no'))
  ) {
    const f = fieldByName.get('po number') || fieldByName.get('po_number')
    return {
      criteria: f?.sqlColumnName || 'RXwLGHILLrreMmRqlk9mj',
      dataType: f?.dataType || 'SHORT_TEXT',
      isStatus: false,
    }
  }
  if (
    cleanKey.includes('invoice') &&
    (cleanKey.includes('num') || cleanKey.includes('no'))
  ) {
    const f = fieldByName.get('invoice no') || fieldByName.get('invoice number')
    return {
      criteria: f?.sqlColumnName || 'kvcYuknkDumkTenjvrVLj',
      dataType: f?.dataType || 'SHORT_TEXT',
      isStatus: false,
    }
  }
  if (cleanKey.includes('amount') || cleanKey.includes('val')) {
    const f = fieldByName.get('invoice amount') || fieldByName.get('amount')
    return {
      criteria: f?.sqlColumnName || 'suyqsm0SYii_8vsj4p0c_',
      dataType: f?.dataType || 'SHORT_TEXT',
      isStatus: false,
    }
  }
  if (cleanKey.includes('due') || cleanKey.includes('overdue')) {
    const f = dueDateField
    return {
      criteria: f?.sqlColumnName || '792IWMnNXLKyfXjCGcowU',
      dataType: f?.dataType || 'DATE',
      isStatus: false,
    }
  }
  if (cleanKey.includes('invoicedate')) {
    const f = fieldByName.get('invoice date')
    return {
      criteria: f?.sqlColumnName || '9F6tPVHoRnmONGx3kYJu2',
      dataType: f?.dataType || 'DATE',
      isStatus: false,
    }
  }
  if (cleanKey.includes('podate')) {
    const f = fieldByName.get('po date')
    return {
      criteria: f?.sqlColumnName || 'xc3784_ncgbwVPDfk-B0S',
      dataType: f?.dataType || 'DATE',
      isStatus: false,
    }
  }
  if (
    cleanKey.includes('status') ||
    cleanKey.includes('matched') ||
    cleanKey.includes('decision')
  ) {
    const f = matchedStatusField
    return {
      criteria: f?.sqlColumnName || '2MH_BMDFEVKsU0uAQjoI1',
      dataType: f?.dataType || 'SINGLE_SELECT',
      isStatus: true,
    }
  }

  return { criteria: colId, dataType: 'SHORT_TEXT', isStatus: false }
}

/**
 * Maps UI active filter entries to V6 search filter clauses
 */
export const buildV6FilterClauses = (
  activeFilters: Record<string, string | string[]>,
  filterFields: V6FilterField[],
  activeQuickFilters: string[] = [],
  searchStateInput?: { id?: string; value?: string } | string,
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

  const dueDateField =
    fieldByName.get('due date') ||
    fieldByName.get('duedate') ||
    fieldByColumn.get('792IWMnNXLKyfXjCGcowU')

  const dateField =
    dueDateField ||
    fieldByName.get('invoice date') ||
    fieldByName.get('po date') ||
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
    } else if (qf.startsWith('discrepancies:')) {
      const criteria =
        matchedStatusField?.sqlColumnName || '2MH_BMDFEVKsU0uAQjoI1'
      const rawVal = qf.replace('discrepancies:', '')
      const normalizedVal = normalizeMatchedStatusValue(rawVal)
      clausesMap.set(criteria, {
        condition: 'eq',
        criteria,
        dataType: matchedStatusField?.dataType || 'SINGLE_SELECT',
        value: normalizedVal,
      })
    } else if (qf === 'overdue' || qf.startsWith('due_date:')) {
      const criteria = dueDateField?.sqlColumnName || '792IWMnNXLKyfXjCGcowU'
      const presetVal = qf.replace('due_date:', '')
      const clause = convertDatePresetToFilterClause(
        criteria,
        presetVal === 'overdue' ? 'last_7_days' : presetVal,
        dueDateField?.dataType || 'DATE',
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
      if (keyLower.includes('due') || keyLower.includes('overdue')) {
        schemaField = dueDateField || {
          dataType: 'DATE',
          name: 'Due Date',
          sqlColumnName: '792IWMnNXLKyfXjCGcowU',
          supportedOperators: ['between'],
        }
      } else if (keyLower.includes('date')) {
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
    const rawCleanValues = valuesArr.filter(
      (v) => v !== '__all__' && v.toLowerCase() !== 'all',
    )
    if (rawCleanValues.length === 0) return

    const isStatusColumn =
      criteria === matchedStatusField?.sqlColumnName ||
      fieldKey.toLowerCase().includes('status') ||
      fieldKey.toLowerCase().includes('matched')

    const cleanValues = isStatusColumn
      ? rawCleanValues.map(normalizeMatchedStatusValue)
      : rawCleanValues

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
        const condition =
          schemaField?.supportedOperators?.includes('contains') &&
          !isStatusColumn
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

  // Helper to map selected column ID to exact sqlColumnName
  const resolveSearchColumnCriteria = (colId?: string) =>
    resolveFieldSqlColumnName(colId, filterFields)

  // 3. Process search query (Target selected column or default to Invoice Number)
  const searchQuery =
    typeof searchStateInput === 'string'
      ? searchStateInput
      : searchStateInput?.value

  const searchColumnId =
    typeof searchStateInput === 'object' ? searchStateInput?.id : undefined

  if (searchQuery && searchQuery.trim() !== '') {
    const {
      criteria: searchCriteria,
      dataType,
      isStatus,
    } = resolveSearchColumnCriteria(searchColumnId)

    const finalVal = isStatus
      ? normalizeMatchedStatusValue(searchQuery.trim())
      : searchQuery.trim()

    const targetField =
      findField(searchCriteria) || findField(searchColumnId || '')

    const supportedOps = targetField?.supportedOperators || [
      'eq',
      'neq',
      'contains',
      'startsWith',
      'endsWith',
      'in',
      'isNull',
      'isNotNull',
    ]

    let condition = 'contains'
    if (isStatus) {
      condition = supportedOps.includes('eq') ? 'eq' : supportedOps[0] || 'eq'
    } else if (supportedOps.includes('contains')) {
      condition = 'contains'
    } else if (supportedOps.includes('startsWith')) {
      condition = 'startsWith'
    } else if (supportedOps.includes('eq')) {
      condition = 'eq'
    } else if (supportedOps.length > 0) {
      condition = supportedOps[0]
    }

    clausesMap.set(searchCriteria, {
      condition,
      criteria: searchCriteria,
      dataType,
      value: finalVal,
    })
  }

  return Array.from(clausesMap.values())
}
