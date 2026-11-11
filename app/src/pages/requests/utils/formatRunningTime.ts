import { parseUtcDate } from '@/utils/utcDate'

// Matches the "Xh Ym ago" granularity already used in the request-detail
// History panel, instead of dayjs's coarser "8 hours ago".
export const formatRunningSeconds = (totalSeconds: number): string => {
  if (!Number.isFinite(totalSeconds)) return ''
  const secs = Math.max(0, Math.floor(totalSeconds))
  if (secs < 60) return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ${mins % 60}m ago`
  const days = Math.floor(hours / 24)
  return `${days}d ${hours % 24}h ago`
}

export const formatRunningTime = (date: unknown): string => {
  if (!date) return ''
  // Bare ISO datetimes from the API are UTC without a Z/offset — parse them
  // as UTC (parseUtcDate) before diffing, otherwise the browser reads them
  // as local time and the "ago" value is off by the local UTC offset.
  const parsed = parseUtcDate(date as string)
  if (!parsed) return ''
  return formatRunningSeconds(Math.abs(Date.now() - parsed.getTime()) / 1000)
}
