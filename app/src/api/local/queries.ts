import { queryOptions } from '@tanstack/react-query'
import type { QueryParams } from '@/types/item'
import { TWO_MINUTES } from '@/constants'
import { getUserGroupList } from './endpoints'

const queryKeys = {
  list: (params?: QueryParams) => ['users', params] as const,
  optionList: () => ['users', 'options'] as const,
}

export const getUserGroupListQueryOptions = (params?: QueryParams) => {
  return queryOptions({
    queryKey: queryKeys.list(params),
    staleTime: TWO_MINUTES,
    queryFn: () => getUserGroupList(params),
  })
}
