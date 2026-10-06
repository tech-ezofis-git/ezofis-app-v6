import { buildSyntheticTableField } from './AgentEditableTables'

export const normalizeQualifierKey = (value: string) =>
  value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ')

const singularizeKey = (value: string) =>
  normalizeQualifierKey(value)
    .replace(/\s+s\b/g, '')
    .trim()

export const getFieldHeading = (field: any) =>
  String(
    field?.label ||
      field?.displayLabel ||
      field?.name ||
      field?.settings?.general?.label ||
      field?.id ||
      '',
  )

export const getFieldId = (field: any) =>
  String(field?.id || field?.jsonId || field?.name || '')

const isTableFieldType = (field: any) => {
  const type = String(field?.type || '')
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
  return type === 'TABLE' || type === 'DYNAMIC_TABLE' || type.includes('TABLE')
}

export const isQualifyDecisionKey = (key: string) =>
  singularizeKey(key) === 'qualify'

export const isConfidenceKey = (key: string) =>
  normalizeQualifierKey(key).includes('confidence')

/** Match a form field heading to a key from qualifier_result. */
export const findResultKeyForFormField = (
  result: Record<string, any> | null | undefined,
  field: any,
): string | null => {
  if (!result || !field) return null
  const want = normalizeQualifierKey(getFieldHeading(field))
  if (!want) return null

  const exact = Object.keys(result).find(
    (key) => normalizeQualifierKey(key) === want,
  )
  if (exact) return exact

  const wantSingular = singularizeKey(want)
  return (
    Object.keys(result).find((key) => {
      const got = normalizeQualifierKey(key)
      const gotSingular = singularizeKey(key)
      if (got === want || gotSingular === wantSingular) return true
      if (want.length >= 6 && got.includes(want)) return true
      if (got.length >= 6 && want.includes(got)) return true
      return false
    }) || null
  )
}

/** Match a qualifier_result key to a form field. */
export const findFormFieldForResultKey = (
  fields: any[],
  resultKey: string,
): any | null => {
  const want = normalizeQualifierKey(resultKey)
  const exact = fields.find(
    (field) => normalizeQualifierKey(getFieldHeading(field)) === want,
  )
  if (exact) return exact

  const wantSingular = singularizeKey(resultKey)
  return (
    fields.find((field) => {
      const heading = normalizeQualifierKey(getFieldHeading(field))
      const headingSingular = singularizeKey(getFieldHeading(field))
      return (
        heading === want ||
        headingSingular === wantSingular ||
        (want.length >= 6 && heading.includes(want)) ||
        (heading.length >= 6 && want.includes(heading))
      )
    }) || null
  )
}

/** Back-compat helper — resolves the first matching qualifier_result key. */
export const getQualifierValue = (
  result: Record<string, any> | null | undefined,
  ...aliases: string[]
) => {
  if (!result || typeof result !== 'object') return undefined
  for (const alias of aliases) {
    const key = findResultKeyForFormField(result, { label: alias })
    if (key) return result[key]
  }
  return undefined
}

const isObjectRowArray = (value: unknown): value is Record<string, any>[] =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every((row) => row && typeof row === 'object' && !Array.isArray(row))

const isStringList = (value: unknown): value is string[] =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every((item) => typeof item === 'string')

const isLongTextValue = (field: any | null, value: unknown) => {
  const type = String(field?.type || '').toUpperCase()
  if (type === 'LONG_TEXT') return true
  return typeof value === 'string' && value.length > 160
}

/** Same loose match as findResultKeyForFormField, so alias keys collapse to one table. */
const qualifierKeysMatch = (left: string, right: string) => {
  const a = normalizeQualifierKey(left)
  const b = normalizeQualifierKey(right)
  if (!a || !b) return false
  if (a === b || singularizeKey(left) === singularizeKey(right)) return true
  if (a.length >= 6 && b.includes(a)) return true
  if (b.length >= 6 && a.includes(b)) return true
  return false
}

export type QualifierScalarEntry = {
  field: any | null
  isLongText: boolean
  isStringList: boolean
  label: string
  resultKey: string
  value: unknown
}

