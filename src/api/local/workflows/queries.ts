import { queryOptions } from '@tanstack/react-query'
import type { QueryParams } from '@/types/item'
import { TWO_MINUTES } from '@/constants'
import { getWorkflowGroupList } from './endpoints'

const queryKeys = {
    list: (params?: QueryParams) => ['workflows', params] as const,
    optionList: () => ['workflows', 'options'] as const,
}

export const getWorkflowGroupListQueryOptions = (params?: QueryParams) => {
    return queryOptions({
        queryKey: queryKeys.list(params),
        staleTime: TWO_MINUTES,
        queryFn: () => getWorkflowGroupList(params),
    })
}
