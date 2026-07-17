import { flexRender, type Table as TanstackTable } from '@tanstack/react-table'
import {
  type ComponentProps,
  useCallback,
  useRef,
  useState,
} from 'react'
import type { MenuPage } from '@/components/common/menuPageEmptyStates'
import Icon from '@/components/base/icon/Icon'
import Skeleton from '@/components/base/Skeleton'
import Table from '@/components/base/table/Table'
import Tbody from '@/components/base/table/Tbody'
import Td from '@/components/base/table/Td'
import Thead from '@/components/base/table/Thead'
import Tr from '@/components/base/table/Tr'
import ListEmptyState, {
  MENU_LIST_EMPTY_CONTAINER_CLASS,
} from '@/components/common/ListEmptyState'
import cn from '@/utils/cn'
import type { RowSize } from './types'
import getColumnPinnedStyles from './helpers/getColumnPinnedStyles'
import hasTableRowsWithData from './helpers/hasTableRowsWithData'
import TableActionBar, { type TableActionButton } from './TableActionBar'
import TableBulkActionBar from './TableBulkActionBar'
import TableEllipsis, {
  shouldAllowCellOverflow,
  shouldDisableTableEllipsis,
} from './TableEllipsis'
import TableEmptyState from './TableEmptyState'
import TableHeaderCell from './TableHeaderCell'
import TableSkeleton from './TableSkeleton'

interface Props<TData> extends ComponentProps<'table'> {
  isReLoading: boolean
  table: TanstackTable<TData>
  /** ✅ Custom actions for action bar */
  actions?: TableActionButton[]
  component?: any
  /** Menu page for contextual empty states (initial vs filtered). */
  emptyPage?: MenuPage
  emptyDescription?: string
  emptyIcon?: string
  emptyTitle?: string
  /** Infinite-scroll / load-more support */
  hasMore?: boolean
  hideGrouping?: boolean
  /** Hides the built-in table action bar (search, export, etc.). */
  hideActionBar?: boolean
  hideExport?: boolean
  hideReload?: boolean
  hideSearch?: boolean
  hideFilters?: boolean
  /** Hides "N Items" on group rows but keeps the same row spacing. */
  hideGroupItemCountOnHover?: boolean
  isLoading?: boolean

  isLoadingMore?: boolean
  /**
   * When true, TanStack pinned columns will be sticky.
   * Parent table must provide columnPinning state.
   */
  isSticky?: boolean
  loadingMoreText?: string

  loadMoreOffset?: number
  loadMoreText?: string
  pageSize?: number
  rowSize?: RowSize
  stickyHeader?: boolean
  /** Table body height. Example: 500 or 'calc(100vh - 340px)' */
  tableBodyMaxHeight?: string | number
  onEmptyPrimaryAction?: () => void

  onLoadMore?: () => void

  onReload: () => void
  onRowSizeChange?: (rowSize: RowSize) => void
}

const rowSizeClassNames = {
  comfortable: 'py-3',
  compact: 'py-2',
  default: 'py-2.5',
}

const getStickyColumnStyle = <TData,>(
  column: any,
  table: TanstackTable<TData>,
  isSticky: boolean,
  options?: { isHeader?: boolean },
) => {
  if (!isSticky) return undefined

  return {
    ...getColumnPinnedStyles(column, table),
    background: options?.isHeader
      ? 'var(--gray-2)'
      : 'var(--pinned-bg, var(--surface))',
  }
}

