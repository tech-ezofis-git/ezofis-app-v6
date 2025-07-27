import type { ItemList } from '@/types/item'

export function getNextPageParam({ limit, skip, total }: ItemList) {
  if (skip + limit < total) {
    return skip + limit
  }

  return null
}

export function getPreviousPageParam({ limit, skip }: ItemList) {
  if (skip - limit >= 0) {
    return skip - limit
  }

  return null
}
