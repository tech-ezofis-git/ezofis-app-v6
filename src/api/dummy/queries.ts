import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
import type { QueryParams } from '@/types/item'
import type { InfiniteQueryOptions } from '@/types/option'
import { TWO_MINUTES } from '@/constants'
import { getNextPageParam, getPreviousPageParam } from '../helpers'
import { getUserList, getUserOptionList } from './endpoints'

const queryKeys = {
  list: () => ['users'] as const,
  optionList: () => [...queryKeys.list(), 'options'] as const,
}

export const getUserOptionListQueryOptions = (
  params?: QueryParams,
): InfiniteQueryOptions => {
  return infiniteQueryOptions({
    getNextPageParam,
    getPreviousPageParam,
    initialPageParam: 0,
    queryKey: queryKeys.optionList(),
    staleTime: TWO_MINUTES,
    queryFn: ({ pageParam }) =>
      getUserOptionList({
        ...params,
        skip: pageParam,
      }),
  }) as InfiniteQueryOptions
}

export const getUserListQueryOptions = (params?: QueryParams) => {
  return queryOptions({
    queryKey: queryKeys.list(),
    staleTime: TWO_MINUTES,
    queryFn: () => getUserList(params),
  })
}
