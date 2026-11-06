import { type Table as TanstackTable } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import InputRadioIndicator from '@/components/base/inputs/InputRadioIndicator'
import Menu from '@/components/base/menu/Menu'
import MenuDivider from '@/components/base/menu/MenuDivider'
import MenuItem from '@/components/base/menu/MenuItem'
import MenuLabel from '@/components/base/menu/MenuLabel'
import showToast from '@/components/base/toast/showToast'
import Tooltip from '@/components/base/Tooltip'
import { formatDatetime } from '@/utils/dayjs'
import type { ExcelExportHeader } from './excelReport'

const EXPORT_TOAST_ID = 'table-export'

/** Three dots that pulse one after another, for "Exporting..." labels. */
const LoadingDots = () => (
  <span className='ml-px inline-flex' aria-hidden>
    {[0, 1, 2].map((index) => (
      <span
        className='animate-bounce'
        key={index}
        style={{ animationDelay: `${index * 150}ms` }}
      >
        .
      </span>
    ))}
  </span>
)

type ColumnScope = 'visible' | 'all'
type FileFormat = 'csv' | 'excel'
interface Props<TData> {
  table: TanstackTable<TData>
  fileName?: string
  iconOnly?: boolean
  /**
   * Excel only: rows above the data (logo, report name, period, generated
   * by...). Built when the user downloads, so it reflects the current filters.
   */
  excelHeader?: () => ExcelExportHeader
  /**
   * When set, "All rows" loads every record from the server (all pages, not
   * just the rows on screen) and exports those.
   */
  loadAllRows?: () => Promise<TData[]>
}

type RowScope = 'selected' | 'all'

const SKIP_COLUMN_IDS = new Set(['actions', 'avatar', 'drag', 'icon', 'select'])

const isExportableColumn = <TData,>(
  column: ReturnType<TanstackTable<TData>['getAllLeafColumns']>[number],
) => {
  if (SKIP_COLUMN_IDS.has(column.id)) return false
  const header = column.columnDef.header
  if (header === '' || header === undefined) {
    const metaLabel = (column.columnDef.meta as { label?: string } | undefined)
      ?.label
    if (!metaLabel) return false
  }
  return true
}

const getColumnLabel = <TData,>(
  column: ReturnType<TanstackTable<TData>['getAllLeafColumns']>[number],
) => {
  const metaLabel = (column.columnDef.meta as { label?: string } | undefined)
    ?.label
  if (metaLabel) return metaLabel
  if (typeof column.columnDef.header === 'string' && column.columnDef.header) {
    return column.columnDef.header
  }
  return column.id
}

const formatCellValue = (value: unknown, columnId: string) => {
  if (value == null || value === '') return ''

  if (Array.isArray(value)) {
    if (columnId === 'members' || columnId === 'groups') {
      return String(value.length)
    }
    return value
      .map((item) => {
        if (item == null) return ''
        if (typeof item === 'object') {
          const record = item as Record<string, unknown>
          return String(record.name || record.label || record.id || '')
        }
        return String(item)
      })
      .filter(Boolean)
      .join(', ')
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    return String(record.name || record.label || record.id || '')
  }

  const text = String(value)
  if (
    (columnId === 'created' ||
      columnId === 'createdAt' ||
      columnId === 'createdAtUtc' ||
      columnId === 'updatedAt' ||
      columnId === 'modifiedAt') &&
    /^\d{4}-\d{2}-\d{2}T/.test(text)
  ) {
    return formatDatetime(text, 'datetime')
  }

  return text
}

const getCellValue = <TData,>(
  row: ReturnType<TanstackTable<TData>['getRowModel']>['rows'][number],
  columnId: string,
) => {
  const exportValue = (
    row.getAllCells().find((cell) => cell.column.id === columnId)?.column
      .columnDef.meta as { exportValue?: (row: unknown) => unknown } | undefined
  )?.exportValue
  if (exportValue) {
    try {
      return formatCellValue(exportValue(row.original), columnId)
    } catch {
      // Fall through to the generic lookup below.
    }
  }

  try {
    const value = row.getValue(columnId)
    if (value !== undefined) return formatCellValue(value, columnId)
  } catch {
    // Column may be display-only without an accessor.
  }

  const original = row.original as Record<string, unknown>
  return formatCellValue(original?.[columnId], columnId)
}

const buildExportRows = <TData,>(
  table: TanstackTable<TData>,
  columnScope: ColumnScope,
  rowScope: RowScope,
) => {
  const columns = (
    columnScope === 'visible'
      ? table.getVisibleLeafColumns()
      : table.getAllLeafColumns()
  ).filter((column) => isExportableColumn(column))

  const rows =
    rowScope === 'selected'
      ? table.getSelectedRowModel().rows
      : table.getFilteredRowModel().rows

  const headers = columns.map((column) => getColumnLabel(column))
  const data = rows.map((row) =>
    columns.map((column) => getCellValue(row, column.id)),
  )

  return { data, headers, rowCount: rows.length }
}

const getColumnMetaExportValue = <TData,>(
  column: ReturnType<TanstackTable<TData>['getAllLeafColumns']>[number],
) =>
  (
    column.columnDef.meta as
      | { exportValue?: (row: unknown) => unknown }
      | undefined
  )?.exportValue

/** Builds the sheet from raw records (e.g. fetched from the database) instead of table rows. */
const buildExportRowsFromRecords = <TData,>(
  table: TanstackTable<TData>,
  columnScope: ColumnScope,
  records: TData[],
) => {
  const columns = (
    columnScope === 'visible'
      ? table.getVisibleLeafColumns()
      : table.getAllLeafColumns()
  ).filter((column) => isExportableColumn(column))

  const headers = columns.map((column) => getColumnLabel(column))
  const data = records.map((record) =>
    columns.map((column) => {
      const exportValue = getColumnMetaExportValue(column)
      const value = exportValue
        ? exportValue(record)
        : (record as Record<string, unknown>)?.[column.id]
      return formatCellValue(value, column.id)
    }),
  )

  return { data, headers, rowCount: records.length }
}

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

