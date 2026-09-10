import { useLingui } from '@lingui/react/macro'
import { type Table as TanstackTable } from '@tanstack/react-table'
import type { Row } from '@/components/base/data-table/types'
import DataTable from '@/components/base/data-table/DataTable'
import Pagination from '@/components/base/pagination/Pagination'

interface TableProps {
  isLoading: boolean
  page: number
  pageSize: number
  table: TanstackTable<Row>
  totalItems: number
  onCreate?: () => void
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}

const Table = ({
  isLoading,
  page,
  pageSize,
  table,
  totalItems,
  onCreate,
  onPageChange,
  onPageSizeChange,
}: TableProps) => {
  const { t } = useLingui()

  return (
    <div className='flex h-full min-h-0 flex-col'>
      <div className='min-h-0 flex-1 overflow-hidden'>
        <DataTable
          hideActionBar={true}
          hideExport={true}
          hideFilters={true}
          hideGrouping={true}
          hideGroupItemCountOnHover={true}
          hideReload={true}
          hideSearch={true}
          isLoading={isLoading}
          isReLoading={false}
          pageSize={pageSize}
          stickyHeader={true}
          table={table}
          onEmptyPrimaryAction={onCreate}
          onReload={() => {}}
        />
      </div>
      <Pagination
        className='mt-4 shrink-0'
        itemLabel={t`Reports`}
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
