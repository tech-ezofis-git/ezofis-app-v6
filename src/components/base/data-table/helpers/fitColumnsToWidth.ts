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

const getMinColumnSize = <TData,>(column: Column<TData, unknown>) =>
  column.columnDef.minSize ?? 40

/** Distribute container width across visible columns (grow or shrink to fit). */
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
  const defaultTotal = flexColumns.reduce(
    (sum, column) => sum + getDefaultColumnSize(column),
    0,
  )

  if (available >= defaultTotal) {
    // Grow: keep preferred sizes, share leftover space evenly.
    let extraSpace = available - defaultTotal
    const baseExtra = Math.floor(extraSpace / flexColumns.length)
    let remainder = extraSpace - baseExtra * flexColumns.length

    for (const column of flexColumns) {
      const bump = baseExtra + (remainder > 0 ? 1 : 0)
      if (remainder > 0) remainder -= 1
      sizing[column.id] = getDefaultColumnSize(column) + bump
    }

    return sizing
  }

  // Shrink: scale preferred sizes down to fit, floored at minSize.
  const scale = available / defaultTotal
  let used = 0

  flexColumns.forEach((column, index) => {
    const minSize = getMinColumnSize(column)
    if (index === flexColumns.length - 1) {
      sizing[column.id] = Math.max(minSize, available - used)
      return
    }

    const size = Math.max(
      minSize,
      Math.floor(getDefaultColumnSize(column) * scale),
    )
    sizing[column.id] = size
    used += size
  })

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
