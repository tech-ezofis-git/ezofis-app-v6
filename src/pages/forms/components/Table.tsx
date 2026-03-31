import DataTable from '@/components/base/data-table/DataTable'
import Pagination from '@/components/base/pagination/Pagination'
import { type Table as TanstackTable } from '@tanstack/react-table'

interface TableProps {
  isLoading: boolean
  isRefetching: boolean
  page: number
  pageSize: number
  table: TanstackTable<any>
  totalItems: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  onReload: () => void
}

const Table = ({
  isLoading,
  isRefetching,
  page,
  pageSize,
  table,
  totalItems,
  onPageChange,
  onPageSizeChange,
  onReload,
}: TableProps) => {
  // Component body simplified as columns and state are managed by parent

  return (
    <div className='p-6'>
      <DataTable
        isLoading={isLoading}
        isReLoading={isRefetching}
        pageSize={pageSize}
        table={table}
        onReload={onReload}
      />
      <Pagination
        className='mt-4'
        itemLabel='Forms'
        page={page}
        pageSize={pageSize}
        showPageNumbers={false}
        totalItems={totalItems}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  )
}

Table.displayName = 'Table'
export default Table
