import { compareHeaderSimilarity } from './headerSimilarity'

/**
 * Merges multiple sheet data arrays into a single logical dataset.
 * Normalizes headers using similarity matching.
 */
export const mergeLineItemSheets = (
  sheetsData: { headers: string[]; rows: any[] }[],
): { headers: string[]; rows: any[] } => {
  if (!sheetsData || sheetsData.length === 0) {
    return { headers: [], rows: [] }
  }

  // Find the canonical header name for any given raw header
  const canonicalHeaders: string[] = []
  const headerMapBySheet: Record<string, string>[] = []

  sheetsData.forEach((sheet, sheetIndex) => {
    const currentSheetMap: Record<string, string> = {}
    sheet.headers.forEach((rawHeader) => {
      // Check if it matches an existing canonical header
      const match = canonicalHeaders.find((ch) =>
        compareHeaderSimilarity(rawHeader, ch),
      )
      if (match) {
        currentSheetMap[rawHeader] = match
      } else {
        canonicalHeaders.push(rawHeader)
        currentSheetMap[rawHeader] = rawHeader
      }
    })
    headerMapBySheet[sheetIndex] = currentSheetMap
  })

  // Merge all rows, translating keys to canonical headers
  const mergedRows: any[] = []
  sheetsData.forEach((sheet, sheetIndex) => {
    const currentSheetMap = headerMapBySheet[sheetIndex]
    sheet.rows.forEach((row) => {
      const normalizedRow: any = {}
      Object.keys(row).forEach((rawKey) => {
        const canonicalKey = currentSheetMap[rawKey]
        if (canonicalKey) {
          normalizedRow[canonicalKey] = row[rawKey]
        }
      })
      mergedRows.push(normalizedRow)
    })
  })

  return { headers: canonicalHeaders, rows: mergedRows }
}

/**
 * Automatically detects the common grouping column from the headers.
 */
export const detectGroupingColumn = (headers: string[]): string | null => {
  const possibleNames = ['po number', 'pono', 'purchase order number', 'po#']
  for (const name of possibleNames) {
    const match = headers.find((h) =>
      h
        .toLowerCase()
        .replace(/[\s-_]+/g, '')
        .includes(name.replace(/[\s-_]+/g, '')),
    )
    if (match) return match
  }
  return null
}

/**
 * Groups rows by the selected grouping column.
 */
export const groupLineItems = (
  rows: any[],
  groupCol: string,
): Record<string, any[]> => {
  return rows.reduce((acc, row) => {
    const key = String(row[groupCol] || '').trim()
    if (!key) return acc // Skip empty keys
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(row)
    return acc
  }, {} as Record<string, any[]>)
}

/**
 * Returns rows for a specific group.
 */
export const getPreviewGroup = (
  groupedData: Record<string, any[]>,
  groupId: string,
): any[] => {
  return groupedData[groupId] || []
}

/**
 * Transforms rows by replacing Excel headers with mapped System Fields.
 */
export const transformMappedRows = (
  rows: any[],
  mapping: Record<string, string>,
): any[] => {
  // mapping is SystemField -> ExcelHeader
  // We need to build an object that only contains SystemFields
  return rows.map((row) => {
    const transformedRow: any = {}
    Object.entries(mapping).forEach(([systemKey, excelHeader]) => {
      if (excelHeader && excelHeader !== 'Skip to Import') {
        transformedRow[systemKey] = row[excelHeader]
      }
    })
    return transformedRow
  })
}
