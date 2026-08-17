export function formatRelativeTime(rawDate: string): string {
  if (!rawDate) return ''

  // Handle minutesAgo(X)
  const minutesMatch = rawDate.match(/minutesAgo\((\d+)\)/i)
  if (minutesMatch) {
    const mins = parseInt(minutesMatch[1], 10)
    if (isNaN(mins) || mins === 0) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  // Handle daysAgo(X)
  const daysMatch = rawDate.match(/daysAgo\((\d+)\)/i)
  if (daysMatch) {
    const days = parseInt(daysMatch[1], 10)
    if (isNaN(days) || days === 0) return 'Just now'
    return `${days}d ago`
  }

  // Handle weekAgo(X) or weeksAgo(X)
  const weeksMatch = rawDate.match(/weeks?Ago\((\d+)\)/i)
  if (weeksMatch) {
    const weeks = parseInt(weeksMatch[1], 10)
    if (isNaN(weeks) || weeks === 0) return 'Just now'
    return `${weeks}w ago`
  }

  // Standard Date parsing
  const parsedTime = new Date(rawDate).getTime()
  if (isNaN(parsedTime)) {
    return rawDate
  }

  const elapsedSeconds = Math.max(0, (Date.now() - parsedTime) / 1000)

  if (elapsedSeconds < 60) {
    return 'Just now'
  }

  const thresholds: [number, number, string][] = [
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

  const months = Math.max(1, Math.floor(elapsedSeconds / 2592000))
  return `${months}mo ago`
}
