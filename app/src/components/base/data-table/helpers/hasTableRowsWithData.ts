import type { Row, Table as TanstackTable } from '@tanstack/react-table'

const isItemRow = (original: { type?: string } | undefined): boolean =>
  original?.type !== 'group'

const rowTreeHasItems = <TData>(rows: Row<TData>[]): boolean => {
  for (const row of rows) {
    if (isItemRow(row.original as { type?: string })) return true
    if (row.subRows?.length && rowTreeHasItems(row.subRows)) return true
  }
  return false
}

/** True when the table has at least one data row (ignores empty group shells). */
export const hasTableRowsWithData = <TData>(
  table: TanstackTable<TData>,
): boolean => rowTreeHasItems(table.getCoreRowModel().rows)

export default hasTableRowsWithData
