export function formatRelativeTime(isoDate: string): string {
  const elapsedSeconds = Math.max(
    0,
    (Date.now() - new Date(isoDate).getTime()) / 1000,
  )

  const thresholds: [number, number, string][] = [
    [60, 1, 's'],
    [3600, 60, 'm'],
    [86400, 3600, 'h'],
    [2592000, 86400, 'd'],
  ]

  for (const [max, divisor, unit] of thresholds) {
    if (elapsedSeconds < max) {
      const value = Math.max(1, Math.floor(elapsedSeconds / divisor))
      return `${value}${unit} ago`
    }
  }

  const months = Math.floor(elapsedSeconds / 2592000)
  return `${months}mo ago`
}
