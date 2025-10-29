import { queryOptions } from '@tanstack/react-query'
import type { QueryParams } from '@/types/item'
import { TWO_MINUTES } from '@/constants'
import { getRequestGroupList } from './endpoints'

const queryKeys = {
  list: (params?: QueryParams) => ['requests', params] as const,
  optionList: () => ['requests', 'options'] as const,
}

export const getRequestGroupListQueryOptions = (params?: QueryParams) => {
  return queryOptions({
    queryKey: queryKeys.list(params),
    staleTime: TWO_MINUTES,
    queryFn: () => getRequestGroupList(params),
  })
}
