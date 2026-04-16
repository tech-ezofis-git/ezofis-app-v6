export function normalizeHeader(input: string): string {
  return input.trim().replace(/\s+/g, ' ').toLowerCase()
}

export function autoMap(
  systemCols: { key: string; label: string }[],
  uploadedCols: string[],
): Record<string, string> {
  const uploadedNorm = new Map(uploadedCols.map((c) => [normalizeHeader(c), c]))
  const result: Record<string, string> = {}

  for (const s of systemCols) {
    const hit =
      uploadedNorm.get(normalizeHeader(s.key)) ??
      uploadedNorm.get(normalizeHeader(s.label))
    if (hit) result[s.key] = hit
  }

  return result
}