export type QualifierTableEntry = {
  field: any
  label: string
  resultKey: string
  rows: Record<string, any>[]
}

const qualifierCellText = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')

/** Drop repeated qualifier table rows that display the same cell values. */
export const dedupeQualifierRows = (
  rows: Record<string, any>[],
  columns?: Array<{ id: string; name?: string }>,
) => {
  const seen = new Set<string>()
  const next: Record<string, any>[] = []
  const cellValue = (
    col: { id: string; name?: string },
    source: Record<string, any>,
  ) => {
    const byId = source[col.id]
    if (byId != null && String(byId).trim() !== '') return byId
    const byName = col.name ? source[col.name] : undefined
    if (byName != null && String(byName).trim() !== '') return byName
    return byId ?? ''
  }
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue
    const entries = columns?.length
      ? columns.map(
          (col) => [String(col.name || col.id), cellValue(col, row)] as const,
        )
      : Object.entries(row).filter(([key]) => !key.startsWith('_'))
    const parts = entries.map(
      ([key, value]) =>
        `${normalizeQualifierKey(String(key))}:${qualifierCellText(value)}`,
    )
    const signature = columns?.length
      ? parts.join('\u0001')
      : parts.sort().join('\u0001')
    const hasValue = entries.some(
      ([, value]) => qualifierCellText(value).length > 0,
    )
    if (!hasValue) {
      next.push(row)
      continue
    }
    if (seen.has(signature)) continue
    seen.add(signature)
    next.push(row)
  }
  return next
}

export type QualifierViewModel = {
  confidence: unknown
  confidenceLabel: string
  flagEntries: QualifierScalarEntry[]
  longTextEntries: QualifierScalarEntry[]
  metaEntries: QualifierScalarEntry[]
  qualify: string
  tables: QualifierTableEntry[]
  titleEntry: QualifierScalarEntry | null
}

export const buildQualifierViewModel = (
  result: Record<string, any>,
  formFields: any[],
  tableFields: any[],
): QualifierViewModel => {
  const qualifyKey = Object.keys(result).find(isQualifyDecisionKey) || null
  const confidenceKey = Object.keys(result).find(isConfidenceKey) || null
  const reservedKeys = new Set(
    [qualifyKey, confidenceKey].filter(Boolean) as string[],
  )

  const scalarFormFields = formFields.filter(
    (field) => !isTableFieldType(field),
  )
  const usedKeys = new Set<string>(reservedKeys)
  const scalars: QualifierScalarEntry[] = []
  const tables: QualifierTableEntry[] = []
  // One result array must not be bound to every form table that fuzzy-matches
  // it (primary + secondary "Excluded Items", or "Excluded Items" / "excluded_items").
  const claimedTableKeys: string[] = []
  const tableKeyClaimed = (key: string) =>
    claimedTableKeys.some((claimed) => qualifierKeysMatch(claimed, key))

  const pushScalar = (resultKey: string, value: unknown, field: any | null) => {
    if (value === null || value === undefined) return
    if (typeof value === 'string' && !value.trim()) return
    scalars.push({
      field,
      isLongText: isLongTextValue(field, value),
      isStringList: isStringList(value),
      label: field ? getFieldHeading(field) : resultKey,
      resultKey,
      value,
    })
  }

  for (const field of scalarFormFields) {
    const resultKey = findResultKeyForFormField(result, field)
    if (!resultKey || usedKeys.has(resultKey)) continue
    usedKeys.add(resultKey)
    pushScalar(resultKey, result[resultKey], field)
  }

  const orderedTableFields = [...tableFields].sort((a, b) => {
    const rank = (field: any) => {
      const resultKey = findResultKeyForFormField(result, field)
      if (!resultKey) return 2
      const heading = getFieldHeading(field)
      const exact =
        normalizeQualifierKey(heading) === normalizeQualifierKey(resultKey) ||
        singularizeKey(heading) === singularizeKey(resultKey)
      return exact ? 0 : 1
    }
    return rank(a) - rank(b)
  })

  for (const field of orderedTableFields) {
    const resultKey = findResultKeyForFormField(result, field)
    if (resultKey && tableKeyClaimed(resultKey)) continue
    const rows =
      resultKey && isObjectRowArray(result[resultKey]) ? result[resultKey] : []
    if (resultKey) {
      usedKeys.add(resultKey)
      claimedTableKeys.push(resultKey)
    }
    if (rows.length > 0 || resultKey) {
      tables.push({
        field,
        label: getFieldHeading(field),
        resultKey: resultKey || getFieldId(field),
        rows: dedupeQualifierRows(rows),
      })
    }
  }

  for (const [key, value] of Object.entries(result)) {
    if (usedKeys.has(key)) continue
    if (isObjectRowArray(value) && tableKeyClaimed(key)) continue

    if (isObjectRowArray(value)) {
      tables.push({
        field: buildSyntheticTableField(key, value),
        label: key,
        resultKey: key,
        rows: dedupeQualifierRows(value),
      })
      usedKeys.add(key)
      continue
    }

    if (isStringList(value)) {
      const field = findFormFieldForResultKey(scalarFormFields, key)
      usedKeys.add(key)
      pushScalar(key, value, field)
      continue
    }

    if (value !== null && value !== undefined && value !== '') {
      const field = findFormFieldForResultKey(scalarFormFields, key)
      usedKeys.add(key)
      pushScalar(key, value, field)
    }
  }

  const shortScalars = scalars.filter(
    (entry) => !entry.isLongText && !entry.isStringList,
  )
  const titleEntry = shortScalars[0] || null
  const metaEntries = shortScalars.slice(1)

  return {
    confidence: confidenceKey ? result[confidenceKey] : null,
    confidenceLabel: confidenceKey || 'Confidence',
    flagEntries: scalars.filter((entry) => entry.isStringList),
    longTextEntries: scalars.filter(
      (entry) => entry.isLongText && !entry.isStringList,
    ),
    metaEntries,
    qualify: qualifyKey ? String(result[qualifyKey] ?? '') : '',
    tables,
    titleEntry,
  }
}

