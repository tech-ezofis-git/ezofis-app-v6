import { flexRender, type Table as TanstackTable } from '@tanstack/react-table'
import { type ComponentProps, useState, Fragment } from 'react'
import Table from '@/components/base/table/Table'
import Tbody from '@/components/base/table/Tbody'
import Td from '@/components/base/table/Td'
import Thead from '@/components/base/table/Thead'
import Tr from '@/components/base/table/Tr'
import cn from '@/utils/cn'
import type { RowSize } from './types'
import getColumnPinnedStyles from './helpers/getColumnPinnedStyles'
import TableActionBar, { type TableActionButton } from './TableActionBar'
import TableBulkActionBar from './TableBulkActionBar'
import TableEmptyState from './TableEmptyState'
import TableHeaderCell from './TableHeaderCell'
import TableSkeleton from './TableSkeleton'
import Icon from '@/components/base/icon/Icon'

interface Props<TData> extends ComponentProps<'table'> {
  isReLoading: boolean
  table: TanstackTable<TData>
  isLoading?: boolean
  pageSize?: number
  onReload: () => void
  component?: any

  /** ✅ Custom actions for action bar */
  actions?: TableActionButton[]
  stickyHeader?: boolean
  hideGrouping?: boolean
}

const rowSizeClassNames = {
  comfortable: 'py-3',
  compact: 'py-2',
  default: 'py-2.5',
}

const DataTable = <TData,>({
  isLoading,
  isReLoading,
  pageSize,
  table,
  onReload,
  component,
  actions,
  stickyHeader = false,
  hideGrouping = false,
}: Props<TData>) => {
  const [rowSize, setRowSize] = useState<RowSize>('default')
  const rows = table.getRowModel().rows

  return (
    <div className={cn(
      `flex ${!component ? 'w-full' : 'w-full'} flex-col`,
      stickyHeader && "h-full min-h-0"
    )}>
      <TableActionBar
        isReloading={isReLoading}
        rowSize={rowSize}
        table={table}
        onReload={onReload}
        onRowSizeChange={setRowSize}
        component={component}
        actions={actions} // ✅ pass through
        hideGrouping={hideGrouping}
        className={cn("mb-4", stickyHeader && "mb-2")}
      />

      <div className={cn(
        "flex w-full rounded-xl border border-[var(--gray-3)] bg-white shadow-sm",
        stickyHeader ? "flex-1 min-h-0 flex-col" : "overflow-hidden"
      )}>
        <div className={cn(
          "flex w-full items-start",
          stickyHeader ? "flex-1 overflow-auto minimal-scrollbar" : "overflow-x-auto scrollbar"
        )}>
          <Table className="table-fixed">
            <Thead className={cn(
              stickyHeader ? "sticky top-0 z-10 bg-[var(--gray-2)] shadow-sm" : ""
            )}>
              {table.getHeaderGroups().map((headerGroup) => (
                <Tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHeaderCell header={header} key={header.id} table={table} />
                  ))}
                </Tr>
              ))}
            </Thead>

            {isLoading && (
              <TableSkeleton
                pageSize={pageSize}
                rowSizeClassNames={rowSizeClassNames[rowSize]}
                table={table}
              />
            )}

            {!isLoading && rows.length === 0 && <TableEmptyState table={table} />}

            {!isLoading && rows.length > 0 && (
              <Tbody>
                {rows.map((row) => {
                  const isGroup = (row.original as any)?.type === 'group'
                  const isExpanded = row.getIsExpanded()

                  if (isGroup) {
                    return (
                      <Fragment key={row.id}>
                        <Tr
                          onClick={() => row.toggleExpanded()}
                          className="cursor-pointer bg-[var(--gray-2)] hover:bg-[var(--gray-3)] transition-colors"
                        >
                          <Td colSpan={table.getVisibleFlatColumns().length} className="py-2.5 px-4">
                            <div className="flex items-center gap-2">
                              <Icon
                                name="tabler:chevron-right"
                                className={cn(
                                  "size-4 text-[var(--gray-8)] transition-transform duration-200",
                                  isExpanded && "rotate-90"
                                )}
                              />
                              <Icon name="tabler:folders" className="size-4 text-[var(--primary-9)]" />
                              <span className="text-14 font-bold text-[var(--gray-13)]">
                                {(row.original as any).group}
                              </span>
                            </div>
                          </Td>
                        </Tr>
                      </Fragment>
                    )
                  }

                  return (
                    <Tr key={row.id} className="hover:bg-[var(--gray-1)] relative hover:z-50">
                      {row.getVisibleCells().map((cell) => (
                        <Td
                          key={cell.id}
                          style={getColumnPinnedStyles(cell.column, table)}
                          className={cn(rowSizeClassNames[rowSize], cell.column.columnDef.meta?.className)}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </Td>
                      ))}
                    </Tr>
                  )
                })}
              </Tbody>
            )}
          </Table>
        </div>
      </div>

      <TableBulkActionBar table={table} />
    </div>
  )
}

DataTable.displayName = 'DataTable'
export default DataTable
