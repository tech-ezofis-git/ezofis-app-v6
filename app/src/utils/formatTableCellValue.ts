// Table-field cells can hold objects (e.g. file uploads: {fileName, fileSize}),
// which React can't render directly.
export const formatTableCellValue = (value: unknown): string => {
  if (value === undefined || value === null) return ''
  if (Array.isArray(value)) return value.map(formatTableCellValue).join(', ')
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const name = obj.fileName ?? obj.name ?? obj.label ?? obj.value
    if (name !== undefined && name !== null && typeof name !== 'object') {
      return String(name)
    }
    return JSON.stringify(value)
  }
  return String(value)
}
