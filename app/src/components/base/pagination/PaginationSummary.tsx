import { useLingui } from '@lingui/react/macro'

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
  const { t } = useLingui()
  const label = itemLabel || t`Items`
  const hasItems = totalItems > 0
  const isAll = pageSize === 0

  const from = hasItems ? (isAll ? 1 : (currentPage - 1) * pageSize + 1) : 0
  const to = hasItems
    ? isAll
      ? totalItems
      : Math.min(from + pageSize - 1, totalItems)
    : 0

  return (
    <div className='hidden text-13 font-medium text-gray-11 select-none sm:block'>
      {hasItems
        ? t`Showing ${from} - ${to} of ${totalItems} ${label}`
        : t`Showing 0 - 0 of 0 ${label}`}
    </div>
  )
}

PaginationSummary.displayName = 'PaginationSummary'
export default PaginationSummary
