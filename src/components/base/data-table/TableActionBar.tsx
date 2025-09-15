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

interface Props<TData> extends ComponentProps<'div'> {
  isReloading: boolean
  rowSize: RowSize
  table: TanstackTable<TData>
  className?: string
  onReload: () => void
  onRowSizeChange: (rowSize: RowSize) => void
}

const TableActionBar = <TData,>({
  className,
  isReloading,
  rowSize,
  table,
  onReload,
  onRowSizeChange,
}: Props<TData>) => {
  return (
    <div className={cn('mb-6 flex flex-wrap items-center gap-2', className)}>
      <TableSearch table={table} />
      <TableFilters table={table} />
      <div className='flex-1'></div>
      <TableSort table={table} />
      <TableGroup table={table} />
      <TableColumns table={table} />
      <TableRows rowSize={rowSize} onRowSizeChange={onRowSizeChange} />
      <TableExport table={table} />
      <TableReload isReloading={isReloading} onReload={onReload} />
    </div>
  )
}

TableActionBar.displayName = 'TableActionBar'
export default TableActionBar
