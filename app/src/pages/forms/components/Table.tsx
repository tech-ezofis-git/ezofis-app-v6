import { useLingui } from '@lingui/react/macro'
import { type Table as TanstackTable } from '@tanstack/react-table'
import DataTable from '@/components/base/data-table/DataTable'
import Pagination from '@/components/base/pagination/Pagination'

interface TableProps {
  isLoading: boolean
  isRefetching: boolean
  page: number
  pageSize: number
  table: TanstackTable<any>
  totalItems: number
  onCreate?: () => void
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
  onCreate,
  onPageChange,
  onPageSizeChange,
  onReload,
}: TableProps) => {
  const { t } = useLingui()
  // Component body simplified as columns and state are managed by parent

  return (
    <div className='flex h-full min-h-0 flex-col'>
      <div className='min-h-0 flex-1 overflow-hidden'>
        <DataTable
          emptyPage='forms'
          hideActionBar={true}
          hideExport={true}
          hideFilters={true}
          hideGrouping={true}
          hideGroupItemCountOnHover={true}
          hideReload={true}
          hideSearch={true}
          isLoading={isLoading}
          isReLoading={isRefetching}
          pageSize={pageSize}
          stickyHeader={true}
          table={table}
          onEmptyPrimaryAction={onCreate}
          onReload={onReload}
        />
      </div>
      <Pagination
        className='mt-4 shrink-0'
        itemLabel={t`Forms`}
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
