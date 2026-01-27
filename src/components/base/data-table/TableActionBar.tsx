import type { ComponentProps } from 'react'
import { type Table as TanstackTable } from '@tanstack/react-table'
import cn from '@/utils/cn'
import type { RowSize } from './types'
import TableColumns from './actions/TableColumns'
import TableExport from './actions/TableExport'
import TableFilters from './actions/TableFilters'
import TableGroup from './actions/TableGroup'
import TableReload from './actions/TableReload'
import TableRows from './actions/TableRows'
import TableSearch from './actions/TableSearch'
import TableSort from './actions/TableSort'
// import Button from '../button/Button'

// If you have a base Button component, use it. Otherwise plain button works.
import Icon from '@/components/base/icon/Icon'

export type TableActionButton = {
  label: string
  onClick: () => void
  icon?: string
  disabled?: boolean
  title?: string
  className?: string
  // optional: for alignment (left/right)
  align?: 'left' | 'right'
}

interface Props<TData> extends ComponentProps<'div'> {
  isReloading: boolean
  rowSize: RowSize
  table: TanstackTable<TData>
  className?: string
  onReload: () => void
  onRowSizeChange: (rowSize: RowSize) => void
  component?: any

  /** ✅ Custom action buttons */
  actions?: TableActionButton[]
  hideTableActions?: boolean
  hideGrouping?: boolean
}

const TableActionBar = <TData,>({
  className,
  isReloading,
  rowSize,
  table,
  onReload,
  onRowSizeChange,
  component,
  actions = [],
  hideTableActions = false,
  hideGrouping = false
}: Props<TData>) => {
  const leftActions = actions.filter((a) => (a.align ?? 'right') === 'left')
  const rightActions = actions.filter((a) => (a.align ?? 'right') === 'right')

  return (
    <div className={cn('mb-4 flex flex-wrap items-center gap-2', className)}>
      {!component && (
        <>
          {/* ✅ left side (before search) */}
          {!!leftActions.length && (
            <div className="flex flex-wrap items-center gap-2">
              {leftActions.map((a, idx) => (
                <button
                  key={`${a.label}-${idx}`}
                  type="button"
                  onClick={a.onClick}
                  disabled={a.disabled}
                  title={a.title ?? a.label}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-lg border border-[var(--gray-4)] bg-white px-3 py-2 text-12 font-semibold text-[var(--gray-12)] hover:bg-[var(--gray-1)]',
                    a.disabled && 'opacity-60 cursor-not-allowed hover:bg-white',
                    a.className
                  )}
                >
                  {a.icon ? <Icon name={a.icon} className="size-4" /> : null}
                  {a.label}
                </button>
              ))}
            </div>
          )}

          <TableSearch table={table} />
          <TableFilters table={table} />
          {!hideGrouping && <TableGroup table={table} />}

          <div className="flex-1" />

          <TableSort table={table} />
          {!hideTableActions && <TableColumns table={table} />}
          {!hideTableActions && <TableRows rowSize={rowSize} onRowSizeChange={onRowSizeChange} />}
          <TableExport table={table} />
          <TableReload isReloading={isReloading} onReload={onReload} />

          {/* ✅ right side (after built-in buttons) */}
          {!!rightActions.length && (
            <div className="flex flex-wrap items-center gap-2">
              {rightActions.map((a, idx) => (
                <button
                  key={`${a.label}-${idx}`}
                  type="button"
                  onClick={() => { console.log(a); a.onClick() }}
                  disabled={a.disabled}
                  title={a.title ?? a.label}
                  className={cn(
                    'cursor-pointer inline-flex items-center gap-2 rounded-lg bg-[var(--secondary-9)] px-3 py-2 text-12 font-semibold text-white hover:bg-[var(--secondary-10)]',
                    a.disabled && 'opacity-60 cursor-not-allowed hover:bg-[var(--secondary-9)]',
                    a.className
                  )}
                >
                  {a.icon ? <Icon name={a.icon} className="size-4" /> : null}
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

TableActionBar.displayName = 'TableActionBar'
export default TableActionBar
