import type { Column, Table as TanstackTable } from '@tanstack/react-table'
import type { CSSProperties } from 'react'

export default function getColumnPinnedStyles<TData>(
  column: Column<TData>,
  table: TanstackTable<TData>,
): CSSProperties {
  const isPinned = column.getIsPinned()
  const isLastCenterColumn = column.getIsLastColumn('center')
  const isFirstRightPinnedColumn =
    isPinned === 'right' && column.getIsFirstColumn('right')
  const hasRightPinnedColumns = table.getRightLeafColumns().length > 0

  return {
    backgroundColor: isPinned ? 'var(--surface-pinned)' : undefined,
    borderLeftWidth: isFirstRightPinnedColumn ? '1px' : undefined,
    borderRightWidth:
      hasRightPinnedColumns && isLastCenterColumn ? '0px' : undefined,
    left: isPinned === 'left' ? `${column.getStart('left')}px` : undefined,
    position: isPinned ? 'sticky' : 'relative',
    right: isPinned === 'right' ? `${column.getAfter('right')}px` : undefined,
    width: `${column.getSize()}px`,
    zIndex: isPinned ? 1 : 0,
  }
}
