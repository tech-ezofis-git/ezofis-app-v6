import { flexRender, type Table as TanstackTable } from '@tanstack/react-table'
import { type ComponentProps, Fragment, useState } from 'react'
import Icon from '@/components/base/icon/Icon'
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

interface Props<TData> extends ComponentProps<'table'> {
  isReLoading: boolean
  table: TanstackTable<TData>
  /** ✅ Custom actions for action bar */
  actions?: TableActionButton[]
  component?: any
  hideGrouping?: boolean
  isLoading?: boolean

  pageSize?: number
  stickyHeader?: boolean
  onReload: () => void
}

const rowSizeClassNames = {
  comfortable: 'py-3',
  compact: 'py-2',
  default: 'py-2.5',
}

const DataTable = <TData,>({
  actions,
  component,
  hideGrouping = false,
  isLoading,
  isReLoading,
  pageSize,
  stickyHeader = false,
  table,
  onReload,
}: Props<TData>) => {
  const [rowSize, setRowSize] = useState<RowSize>('default')
  const rows = table.getRowModel().rows

  return (
    <div
      className={cn(
        `flex ${!component ? 'w-full' : 'w-full'} flex-col`,
        stickyHeader && 'max-h-full min-h-0',
      )}
    >
      <TableActionBar
        actions={actions} // ✅ pass through
        className={cn('mb-4', stickyHeader && 'mb-2')}
        component={component}
        hideGrouping={hideGrouping}
        isReloading={isReLoading}
        rowSize={rowSize}
        table={table}
        onReload={onReload}
        onRowSizeChange={setRowSize}
      />

      <div
        className={cn(
          'flex w-full rounded-xl border border-[var(--gray-3)] bg-white shadow-sm',
          stickyHeader ? 'min-h-0 flex-col' : 'overflow-hidden',
        )}
      >
        <div
          className={cn(
            'flex w-full items-start',
            stickyHeader
              ? 'minimal-scrollbar overflow-auto'
              : 'scrollbar overflow-x-auto',
          )}
        >
          <Table className='table-fixed'>
            <Thead
              className={cn(
                stickyHeader
                  ? 'sticky top-0 z-10 bg-[var(--gray-2)] shadow-sm'
                  : '',
              )}
            >
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

            {!isLoading && rows.length === 0 && (
              <TableEmptyState table={table} />
            )}

            {!isLoading && rows.length > 0 && (
              <Tbody>
                {rows.map((row) => {
                  const isGroup = (row.original as any)?.type === 'group'
                  const isExpanded = row.getIsExpanded()

                  if (isGroup) {
                    return (
                      <Fragment key={row.id}>
                        <Tr
                          className='cursor-pointer bg-[var(--gray-2)] transition-colors hover:bg-[var(--gray-3)]'
                          onClick={() => row.toggleExpanded()}
                        >
                          <Td
                            className='px-4 py-2.5'
                            colSpan={table.getVisibleFlatColumns().length}
                          >
                            <div className='flex items-center gap-2'>
                              <Icon
                                name='tabler:chevron-right'
                                className={cn(
                                  'size-4 text-[var(--gray-8)] transition-transform duration-200',
                                  isExpanded && 'rotate-90',
                                )}
                              />
                              <Icon
                                className='size-4 text-[var(--primary-9)]'
                                name='tabler:stack-2'
                              />
                              <span className='text-14 font-bold text-[var(--gray-13)]'>
                                {(row.original as any).group}
                              </span>
                            </div>
                          </Td>
                        </Tr>
                      </Fragment>
                    )
                  }

                  return (
                    <Tr
                      className='relative hover:z-50 hover:bg-[var(--gray-1)]'
                      key={row.id}
                    >
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
