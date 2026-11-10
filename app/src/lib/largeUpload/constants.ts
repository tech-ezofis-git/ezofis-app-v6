/** Files above this size use the chunked large-upload path (production nginx accepts 25 MB bodies). */
export const LARGE_UPLOAD_THRESHOLD_BYTES = 20 * 1024 * 1024

/** Largest file the folder upload accepts (the API enforces its own limit too). */
export const LARGE_UPLOAD_MAX_BYTES = 10 * 1024 * 1024 * 1024

/** OCR / AI extraction for large files reads only the first pages. */
export const LARGE_UPLOAD_OCR_PAGES = 5

export const isLargeUploadFile = (size: number) =>
  size > LARGE_UPLOAD_THRESHOLD_BYTES

export const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exponent = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024)),
  )
  const value = bytes / 1024 ** exponent
  return `${value.toFixed(value >= 100 || exponent === 0 ? 0 : 1)} ${units[exponent]}`
}

export const formatDuration = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return ''
  if (seconds < 60) return `${Math.max(1, Math.round(seconds))}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ${Math.round(seconds % 60)}s`
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}