const EXCEL_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

const TableExport = <TData,>({
  excelHeader,
  fileName = 'export',
  iconOnly = true,
  loadAllRows,
  table,
}: Props<TData>) => {
  const [isExporting, setIsExporting] = useState(false)
  const [columnScope, setColumnScope] = useState<ColumnScope>('all')
  const [rowScope, setRowScope] = useState<RowScope>('all')
  const [fileFormat, setFileFormat] = useState<FileFormat>('excel')

  const hasSelectedRows = table.getIsSomeRowsSelected()
  const canDownloadSelected = rowScope !== 'selected' || hasSelectedRows

  const trigger = useMemo(
    () =>
      iconOnly ? (
        <Tooltip content='Export' position='top'>
          <IconButton color='gray' icon='lucide:download' variant='outline' />
        </Tooltip>
      ) : (
        <Button
          color='gray'
          icon='lucide:download'
          label='Export'
          variant='outline'
        />
      ),
    [iconOnly],
  )

  const handleDownload = async () => {
    if (!canDownloadSelected || isExporting) return

    setIsExporting(true)
    // Stays on screen until the file is ready; the result toast below
    // replaces it (same id).
    showToast({
      autoClose: false,
      id: EXPORT_TOAST_ID,
      loading: true,
      message: 'Preparing your file. This can take a moment…',
      toastTitle: 'Exporting',
    })

    try {
      const { data, headers, rowCount } =
        rowScope === 'all' && loadAllRows
          ? buildExportRowsFromRecords(table, columnScope, await loadAllRows())
          : buildExportRows(table, columnScope, rowScope)

      if (!headers.length || rowCount === 0) {
        showToast({
          id: EXPORT_TOAST_ID,
          message: 'There are no rows to export.',
          toastTitle: 'Nothing to export',
          variant: 'warning',
        })
        return
      }

      const sheet = XLSX.utils.aoa_to_sheet([headers, ...data])
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, sheet, 'Data')

      const stamp = new Date().toISOString().slice(0, 10)
      const baseName = `${fileName}-${stamp}`

      if (fileFormat === 'csv') {
        const csv = XLSX.utils.sheet_to_csv(sheet)
        downloadBlob(
          new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
          `${baseName}.csv`,
        )
      } else {
        // Reports: logo and report details above the data (exceljs); any
        // other table, or if that fails, the plain sheet.
        let buffer: ArrayBuffer | null = null
        if (excelHeader) {
          try {
            const { buildExcelWithHeader } = await import('./excelReport')
            buffer = await buildExcelWithHeader(excelHeader(), headers, data)
          } catch (error) {
            console.error(
              'Excel heading failed; exporting the plain sheet',
              error,
            )
          }
        }
        downloadBlob(
          new Blob(
            [
              buffer ??
                XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }),
            ],
            {
              type: EXCEL_TYPE,
            },
          ),
          `${baseName}.xlsx`,
        )
      }

      showToast({
        id: EXPORT_TOAST_ID,
        message: `${rowCount} ${rowCount === 1 ? 'row' : 'rows'} exported.`,
        toastTitle: 'Export complete',
        variant: 'success',
      })
    } catch (error) {
      console.error('Export failed', error)
      showToast({
        id: EXPORT_TOAST_ID,
        message: 'The export could not be completed. Please try again.',
        toastTitle: 'Export failed',
        variant: 'error',
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Menu
      className='px-2 pt-3'
      closeOnItemClick={false}
      position='bottom-end'
      target={trigger}
      width={200}
    >
      <MenuLabel>Columns to export</MenuLabel>
      <MenuItem
        label='Visible columns'
        leftSection={
          <InputRadioIndicator checked={columnScope === 'visible'} />
        }
        onClick={() => setColumnScope('visible')}
      />
      <MenuItem
        label='All columns'
        leftSection={<InputRadioIndicator checked={columnScope === 'all'} />}
        onClick={() => setColumnScope('all')}
      />
      <MenuDivider />

      <MenuLabel>Rows to export</MenuLabel>
      <MenuItem
        disabled={!hasSelectedRows}
        label='Selected rows'
        leftSection={<InputRadioIndicator checked={rowScope === 'selected'} />}
        onClick={() => {
          if (hasSelectedRows) setRowScope('selected')
        }}
      />
      <MenuItem
        label='All rows'
        leftSection={<InputRadioIndicator checked={rowScope === 'all'} />}
        onClick={() => setRowScope('all')}
      />
      <MenuDivider />

      <MenuLabel>File format</MenuLabel>
      <MenuItem
        label='CSV'
        leftSection={<InputRadioIndicator checked={fileFormat === 'csv'} />}
        onClick={() => setFileFormat('csv')}
      />
      <MenuItem
        label='Excel'
        leftSection={<InputRadioIndicator checked={fileFormat === 'excel'} />}
        onClick={() => setFileFormat('excel')}
      />
      <MenuDivider />

      <Button
        className='mb-px w-full justify-center text-13'
        color='gray'
        disabled={!canDownloadSelected || isExporting}
        loading={isExporting}
        variant='subtle'
        label={
          isExporting ? (
            <>
              Exporting
              <LoadingDots />
            </>
          ) : (
            'Download'
          )
        }
        onClick={() => void handleDownload()}
      />
    </Menu>
  )
}

TableExport.displayName = 'TableExport'
export default TableExport
