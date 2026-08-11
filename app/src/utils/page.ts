import type { ItemList } from '@/types/item'

export const getNextPageParam = ({ page, pageSize, totalCount }: ItemList) => {
  if (page * pageSize < totalCount) {
    return page + 1
  }

  return null
}

export const getPreviousPageParam = ({ page }: ItemList) => {
  if (page > 0 && page !== 1) {
    return page - 1
  }

  return null
}
