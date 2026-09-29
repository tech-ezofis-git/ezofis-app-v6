import { buildSyntheticTableField } from './AgentEditableTables'

export const normalizeQualifierKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')

const singularizeKey = (value: string) =>
  normalizeQualifierKey(value).replace(/\s+s\b/g, '').trim()

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

  const scalarFormFields = formFields.filter((field) => !isTableFieldType(field))
  const usedKeys = new Set<string>(reservedKeys)
  const scalars: QualifierScalarEntry[] = []
  const tables: QualifierTableEntry[] = []

  const pushScalar = (
    resultKey: string,
    value: unknown,
    field: any | null,
  ) => {
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

  for (const field of tableFields) {
    const resultKey = findResultKeyForFormField(result, field)
    const rows =
      resultKey && isObjectRowArray(result[resultKey])
        ? result[resultKey]
        : []
    if (resultKey) usedKeys.add(resultKey)
    if (rows.length > 0 || resultKey) {
      tables.push({
        field,
        label: getFieldHeading(field),
        resultKey: resultKey || getFieldId(field),
        rows,
      })
    }
  }

  for (const [key, value] of Object.entries(result)) {
    if (usedKeys.has(key)) continue

    if (isObjectRowArray(value)) {
      tables.push({
        field: buildSyntheticTableField(key, value),
        label: key,
        resultKey: key,
        rows: value,
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