/** Card/summary display for qualify agent blocks (no hardcoded result keys). */
export const summarizeQualifierResult = (
  result: Record<string, any> | null | undefined,
  formFields: any[] = [],
  tableFields: any[] = [],
) => {
  if (!result || typeof result !== 'object') {
    return { qualify: '', title: '' }
  }
  const vm = buildQualifierViewModel(result, formFields, tableFields)
  const titleValue = vm.titleEntry?.value
  const title =
    titleValue !== null && titleValue !== undefined && String(titleValue).trim()
      ? String(titleValue)
      : 'Completed'
  return { qualify: vm.qualify, title }
}

/** Same bands as the overview confidence badge: 90+ green, 70+ orange, below red. */
export const confidenceToneClass = (value: unknown) => {
  const numeric = Number(String(value ?? '').replace(/[^0-9.]/g, ''))
  if (!Number.isFinite(numeric)) return 'text-gray-9'
  if (numeric >= 90) return 'text-green-11'
  if (numeric >= 70) return 'text-orange-11'
  return 'text-red-11'
}

export const qualifyDecisionStyle = (value: string) => {
  const decision = String(value || '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .trim()

  if (decision === 'qualify') {
    return {
      className: 'border-green-4 bg-green-2 text-green-11',
      icon: 'tabler:check',
      label: 'Qualify',
    }
  }
  if (decision === 'disqualify') {
    return {
      className: 'border-red-4 bg-red-2 text-red-11',
      icon: 'tabler:x',
      label: 'Disqualify',
    }
  }
  if (decision === 'needs review' || decision === 'need review') {
    return {
      className: 'border-orange-4 bg-orange-2 text-orange-11',
      icon: 'tabler:alert-circle',
      label: 'Needs Review',
    }
  }
  return {
    className:
      'border-[var(--primary-3)] bg-[var(--primary-2)] text-[var(--primary-10)]',
    icon: 'tabler:point',
    label: value || 'Processed',
  }
}
