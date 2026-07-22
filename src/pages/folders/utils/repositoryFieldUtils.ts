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

const findValueInSource = (source: RepositoryRow, fieldKey: string) => {
  if (!source || typeof source !== 'object') return undefined

  const matchedKey = Object.keys(source).find(
    (key) => normalizeFieldKey(key) === normalizeFieldKey(fieldKey),
  )

  if (!matchedKey) return undefined

  const value = source[matchedKey]
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
      (field: { key?: string; label?: string }) =>
        normalizeFieldKey(String(field?.key || '')) ===
          normalizeFieldKey(fieldKey) ||
        normalizeFieldKey(String(field?.label || '')) ===
          normalizeFieldKey(fieldKey),
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
  ].filter((source) => source && typeof source === 'object') as RepositoryRow[]

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

  const contextKey = Object.keys(contextFilters).find(
    (key) => normalizeFieldKey(key) === normalizeFieldKey(fieldKey),
  )

  if (!contextKey) return undefined

  const contextValue = contextFilters[contextKey]
  if (
    contextValue === undefined ||
    contextValue === null ||
    contextValue === ''
  ) {
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
