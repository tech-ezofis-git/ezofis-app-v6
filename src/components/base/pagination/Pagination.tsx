import { useState } from 'react'
import PaginationControls from './PaginationControls'
import PaginationItemsPerPage from './PaginationItemsPerPage'
import PaginationSummary from './PaginationSummary'

interface Props {
  totalRows: number
  value: number
  itemLabel?: string
  onChange: (value: number) => void
}

const Pagination: React.FC<Props> = ({
  itemLabel = 'Items',
  onChange,
  totalRows,
  value,
}) => {
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const totalPages = Math.ceil(totalRows / rowsPerPage)

  const handleRowsPerPageChange = (value: number) => {
    setRowsPerPage(value)
    onChange(1)
  }

  return (
    <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3'>
      <PaginationSummary
        currentPage={value}
        itemLabel={itemLabel}
        rowsPerPage={rowsPerPage}
        totalRows={totalRows}
      />
      <PaginationControls
        totalPages={totalPages}
        value={value}
        onChange={onChange}
      />
      <PaginationItemsPerPage
        itemLabel={itemLabel}
        value={rowsPerPage}
        onChange={handleRowsPerPageChange}
      />
    </div>
  )
}

Pagination.displayName = 'Pagination'
export default Pagination
