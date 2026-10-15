import * as XLSX from 'xlsx'
import type { Column } from '@/components/base/data-table/types'

export interface ExportRequestListResult {
  columnCount: number
  rowCount: number
}

interface ExportRequestListOptions {
  /** Columns to write, in order. Each needs an `exportValue`. */
  columns: Column[]
  /** Joined with "_" (special characters removed), then the timestamp. */
  fileNameParts: string[]
  rows: unknown[]
}

const MIN_COLUMN_WIDTH = 10
const MAX_COLUMN_WIDTH = 48

/** Keeps letters and digits only: "Accounts Payable" -> "AccountsPayable". */
const cleanNamePart = (part: string) => part.replace(/[^\p{L}\p{N}]+/gu, '')

const pad = (value: number) => String(value).padStart(2, '0')

/** Local date and time as YYYYMMDDHHmmss, e.g. 20261015143205. */
const timestamp = (date = new Date()) =>
  `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
  `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`

const buildFileName = (parts: string[]) => {
  const name = parts.map(cleanNamePart).filter(Boolean).join('_')
  return `${name || 'Requests'}_${timestamp()}.xlsx`
}

const readExportValue = (column: Column, row: unknown) => {
  try {
    return column.exportValue?.(row) ?? ''
  } catch {
    return ''
  }
}

/**
 * Downloads the request list as an .xlsx file. Only columns that define an
 * `exportValue` are written, so action menus, status pills and icons never
 * leak into the sheet. Returns null when there is nothing to export.
 */
export const exportRequestListToExcel = ({
  columns,
  fileNameParts,
  rows,
}: ExportRequestListOptions): ExportRequestListResult | null => {
  const exportable = columns.filter((column) => column.exportValue)

  if (exportable.length === 0 || rows.length === 0) return null

  const headers = exportable.map((column) => column.exportLabel || column.label)
  const data = rows.map((row) =>
    exportable.map((column) => readExportValue(column, row)),
  )

  const sheet = XLSX.utils.aoa_to_sheet([headers, ...data])
  sheet['!cols'] = headers.map((header, index) => {
    const longest = data.reduce(
      (max, line) => Math.max(max, String(line[index] ?? '').length),
      header.length,
    )
    return {
      wch: Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, longest + 2)),
    }
  })

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Requests')

  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const url = URL.createObjectURL(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = buildFileName(fileNameParts)
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)

  return { columnCount: exportable.length, rowCount: rows.length }
}
