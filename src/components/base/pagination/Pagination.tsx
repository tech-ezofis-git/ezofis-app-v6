import IconButton from '@/components/base/button/IconButton'
import cn from '@/utils/cn'
import PaginationControls from './PaginationControls'
import PaginationItemsPerPage from './PaginationItemsPerPage'
import PaginationSummary from './PaginationSummary'

export interface Props {
  page: number
  pageSize: number
  totalItems: number
  className?: string
  itemLabel?: string
  showPageNumbers?: boolean
  onPageChange: (value: number) => void
  onPageSizeChange: (value: number) => void
}

const Pagination = ({
  className,
  itemLabel = 'Items',
  page,
  pageSize,
  showPageNumbers = true,
  totalItems,
  onPageChange,
  onPageSizeChange,
}: Props) => {
  const totalPages = Math.ceil(totalItems / pageSize)

  const handlePageSizeChange = (value: number) => {
    onPageSizeChange(value)
    onPageChange(1)
  }

  const _className = cn(
    'grid gap-4 sm:grid-cols-2',
    showPageNumbers && 'lg:grid-cols-3',
    className,
  )

  return (
    <div className={_className}>
      <PaginationSummary
        currentPage={page}
        itemLabel={itemLabel}
        pageSize={pageSize}
        totalItems={totalItems}
      />
      {showPageNumbers && (
        <>
          <PaginationControls
            page={page}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
          <PaginationItemsPerPage
            className='hidden lg:flex'
            itemLabel={itemLabel}
            pageSize={pageSize}
            onPageSizeChange={handlePageSizeChange}
          />
        </>
      )}

      {!showPageNumbers && (
        <div className='flex items-center justify-end gap-2'>
          <PaginationItemsPerPage
            itemLabel={itemLabel}
            pageSize={pageSize}
            onPageSizeChange={handlePageSizeChange}
          />
          <IconButton
            color='gray'
            disabled={page === 1}
            icon='tabler:chevron-left'
            variant='outline'
            onClick={() => onPageChange(page - 1)}
          />
          <IconButton
            color='gray'
            disabled={page === totalPages}
            icon='tabler:chevron-right'
            variant='outline'
            onClick={() => onPageChange(page + 1)}
          />
        </div>
      )}
    </div>
  )
}

Pagination.displayName = 'Pagination'
export default Pagination
