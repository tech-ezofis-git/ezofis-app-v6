import { queryOptions } from '@tanstack/react-query'
import type { QueryParams } from '@/types/item'
import { TWO_MINUTES } from '@/constants'
import { getFormGroupList } from './endpoints'

const queryKeys = {
  list: (params?: QueryParams) => ['forms', params] as const,
  optionList: () => ['forms', 'options'] as const,
}

export const getFormGroupListQueryOptions = (params?: QueryParams) => {
  return queryOptions({
    queryKey: queryKeys.list(params),
    staleTime: TWO_MINUTES,
    queryFn: () => getFormGroupList(params),
  })
}
