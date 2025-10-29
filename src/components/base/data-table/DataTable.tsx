import { flexRender, type Table as TanstackTable } from '@tanstack/react-table'
import { type ComponentProps, useState } from 'react'
import Table from '@/components/base/table/Table'
import Tbody from '@/components/base/table/Tbody'
import Td from '@/components/base/table/Td'
import Thead from '@/components/base/table/Thead'
import Tr from '@/components/base/table/Tr'
import cn from '@/utils/cn'
import type { RowSize } from './types'
import getColumnPinnedStyles from './helpers/getColumnPinnedStyles'
import TableActionBar from './TableActionBar'
import TableBulkActionBar from './TableBulkActionBar'
import TableEmptyState from './TableEmptyState'
import TableHeaderCell from './TableHeaderCell'
import TableSkeleton from './TableSkeleton'

interface Props<TData> extends ComponentProps<'table'> {
  isReLoading: boolean
  table: TanstackTable<TData>
  isLoading?: boolean
  pageSize?: number
  onReload: () => void
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
}: Props<TData>) => {
  const [rowSize, setRowSize] = useState<RowSize>('default')
  const rows = table.getRowModel().rows

  return (
    <>
      <TableActionBar
        isReloading={isReLoading}
        rowSize={rowSize}
        table={table}
        onReload={onReload}
        onRowSizeChange={setRowSize}
      />

      <div className='scrollbar w-full overflow-x-auto'>
        <Table className='table-fixed'>
          <Thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <Tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHeaderCell
                    header={header}
                    key={header.id}
                    table={table}
                  />
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
              {rows.map((row) => (
                <Tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <Td
                      key={cell.id}
                      style={getColumnPinnedStyles(cell.column, table)}
                      className={cn(
                        rowSizeClassNames[rowSize],
                        cell.column.columnDef.meta?.className,
                      )}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </Td>
                  ))}
                </Tr>
              ))}
            </Tbody>
          )}
        </Table>
      </div>

      <TableBulkActionBar table={table} />
    </>
  )
}

DataTable.displayName = 'DataTable'
export default DataTable
