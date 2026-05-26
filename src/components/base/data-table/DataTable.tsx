import { flexRender, type Table as TanstackTable } from '@tanstack/react-table'
import { type ComponentProps, useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import Skeleton from '@/components/base/Skeleton'
import ListEmptyState, {
  MENU_LIST_EMPTY_CONTAINER_CLASS,
} from '@/components/common/ListEmptyState'
import Table from '@/components/base/table/Table'
import Tbody from '@/components/base/table/Tbody'
import Td from '@/components/base/table/Td'
import Thead from '@/components/base/table/Thead'
import Tr from '@/components/base/table/Tr'
import cn from '@/utils/cn'
import type { MenuPage } from '@/components/common/menuPageEmptyStates'
import type { RowSize } from './types'
import getColumnPinnedStyles from './helpers/getColumnPinnedStyles'
import hasTableRowsWithData from './helpers/hasTableRowsWithData'
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
  /** Menu page for contextual empty states (initial vs filtered). */
  emptyPage?: MenuPage
  onEmptyPrimaryAction?: () => void

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
  emptyPage,
  hideGrouping = false,
  isLoading,
  isReLoading,
  onEmptyPrimaryAction,
  pageSize,
  stickyHeader = false,
  table,
  onReload,
}: Props<TData>) => {
  const [rowSize, setRowSize] = useState<RowSize>('default')
  const rows = table.getRowModel().rows
  const hasData = hasTableRowsWithData(table)
  const showEmptyState = !isLoading && !hasData
  const showDataRows = !isLoading && hasData
  const showInitialLoading = Boolean(isLoading && !hasData)
  const showMenuEmptyPanel = showEmptyState && Boolean(emptyPage)
  const showTableLayout = hasData || (!showInitialLoading && !showMenuEmptyPanel)

  return (
    <div
      className={cn(
        `flex ${!component ? 'w-full' : 'w-full'} flex-col`,
        stickyHeader && 'max-h-full min-h-0',
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
          'flex w-full rounded-xl border border-[var(--gray-3)] bg-surface shadow-sm overflow-hidden',
          stickyHeader ? 'min-h-0 flex-1 flex-col' : '',
        )}
      >
        {showInitialLoading ? (
          <div className='flex min-h-[240px] flex-1 flex-col items-center justify-center gap-3 p-12'>
            <Skeleton className='size-14 rounded-full' />
            <Skeleton className='h-4 w-56' />
            <Skeleton className='h-3 w-72' />
          </div>
        ) : showMenuEmptyPanel ? (
          <ListEmptyState
            containerClassName={MENU_LIST_EMPTY_CONTAINER_CLASS}
            fill
            page={emptyPage!}
            table={table}
            onPrimaryAction={onEmptyPrimaryAction}
          />
        ) : showTableLayout ? (
          <div
            className={cn(
              'flex w-full items-start',
              stickyHeader
                ? 'minimal-scrollbar min-h-0 flex-1 overflow-auto'
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

              {showEmptyState && (
                <TableEmptyState
                  page={emptyPage}
                  table={table}
                  onPrimaryAction={onEmptyPrimaryAction}
                />
              )}

              {showDataRows && (
              <Tbody>
                {rows.map((row) => {
                  const isGroup = (row.original as any)?.type === 'group'
                  const isExpanded = row.getIsExpanded()

                  if (isGroup) {
                    const groupItems =
                      (row.subRows?.map((subRow) => subRow.original) as any[]) ??
                      (row.original as any).items ??
                      []
                    const poTotal = groupItems.reduce(
                      (acc: number, item: any) =>
                        acc + Number(item['WksH1Mrs42X4J9AHgoBtw'] || 0),
                      0,
                    )
                    const invoiceTotal = groupItems.reduce(
                      (acc: number, item: any) =>
                        acc + Number(item['suyqsm0SYii_8vsj4p0c_'] || 0),
                      0,
                    )
                    const isMatch =
                      Math.abs(poTotal - invoiceTotal) < 0.01 && poTotal > 0
                    const showRequestTotals =
                      groupItems.length > 0 &&
                      (groupItems[0]['WksH1Mrs42X4J9AHgoBtw'] !== undefined ||
                        groupItems[0]['suyqsm0SYii_8vsj4p0c_'] !== undefined)
                    const visibleColumns = table.getVisibleLeafColumns()
                    const groupLabelColumnIndex = Math.max(
                      0,
                      visibleColumns.findIndex((col) => col.id === 'group'),
                    )

                    return (
                      <Tr
                        key={row.id}
                        className='group/header cursor-pointer bg-surface transition-all hover:bg-[var(--gray-1)] hover:shadow-sm [--pinned-bg:var(--surface)] hover:[--pinned-bg:var(--gray-1)]'
                        onClick={() => row.toggleExpanded()}
                      >
                        {visibleColumns.map((column, columnIndex) => (
                          <Td
                            key={column.id}
                            style={getColumnPinnedStyles(column, table)}
                            className={cn(
                              'border-b border-[var(--gray-2)] py-1.5 transition-colors',
                              column.columnDef.meta?.className,
                            )}
                          >
                            {columnIndex === groupLabelColumnIndex ? (
                              <div className='flex items-center gap-2'>
                                <Icon
                                  name='tabler:chevron-right'
                                  className={cn(
                                    'size-4 shrink-0 text-[var(--gray-8)] opacity-0 transition-all duration-200 group-hover/header:opacity-100',
                                    isExpanded && 'rotate-90',
                                  )}
                                />
                                <Icon
                                  className='size-4 shrink-0 text-[var(--primary-9)]'
                                  name='tabler:stack-2'
                                />
                                <span className='text-14 font-medium text-[var(--gray-13)]'>
                                  {(row.original as any).group}
                                </span>
                                {groupItems.length > 0 && (
                                  <div className='ml-auto flex translate-x-2 items-center gap-4 opacity-0 transition-all duration-300 group-hover/header:translate-x-0 group-hover/header:opacity-100'>
                                    {showRequestTotals && (
                                      <div
                                        className={cn(
                                          'flex flex-col gap-2 rounded border px-3 py-1.5 shadow-sm transition-all',
                                          isMatch
                                            ? 'border-[var(--green-3)] bg-[var(--green-2)] group-hover/header:border-[var(--green-5)] group-hover/header:bg-[var(--green-3)]'
                                            : 'border-[var(--gray-3)] bg-surface group-hover/header:border-[var(--primary-4)] group-hover/header:bg-[var(--primary-2)]',
                                        )}
                                      >
                                        <div className='flex items-center gap-2'>
                                          <span
                                            className={cn(
                                              'text-[10px] font-normal uppercase',
                                              isMatch
                                                ? 'text-[var(--green-9)]'
                                                : 'text-[var(--gray-9)]',
                                            )}
                                          >
                                            PO
                                          </span>
                                          <span
                                            className={cn(
                                              'text-xs font-normal',
                                              isMatch
                                                ? 'text(--green-11)'
                                                : 'text-[var(--secondary-9)]',
                                            )}
                                          >
                                            ${poTotal.toFixed(2)}
                                          </span>
                                        </div>
                                        <div className='flex items-center gap-2'>
                                          <span
                                            className={cn(
                                              'text-[10px] font-normal uppercase',
                                              isMatch
                                                ? 'text-[var(--green-9)]'
                                                : 'text-[var(--gray-9)]',
                                            )}
                                          >
                                            Inv
                                          </span>
                                          <span
                                            className={cn(
                                              'text-xs font-normal',
                                              isMatch
                                                ? 'text(--green-11)'
                                                : 'text-[var(--primary-9)]',
                                            )}
                                          >
                                            ${invoiceTotal.toFixed(2)}
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                    <div className='flex items-center gap-1.5 rounded border border-transparent bg-[var(--green-2)] px-3 py-1.5 text-[11px] font-normal text-[var(--green-11)] transition-all group-hover/header:border-[var(--green-5)] group-hover/header:bg-[var(--green-3)]'>
                                      <Icon
                                        className='size-3'
                                        name='tabler:check'
                                      />
                                      {groupItems.length} Items
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : null}
                          </Td>
                        ))}
                      </Tr>
                    )
                  }

                  return (
                    <Tr
                      className='relative border-b border-[var(--gray-2)] transition-all hover:z-10 hover:bg-[var(--gray-1)] hover:shadow-sm [--pinned-bg:var(--surface)] hover:[--pinned-bg:var(--gray-1)]'
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
        ) : null}
      </div>

      <TableBulkActionBar table={table} />
    </div>
  )
}

DataTable.displayName = 'DataTable'
export default DataTable
