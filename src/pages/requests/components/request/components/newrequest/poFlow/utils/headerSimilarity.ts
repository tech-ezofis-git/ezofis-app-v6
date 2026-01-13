// utils/headerSimilarity.ts

// Function to compare two headers based on character similarity
export const compareHeaderSimilarity = (
  header1: string,
  header2: string,
): boolean => {
  // Normalize headers (trim, remove spaces, and convert to lowercase)
  const normalize = (str: string) =>
    str
      .trim() // Remove leading/trailing spaces
      .replace(/[\s-_]+/g, '') // Remove spaces, underscores, and hyphens
      .toLowerCase()

  const normalizedHeader1 = normalize(header1)
  const normalizedHeader2 = normalize(header2)

  const length = Math.max(normalizedHeader1.length, normalizedHeader2.length)
  if (length === 0) return true

  // Count the number of matching characters
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

  // Calculate the similarity percentage (characters matched / total length)
  const similarityPercentage = matchCount / length
  return similarityPercentage >= 0.7 // 70% similarity threshold
}
