interface Props {
  currentPage: number
  pageSize: number
  totalItems: number
  itemLabel?: string
}

const PaginationSummary = ({
  currentPage,
  itemLabel,
  pageSize,
  totalItems,
}: Props) => {
  const isAll = pageSize === 0
  let from = 0
  if (isAll) {
    from = totalItems > 0 ? 1 : 0
  } else {
    from = (currentPage - 1) * pageSize + 1
  }
  const to = isAll ? totalItems : Math.min(from + pageSize - 1, totalItems)

  return (
    <div className='hidden text-13 font-medium text-gray-11 select-none sm:block'>
      Showing {from} - {to} of {totalItems} {itemLabel}
    </div>
  )
}

PaginationSummary.displayName = 'PaginationSummary'
export default PaginationSummary