const DataTable = <TData,>({
  actions,
  component,
  emptyPage,
  emptyDescription,
  emptyIcon,
  emptyTitle,
  hasMore = false,
  hideActionBar = false,
  hideExport = false,
  hideReload = false,
  hideSearch = false,
  hideFilters = false,
  hideGrouping = false,
  hideGroupItemCountOnHover = false,
  isLoading,
  isLoadingMore = false,
  isReLoading,
  isSticky = false,
  loadingMoreText = 'Loading more...',
  loadMoreOffset = 120,
  loadMoreText = 'Scroll down to load more',
  pageSize,
  rowSize: rowSizeProp,
  stickyHeader = false,
  table,
  tableBodyMaxHeight,
  onEmptyPrimaryAction,
  onLoadMore,
  onReload,
  onRowSizeChange,
}: Props<TData>) => {
  const [internalRowSize, setInternalRowSize] = useState<RowSize>('default')
  const rowSize = rowSizeProp ?? internalRowSize
  const setRowSize = onRowSizeChange ?? setInternalRowSize
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const loadMoreLockRef = useRef(false)

  const rows = table.getRowModel().rows
  const hasData = hasTableRowsWithData(table)
  const showEmptyState = !isLoading && !hasData
  const showDataRows = !isLoading && hasData
  const showInitialLoading = Boolean(isLoading && !hasData)
  const showMenuEmptyPanel = showEmptyState && Boolean(emptyPage)
  const showTableLayout =
    hasData || (!showInitialLoading && !showMenuEmptyPanel)
  const visibleColumnCount = Math.max(1, table.getVisibleLeafColumns().length)
  const useScrollContainer = Boolean(tableBodyMaxHeight || onLoadMore)

  const getCellPinnedStyle = useCallback(
    (column: any) =>
      isSticky
        ? getStickyColumnStyle(column, table, isSticky)
        : getColumnPinnedStyles(column, table),
    [isSticky, table],
  )

  const handleScroll = useCallback(() => {
    const container = scrollRef.current
    if (!container || !hasMore || isLoadingMore || isLoading || !onLoadMore)
      return

    const reachedBottom =
      container.scrollTop + container.clientHeight >=
      container.scrollHeight - loadMoreOffset

    if (!reachedBottom || loadMoreLockRef.current) return

    loadMoreLockRef.current = true
    onLoadMore()

    globalThis.setTimeout(() => {
      loadMoreLockRef.current = false
    }, 350)
  }, [hasMore, isLoadingMore, isLoading, loadMoreOffset, onLoadMore])

  const renderTableContent = () => {
    if (showInitialLoading) {
      return (
        <div className='flex min-h-[240px] flex-1 flex-col items-center justify-center gap-3 p-12'>
          <Skeleton className='size-14 rounded-full' />
          <Skeleton className='h-4 w-56' />
          <Skeleton className='h-3 w-72' />
        </div>
      )
    }

    if (showMenuEmptyPanel) {
      return (
        <ListEmptyState
          containerClassName={MENU_LIST_EMPTY_CONTAINER_CLASS}
          page={emptyPage!}
          table={table}
          fill
          onPrimaryAction={onEmptyPrimaryAction}
        />
      )
    }

    if (showTableLayout) {
      const scrollContainerClass = useScrollContainer
        ? 'relative ez-scrollbar'
        : 'flex items-start'

      let stickyHeaderClass = 'scrollbar overflow-x-auto'
      if (stickyHeader) {
        stickyHeaderClass = 'minimal-scrollbar min-h-0 flex-1 overflow-auto'
      } else if (useScrollContainer) {
        stickyHeaderClass = 'scrollbar overflow-auto'
      }

      let theadStickyClass = ''
      if (stickyHeader) {
        theadStickyClass = cn(
          'sticky top-0 bg-[var(--gray-2)] shadow-sm',
          isSticky ? 'z-30' : 'z-10',
        )
      }

      return (
        <div
          className={cn('w-full', scrollContainerClass, stickyHeaderClass)}
          ref={scrollRef}
          style={
            tableBodyMaxHeight
              ? {
                maxHeight: tableBodyMaxHeight,
                minHeight: tableBodyMaxHeight,
              }
              : undefined
          }
          onScroll={useScrollContainer ? handleScroll : undefined}
        >
          <Table
            className='table-fixed'
            style={{
              minWidth: '100%',
              width: table.getTotalSize(),
            }}
          >
            <Thead className={theadStickyClass}>
              {table.getHeaderGroups().map((headerGroup) => (
                <Tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHeaderCell
                      header={header}
                      key={header.id}
                      table={table}
                      style={getStickyColumnStyle(
                        header.column,
                        table,
                        isSticky,
                        { isHeader: true },
                      )}
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
                emptyDescription={emptyDescription}
                emptyIcon={emptyIcon}
                emptyTitle={emptyTitle}
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
                      (row.subRows?.map(
                        (subRow) => subRow.original,
                      ) as any[]) ??
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
                        className='group/header cursor-pointer bg-surface transition-all [--pinned-bg:var(--surface)] hover:bg-[var(--gray-1)] hover:shadow-sm hover:[--pinned-bg:var(--gray-1)]'
                        key={row.id}
                        onClick={() => row.toggleExpanded()}
                      >
                        {visibleColumns.map((column, columnIndex) => (
                          <Td
                            key={column.id}
                            style={getCellPinnedStyle(column)}
                            className={cn(
                              'border-b border-[var(--gray-2)] py-1.5 transition-colors',
                              column.columnDef.meta?.className,
                            )}
                          >
                            {columnIndex === groupLabelColumnIndex ? (
                              <div
                                className={cn(
                                  'flex items-center gap-2',
                                  hideGroupItemCountOnHover && 'min-h-8',
                                )}
                              >
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
                                <span className='text-14 font-medium text-[var(--gray-13)] whitespace-nowrap'>
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
                                                ? 'text-[var(--green-11)]'
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
                                                ? 'text-[var(--green-11)]'
                                                : 'text-[var(--primary-9)]',
                                            )}
                                          >
                                            ${invoiceTotal.toFixed(2)}
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                    <div
                                      aria-hidden={hideGroupItemCountOnHover}
                                      className={cn(
                                        'flex items-center gap-1.5 rounded border border-transparent bg-[var(--green-2)] px-3 py-1.5 text-[11px] font-normal text-[var(--green-11)] transition-all group-hover/header:border-[var(--green-5)] group-hover/header:bg-[var(--green-3)]',
                                        hideGroupItemCountOnHover &&
                                        'pointer-events-none invisible',
                                      )}
                                    >
                                      <Icon
                                        className='size-3 shrink-0'
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
                      className='relative border-b border-[var(--gray-2)] transition-all [--pinned-bg:var(--surface)] hover:z-10 hover:bg-[var(--gray-1)] hover:shadow-sm hover:[--pinned-bg:var(--gray-1)]'
                      key={row.id}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const allowOverflow = shouldAllowCellOverflow(
                          cell.column.id,
                          cell.column.columnDef.meta?.disableEllipsis,
                        )
                        const pinnedStyle = getCellPinnedStyle(cell.column) || {}

                        return (
                          <Td
                            key={cell.id}
                            data-datatable-actions={
                              allowOverflow ? true : undefined
                            }
                            style={pinnedStyle}
                            className={cn(
                              'group/dtcell',
                              allowOverflow
                                ? 'overflow-visible'
                                : 'max-w-0 overflow-hidden',
                              rowSizeClassNames[rowSize],
                              cell.column.columnDef.meta?.className,
                            )}
                          >
                            <TableEllipsis
                              disabled={shouldDisableTableEllipsis(
                                cell.column.id,
                                cell.column.columnDef.meta?.disableEllipsis,
                              )}
                            >
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext(),
                              )}
                            </TableEllipsis>
                          </Td>
                        )
                      })}
                    </Tr>
                  )
                })}

                {isLoadingMore ? (
                  <Tr>
                    <Td
                      className='py-4 text-center text-sm font-semibold text-[var(--gray-9)]'
                      colSpan={visibleColumnCount}
                    >
                      {loadingMoreText}
                    </Td>
                  </Tr>
                ) : hasMore ? (
                  <Tr>
                    <Td
                      className='py-4 text-center text-sm font-semibold text-[var(--primary-9)]'
                      colSpan={visibleColumnCount}
                    >
                      {loadMoreText}
                    </Td>
                  </Tr>
                ) : null}
              </Tbody>
            )}
          </Table>
        </div>
      )
    }

    return null
  }

  return (
    <div
      className={cn(
        'flex w-full flex-col',
        stickyHeader && 'max-h-full min-h-0',
      )}
    >
      {!hideActionBar && (
        <TableActionBar
          actions={actions} // ✅ pass through
          className={cn('mb-4')}
          component={component}
          hideGrouping={hideGrouping}
          hideExport={hideExport}
          hideReload={hideReload}
          hideSearch={hideSearch}
          hideFilters={hideFilters}
          isReloading={isReLoading}
          rowSize={rowSize}
          table={table}
          onReload={onReload}
          onRowSizeChange={setRowSize}
        />
      )}

      <div
        className={cn(
          'flex w-full overflow-hidden rounded-xl border border-[var(--gray-3)] bg-surface shadow-sm',
          stickyHeader ? 'min-h-0 flex-1 flex-col' : '',
        )}
      >
        {renderTableContent()}
      </div>

      <TableBulkActionBar table={table} />
    </div>
  )
}

DataTable.displayName = 'DataTable'
export default DataTable
