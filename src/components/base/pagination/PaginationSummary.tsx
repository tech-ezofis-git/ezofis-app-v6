interface Props {
  currentPage: number
  rowsPerPage: number
  totalRows: number
  itemLabel?: string
}

const PaginationSummary: React.FC<Props> = ({
  currentPage,
  itemLabel,
  rowsPerPage,
  totalRows,
}) => {
  const from = (currentPage - 1) * rowsPerPage + 1
  const to = Math.min(from + rowsPerPage - 1, totalRows)

  return (
    <div className='hidden items-center justify-start text-gray-700 select-none xl:flex'>
      <div className='text-sm'>
        Showing{' '}
        <span className='font-semibold'>
          {from} - {to}
        </span>{' '}
        of <span className='font-semibold'>{totalRows}</span> {itemLabel}
      </div>
    </div>
  )
}

PaginationSummary.displayName = 'PaginationSummary'
export default PaginationSummary
