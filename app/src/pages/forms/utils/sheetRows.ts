/**
 * Turns the raw rows of a sheet (`sheet_to_json(ws, { header: 1 })`) into
 * header-keyed records for the bulk import.
 *
 * Values are read by column position, so every record key is exactly one of the
 * returned headers. Header text is trimmed (a trailing space or line break in a
 * header cell is common in hand-made sheets); keying records by the raw header,
 * as `sheet_to_json(ws)` does, made those columns read back as empty. A repeated
 * header gets a " (2)", " (3)" ... suffix so both columns stay mappable, and
 * columns with a blank header are left out.
 */
export function sheetRowsToRecords(rawRows: unknown[][]): {
  headers: string[]
  rows: Record<string, unknown>[]
} {
  const headerRow = rawRows[0] || []
  const seen = new Map<string, number>()
  const columns: { header: string; index: number }[] = []

  headerRow.forEach((cell, index) => {
    const text = String(cell ?? '').trim()
    if (!text) return
    const count = (seen.get(text) || 0) + 1
    seen.set(text, count)
    columns.push({ header: count > 1 ? `${text} (${count})` : text, index })
  })

  const rows: Record<string, unknown>[] = []
  for (const raw of rawRows.slice(1)) {
    if (!Array.isArray(raw)) continue
    const record: Record<string, unknown> = {}
    let hasValue = false
    for (const { header, index } of columns) {
      const value = raw[index]
      if (value === undefined || value === null || value === '') continue
      record[header] = value
      hasValue = true
    }
    if (hasValue) rows.push(record)
  }

  return { headers: columns.map((c) => c.header), rows }
}
