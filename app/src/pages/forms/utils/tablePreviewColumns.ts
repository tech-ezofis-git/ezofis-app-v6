type TableRow = Record<string, unknown>

interface TableFieldLike {
  settings?: {
    specific?: {
      columns?: unknown
      tableColumns?: unknown
    }
  }
}

/**
 * The columns the entry's table preview shows: the form's own columns in the
 * form's order, then any other keys found in the saved rows (older or imported
 * data). Rows store only what was filled in, in any order, so neither the
 * first row's keys nor their order can be trusted to list the columns.
 */
export const getTablePreviewColumns = (
  field: TableFieldLike | null | undefined,
  rows: TableRow[],
): string[] => {
  const specific = field?.settings?.specific
  const configured = specific?.tableColumns ?? specific?.columns
  const columns = Array.isArray(configured)
    ? configured
        .map((col: { id?: unknown }) => String(col?.id ?? ''))
        .filter(Boolean)
    : []
  const seen = new Set(columns)
  for (const row of rows) {
    for (const key of Object.keys(row ?? {})) {
      if (seen.has(key)) continue
      seen.add(key)
      columns.push(key)
    }
  }
  return columns
}
