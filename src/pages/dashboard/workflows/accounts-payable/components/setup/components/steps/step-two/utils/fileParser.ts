import Papa from 'papaparse'
import * as XLSX from 'xlsx'

const normalizeHeader = (h: unknown) => {
  return String(h ?? '')
    .trim()
    .replace(/\s+/g, ' ')
}

const parseCsv = async (
  csvFileOrText: File | string,
  fileName?: string,
): Promise<{
  excelSheets?: { columns: string[]; sheetName: string }[]
  headers: string[]
  lineItemHeaders?: string[]
  lineItemRows?: any[]
  previewRows: any[]
  rowCount: number
}> => {
  return new Promise((resolve, reject) => {
    Papa.parse(csvFileOrText as any, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const fields = (results.meta?.fields ?? [])
          .map(normalizeHeader)
          .filter(Boolean)
        const rowCount = results.data.length
        const previewRows = results.data.slice(0, 15)

        if (!fields.length) reject(new Error('No header row found in CSV.'))
        else {
          const sheetName = fileName
            ? fileName.replace(/\.[^/.]+$/, '')
            : 'Sheet1'
          resolve({
            excelSheets: [{ columns: fields, sheetName }],
            headers: fields,
            previewRows,
            rowCount,
          })
        }
      },
      error: (err) => reject(err),
    })
  })
}

export const extractHeadersAndData = async (
  file: File,
): Promise<{
  excelSheets?: { columns: string[]; sheetName: string }[]
  headers: string[]
  lineItemHeaders?: string[]
  lineItemRows?: any[]
  previewRows: any[]
  rowCount: number
}> => {
  const name = file.name.toLowerCase()
  if (name.endsWith('.csv')) return parseCsv(file, file.name)
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const buf = await file.arrayBuffer()
    const u8 = new Uint8Array(buf)
    const looksLikeZip = u8.length >= 2 && u8[0] === 0x50 && u8[1] === 0x4b
    if (!looksLikeZip) {
      const text = await file.text()
      return parseCsv(text, file.name)
    }
    try {
      const wb = XLSX.read(u8, { type: 'array' })
      const firstSheetName = wb.SheetNames?.[0]
      if (!firstSheetName) throw new Error('No sheets found in XLSX.')
      const ws = wb.Sheets[firstSheetName]
      const rows = XLSX.utils.sheet_to_json(ws, {
        blankrows: false,
        header: 1,
      }) as unknown[][]
      const headerRow = rows?.[0] ?? []
      const headers = headerRow.map(normalizeHeader).filter(Boolean)

      const allRows = XLSX.utils.sheet_to_json(ws) as any[]
      const previewRows = allRows.slice(0, 15)
      const rowCount = allRows.length

      let lineItemHeaders: string[] = []
      let lineItemRows: any[] = []

      // If there are multiple sheets, try to extract line items
      if (wb.SheetNames.length > 1) {
        const liWs = wb.Sheets[wb.SheetNames[1]]
        const liRows = XLSX.utils.sheet_to_json(liWs, {
          blankrows: false,
          header: 1,
        }) as unknown[][]
        const liHeaderRow = liRows?.[0] ?? []
        lineItemHeaders = liHeaderRow.map(normalizeHeader).filter(Boolean)
        lineItemRows = XLSX.utils.sheet_to_json(liWs) as any[]
      }

      const excelSheets = wb.SheetNames.map((sheetName) => {
        const sWs = wb.Sheets[sheetName]
        const sRows = XLSX.utils.sheet_to_json(sWs, {
          blankrows: false,
          header: 1,
        }) as unknown[][]
        const sHeaderRow = sRows?.[0] ?? []
        const columns = sHeaderRow.map(normalizeHeader).filter(Boolean)
        return { columns, sheetName }
      })

      return {
        excelSheets,
        headers,
        lineItemHeaders,
        lineItemRows,
        previewRows,
        rowCount,
      }
    } catch {
      const text = await file.text()
      return parseCsv(text, file.name)
    }
  }
  throw new Error('Unsupported file type. Please upload a CSV or XLSX file.')
}
