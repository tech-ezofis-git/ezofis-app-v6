// utils/headerSimilarity.ts

// Normalize headers (trim, remove non-alphanumeric chars, and convert to lowercase)
const normalize = (str: string) =>
  str
    .trim()
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()

export const getHeaderSimilarityScore = (
  header1: string,
  header2: string,
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
  header1: string,
  header2: string,
): boolean => {
  return getHeaderSimilarityScore(header1, header2) >= 0.8
}

export const findBestHeaderMatch = (
  targetHeader: string,
  availableHeaders: string[]
): string | undefined => {
  // First pass: look for 100% match after normalization
  const normalizedTarget = normalize(targetHeader)
  const exactMatch = availableHeaders.find(
    (h) => normalize(h) === normalizedTarget
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
