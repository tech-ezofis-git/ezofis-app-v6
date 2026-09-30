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
import Tooltip from '@/components/base/Tooltip'
import { formatDatetime } from '@/utils/dayjs'

type ColumnScope = 'visible' | 'all'
type FileFormat = 'csv' | 'excel'
interface Props<TData> {
  table: TanstackTable<TData>
  fileName?: string
  iconOnly?: boolean
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

const TableExport = <TData,>({
  fileName = 'export',
  iconOnly = true,
  table,
}: Props<TData>) => {
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

  const handleDownload = () => {
    if (!canDownloadSelected) return

    const { data, headers, rowCount } = buildExportRows(
      table,
      columnScope,
      rowScope,
    )

    if (!headers.length || rowCount === 0) return

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
      return
    }

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    })
    downloadBlob(
      new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
      `${baseName}.xlsx`,
    )
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
        disabled={!canDownloadSelected}
        label='Download'
        variant='subtle'
        onClick={handleDownload}
      />
    </Menu>
  )
}

TableExport.displayName = 'TableExport'
export default TableExport
