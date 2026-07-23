// utils/headerSimilarity.ts

// Normalize headers (trim, remove non-alphanumeric chars, and convert to lowercase)
const normalize = (str: string | null | undefined) =>
  String(str ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()

export const getHeaderSimilarityScore = (
  header1: string | null | undefined,
  header2: string | null | undefined,
): number => {
  const normalizedHeader1 = normalize(header1)
  const normalizedHeader2 = normalize(header2)

  if (normalizedHeader1 === normalizedHeader2) return 1.0

  const length = Math.max(normalizedHeader1.length, normalizedHeader2.length)
  if (length === 0) return 1.0

  // Count the number of matching characters at the same index
  let matchCount = 0
  for (
    let i = 0;
    i < Math.min(normalizedHeader1.length, normalizedHeader2.length);
    i++
  ) {
    if (normalizedHeader1[i] === normalizedHeader2[i]) {
      matchCount++
    }
  }

  return matchCount / length
}

// Keep this for backward compatibility if needed, but prefer findBestHeaderMatch
export const compareHeaderSimilarity = (
  header1: string | null | undefined,
  header2: string | null | undefined,
): boolean => {
  return getHeaderSimilarityScore(header1, header2) >= 0.8
}

export const PREDEFINED_FIELD_ALIASES: Record<string, string> = {
  'Purchase Order': 'PO Number',
}

export function normalizeFieldMapping(
  mapping: Record<string, string> = {},
  fieldDataTypes: Record<string, string> = {},
  templateColumns: readonly { key: string }[] = [],
  defaultFieldTypes: Record<string, string> = {},
): {
  fieldDataTypes: Record<string, string>
  mapping: Record<string, string>
} {
  const normalizedMapping: Record<string, string> = {}
  const normalizedTypes: Record<string, string> = {}

  for (const [rawKey, excelCol] of Object.entries(mapping || {})) {
    const resolvedKey =
      resolvePredefinedFieldKey(rawKey, templateColumns) ?? rawKey

    normalizedMapping[resolvedKey] = excelCol

    const rawType = fieldDataTypes?.[rawKey] ?? fieldDataTypes?.[resolvedKey]
    const normalizedType = rawType === 'DROPDOWN' ? 'SINGLE_SELECT' : rawType

    if (normalizedType) {
      normalizedTypes[resolvedKey] = normalizedType
    } else if (defaultFieldTypes?.[resolvedKey]) {
      normalizedTypes[resolvedKey] = defaultFieldTypes[resolvedKey]
    }
  }

  return { fieldDataTypes: normalizedTypes, mapping: normalizedMapping }
}

export function resolvePredefinedFieldKey(
  fieldName: string | null | undefined,
  templateColumns: readonly { key: string }[] = [],
): string | null {
  const trimmed = String(fieldName ?? '').trim()
  if (!trimmed) return null

  const aliasedName = PREDEFINED_FIELD_ALIASES[trimmed] ?? trimmed
  const columns = templateColumns || []

  const exact = columns.find((col) => col.key === aliasedName)
  if (exact) return exact.key

  const caseInsensitive = columns.find(
    (col) => col.key.trim().toLowerCase() === aliasedName.toLowerCase(),
  )
  if (caseInsensitive) return caseInsensitive.key

  const similarity = columns.find((col) =>
    compareHeaderSimilarity(aliasedName, col.key.trim()),
  )
  if (similarity) return similarity.key

  return null
}

export const findBestHeaderMatch = (
  targetHeader: string,
  availableHeaders: string[],
): string | undefined => {
  // First pass: look for 100% match after normalization
  const normalizedTarget = normalize(targetHeader)
  const exactMatch = availableHeaders.find(
    (h) => normalize(h) === normalizedTarget,
  )
  if (exactMatch) return exactMatch

  // Second pass: find the highest similarity >= 0.8
  let bestMatch: string | undefined = undefined
  let highestScore = 0

  for (const header of availableHeaders) {
    const score = getHeaderSimilarityScore(targetHeader, header)
    if (score >= 0.8 && score > highestScore) {
      highestScore = score
      bestMatch = header
    }
  }

  return bestMatch
}
