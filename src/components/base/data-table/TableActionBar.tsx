import type { ComponentProps } from 'react'
import { type Table as TanstackTable } from '@tanstack/react-table'
// If you have a base Button component, use it. Otherwise plain button works.
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'
import type { RowSize } from './types'
import TableColumns from './actions/TableColumns'
import TableExport from './actions/TableExport'
import TableFilters from './actions/TableFilters'
import TableGroup from './actions/TableGroup'
import TableReload from './actions/TableReload'
import TableRows from './actions/TableRows'
import TableSearch from './actions/TableSearch'
// import Button from '../button/Button'
import TableSort from './actions/TableSort'

export type TableActionButton = {
  // optional: for alignment (left/right)
  align?: 'left' | 'right'
  className?: string
  disabled?: boolean
  icon?: string
  label: string
  title?: string
  onClick: () => void
}

interface Props<TData> extends ComponentProps<'div'> {
  isReloading: boolean
  rowSize: RowSize
  table: TanstackTable<TData>
  /** ✅ Custom action buttons */
  actions?: TableActionButton[]
  className?: string
  component?: any
  hideGrouping?: boolean

  hideTableActions?: boolean
  onReload: () => void
  onRowSizeChange: (rowSize: RowSize) => void
}

const TableActionBar = <TData,>({
  actions = [],
  className,
  component,
  hideGrouping = false,
  hideTableActions = false,
  isReloading,
  rowSize,
  table,
  onReload,
  onRowSizeChange,
}: Props<TData>) => {
  const leftActions = actions.filter((a) => (a.align ?? 'right') === 'left')
  const rightActions = actions.filter((a) => (a.align ?? 'right') === 'right')

  return (
    <div className={cn('mb-4 flex flex-wrap items-center gap-2', className)}>
      {!component && (
        <>
          {/* ✅ left side (before search) */}
          {!!leftActions.length && (
            <div className='flex flex-wrap items-center gap-2'>
              {leftActions.map((a, idx) => (
                <button
                  disabled={a.disabled}
                  key={`${a.label}-${idx}`}
                  title={a.title ?? a.label}
                  type='button'
                  className={cn(
                    'inline-flex items-center gap-2 rounded-lg border border-[var(--gray-4)] bg-surface px-3 py-2 text-12 font-semibold text-[var(--gray-12)] hover:bg-[var(--gray-1)]',
                    a.disabled &&
                      'cursor-not-allowed opacity-60 hover:bg-surface',
                    a.className,
                  )}
                  onClick={a.onClick}
                >
                  {a.icon ? <Icon className='size-4' name={a.icon} /> : null}
                  {a.label}
                </button>
              ))}
            </div>
          )}

          <TableSearch table={table} />
          <TableFilters table={table} />
          {!hideGrouping && <TableGroup table={table} />}

          <div className='flex-1' />

          <TableSort table={table} />
          {!hideTableActions && <TableColumns table={table} />}
          {!hideTableActions && (
            <TableRows rowSize={rowSize} onRowSizeChange={onRowSizeChange} />
          )}
          <TableExport table={table} />
          <TableReload isReloading={isReloading} onReload={onReload} />

          {/* ✅ right side (after built-in buttons) */}
          {!!rightActions.length && (
            <div className='flex flex-wrap items-center gap-2'>
              {rightActions.map((a, idx) => (
                <button
                  disabled={a.disabled}
                  key={`${a.label}-${idx}`}
                  title={a.title ?? a.label}
                  type='button'
                  className={cn(
                    'inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--secondary-9)] px-3 py-2 text-12 font-semibold text-white hover:bg-[var(--secondary-10)]',
                    a.disabled &&
                      'cursor-not-allowed opacity-60 hover:bg-[var(--secondary-9)]',
                    a.className,
                  )}
                  onClick={() => {
                    console.log(a)
                    a.onClick()
                  }}
                >
                  {a.icon ? <Icon className='size-4' name={a.icon} /> : null}
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
