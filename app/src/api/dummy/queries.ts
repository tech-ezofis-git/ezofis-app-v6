import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
import { TWO_MINUTES } from '@/constants'
import type { QueryParams } from './types/item'
import type { ItemList } from './types/item'
import type { InfiniteQueryOptions } from './types/option'
import { getUserList, getUserOptionList } from './endpoints'

const queryKeys = {
  list: () => ['users'] as const,
  optionList: () => [...queryKeys.list(), 'options'] as const,
}

const getNextPageParam = ({ limit, skip, total }: ItemList) => {
  if (skip + limit < total) {
    return skip + limit
  }

  return null
}

const getPreviousPageParam = ({ limit, skip }: ItemList) => {
  if (skip - limit >= 0) {
    return skip - limit
  }

  return null
}

export const getUserOptionListQueryOptions = (
  params?: QueryParams,
): InfiniteQueryOptions => {
  return infiniteQueryOptions({
    initialPageParam: 0,
    queryKey: queryKeys.optionList(),
    staleTime: TWO_MINUTES,
    queryFn: ({ pageParam }) =>
      getUserOptionList({
        ...params,
        skip: pageParam,
      }),
    getNextPageParam,
    getPreviousPageParam,
  }) as InfiniteQueryOptions
}

export const getUserListQueryOptions = (params?: QueryParams) => {
  return queryOptions({
    queryKey: queryKeys.list(),
    staleTime: TWO_MINUTES,
    queryFn: () => getUserList(params),
  })
}
