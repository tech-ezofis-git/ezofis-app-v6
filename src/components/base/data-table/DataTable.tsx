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
        stickyHeader && 'h-full min-h-0',
      )}
    >
      <TableActionBar
        actions={actions} // ✅ pass through
        className={cn('mb-4')}
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
          stickyHeader ? 'min-h-0 flex-1 flex-col' : 'overflow-hidden',
        )}
      >
        <div
          className={cn(
            'flex w-full items-start',
            stickyHeader
              ? 'minimal-scrollbar flex-1 overflow-auto'
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
                    const groupItems = (row.original as any).items || []
                    const poTotal = groupItems.reduce((acc: number, item: any) => acc + Number(item["WksH1Mrs42X4J9AHgoBtw"] || 0), 0)
                    const invoiceTotal = groupItems.reduce((acc: number, item: any) => acc + Number(item["suyqsm0SYii_8vsj4p0c_"] || 0), 0)
                    const isMatch = Math.abs(poTotal - invoiceTotal) < 0.01 && poTotal > 0

                    return (
                      <Fragment key={row.id}>
                        <Tr
                          className='cursor-pointer group/header bg-[var(--gray-2)] transition-colors hover:bg-[var(--gray-3)]'
                          onClick={() => row.toggleExpanded()}
                        >
                          <Td
                            className='px-4 py-2.5 border-b border-transparent group-hover/header:border-b-[var(--primary-9)] transition-colors'
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
                              {groupItems.length > 0 && (
                                <div className='ml-auto flex items-center gap-4 pr-4'>
                                  {(groupItems[0]["WksH1Mrs42X4J9AHgoBtw"] !== undefined || groupItems[0]["suyqsm0SYii_8vsj4p0c_"] !== undefined) && (
                                    <div className={cn(
                                      'flex items-center gap-3 px-3 py-1.5 rounded border shadow-sm transition-all',
                                      isMatch 
                                        ? 'bg-[var(--green-2)] border-[var(--green-3)] group-hover/header:bg-[var(--green-3)] group-hover/header:border-[var(--green-5)]' 
                                        : 'bg-white border-[var(--gray-3)] group-hover/header:bg-[var(--primary-2)] group-hover/header:border-[var(--primary-4)]'
                                    )}>
                                      <div className='flex items-center gap-2'>
                                        <span className={cn('text-[10px] font-bold uppercase', isMatch ? 'text-[var(--green-9)]' : 'text-[var(--gray-9)]')}>PO</span>
                                        <span className={cn('text-xs font-bold', isMatch ? 'text(--green-11)' : 'text-[var(--secondary-9)]')}>
                                          ${poTotal.toFixed(2)}
                                        </span>
                                      </div>
                                      <div className={cn('w-px h-3', isMatch ? 'bg-[var(--green-4)]' : 'bg-[var(--gray-3)]')} />
                                      <div className='flex items-center gap-2'>
                                        <span className={cn('text-[10px] font-bold uppercase', isMatch ? 'text-[var(--green-9)]' : 'text-[var(--gray-9)]')}>Inv</span>
                                        <span className={cn('text-xs font-bold', isMatch ? 'text(--green-11)' : 'text-[var(--primary-9)]')}>
                                          ${invoiceTotal.toFixed(2)}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                  <div className='flex items-center gap-1.5 px-3 py-1.5 bg-[var(--green-2)] group-hover/header:bg-[var(--green-3)] group-hover/header:border-[var(--green-5)] border border-transparent text-[var(--green-11)] rounded text-[11px] font-bold transition-all'>
                                    <Icon name='tabler:check' className='size-3' />
                                    {groupItems.length} Items
                                  </div>
                                </div>
                              )}
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
