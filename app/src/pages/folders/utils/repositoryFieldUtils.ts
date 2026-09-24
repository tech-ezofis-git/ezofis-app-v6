type RepositoryRow = Record<string, any>

export const normalizeFieldKey = (key: string) =>
  String(key || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

export const matchesFieldKey = (left: string, right: string) =>
  normalizeFieldKey(left) === normalizeFieldKey(right)

const findValueInSource = (source: any, fieldKey: string) => {
  if (!source) return undefined

  let parsed = source
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed)
    } catch {
      return undefined
    }
  }

  if (!parsed || typeof parsed !== 'object') return undefined

  if (Array.isArray(parsed)) {
    const matchedItem = parsed.find((item) => {
      if (!item || typeof item !== 'object') return false
      const itemKey =
        item.key ??
        item.Key ??
        item.name ??
        item.Name ??
        item.fieldId ??
        item.FieldId ??
        item.label ??
        item.Label ??
        item.fieldName ??
        item.FieldName ??
        item.sqlColumnName ??
        item.SqlColumnName ??
        item.columnName
      return itemKey !== undefined && itemKey !== null && matchesFieldKey(String(itemKey), fieldKey)
    })

    if (!matchedItem) return undefined

    const value =
      matchedItem.value ??
      matchedItem.Value ??
      matchedItem.fieldValue ??
      matchedItem.FieldValue ??
      matchedItem.val

    if (value === undefined || value === null || value === '') return undefined
    return value
  }

  const matchedKey = Object.keys(parsed).find((key) =>
    matchesFieldKey(key, fieldKey),
  )

  if (!matchedKey) return undefined

  const value = parsed[matchedKey]
  if (value === undefined || value === null || value === '') return undefined

  return value
}

const getDetailsRowFieldValue = (row: RepositoryRow, fieldKey: string) => {
  const sections = row.DetailsRow ?? row.detailsRow
  if (!Array.isArray(sections)) return undefined

  for (const section of sections) {
    const fields = section?.fields
    if (!Array.isArray(fields)) continue

    const match = fields.find(
      (field: { key?: string; label?: string; name?: string }) =>
        matchesFieldKey(String(field?.key || ''), fieldKey) ||
        matchesFieldKey(String(field?.label || ''), fieldKey) ||
        matchesFieldKey(String(field?.name || ''), fieldKey),
    )

    if (
      match?.value !== undefined &&
      match?.value !== null &&
      match?.value !== ''
    ) {
      return match.value
    }
  }

  return undefined
}

export const getRepositoryFieldSources = (row: RepositoryRow) =>
  [
    row,
    row.metadata,
    row.Metadata,
    row.fields,
    row.Fields,
    row.values,
    row.Values,
    row.details,
    row.Details,
  ].filter(
    (source) =>
      source && (typeof source === 'object' || typeof source === 'string'),
  ) as RepositoryRow[]

export const getRepositoryFieldRawValue = (
  row: RepositoryRow | undefined,
  fieldKey: string,
  contextFilters: Record<string, string> = {},
) => {
  if (!fieldKey) return undefined

  for (const source of getRepositoryFieldSources(row || {})) {
    const value = findValueInSource(source, fieldKey)
    if (value !== undefined) return value
  }

  const detailsValue = getDetailsRowFieldValue(row || {}, fieldKey)
  if (detailsValue !== undefined) return detailsValue

  const contextKey = Object.keys(contextFilters).find((key) =>
    matchesFieldKey(key, fieldKey),
  )

  if (!contextKey) return undefined

  const contextValue = contextFilters[contextKey]
  if (contextValue === undefined || contextValue === null || contextValue === '') {
    return undefined
  }

  return contextValue
}

export const getRepositoryFieldStringValue = (
  row: RepositoryRow | undefined,
  fieldKey: string,
  contextFilters: Record<string, string> = {},
) => {
  const value = getRepositoryFieldRawValue(row, fieldKey, contextFilters)
  if (value === undefined || value === null || value === '') return ''
  return String(value).trim()
}

