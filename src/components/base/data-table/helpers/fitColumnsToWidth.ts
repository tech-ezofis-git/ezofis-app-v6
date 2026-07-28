import type {
  Column,
  ColumnSizingState,
  Table as TanstackTable,
} from '@tanstack/react-table'

const FIXED_COLUMN_IDS = new Set([
  'select',
  'actions',
  'avatar',
  'drag',
  'icon',
])

const isFixedWidthColumn = <TData,>(column: Column<TData, unknown>) => {
  if (!column.getCanResize() || FIXED_COLUMN_IDS.has(column.id)) return true

  const minSize = column.columnDef.minSize
  const maxSize = column.columnDef.maxSize
  return (
    typeof minSize === 'number' &&
    typeof maxSize === 'number' &&
    minSize === maxSize
  )
}

const getDefaultColumnSize = <TData,>(column: Column<TData, unknown>) =>
  column.columnDef.size ?? column.getSize()

/** Distribute container width across visible columns (equal share for flexible cols). */
export default function fitColumnsToWidth<TData>(
  table: TanstackTable<TData>,
  containerWidth: number,
): ColumnSizingState | null {
  if (containerWidth <= 0) return null

  const visibleColumns = table.getVisibleLeafColumns()
  if (visibleColumns.length === 0) return null

  const fixedColumns = visibleColumns.filter(isFixedWidthColumn)
  const flexColumns = visibleColumns.filter((column) => !isFixedWidthColumn(column))

  const sizing: ColumnSizingState = {}
  let fixedTotal = 0

  for (const column of fixedColumns) {
    const size = getDefaultColumnSize(column)
    sizing[column.id] = size
    fixedTotal += size
  }

  if (flexColumns.length === 0) {
    return sizing
  }

  const available = Math.max(containerWidth - fixedTotal, flexColumns.length)
  const baseSize = Math.floor(available / flexColumns.length)
  let remainder = available - baseSize * flexColumns.length

  for (const column of flexColumns) {
    const defaultSize = getDefaultColumnSize(column)
    const extra = remainder > 0 ? 1 : 0
    if (remainder > 0) remainder -= 1
    sizing[column.id] = Math.max(defaultSize, baseSize + extra)
  }

  return sizing
}

export function columnSizingEquals(
  current: ColumnSizingState,
  next: ColumnSizingState,
) {
  const currentKeys = Object.keys(current)
  const nextKeys = Object.keys(next)
  if (currentKeys.length !== nextKeys.length) return false

  return nextKeys.every((key) => current[key] === next[key])
}
