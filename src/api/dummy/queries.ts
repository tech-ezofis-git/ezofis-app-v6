import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import type { IList } from '@/components/base/types'
import type { IListDTO } from '../types'
import { getUserList, getUsers } from './endpoints'

const queryKeys = {
  all: () => ['users'] as const,
  list: () => [...queryKeys.all(), 'list'] as const,
}

function useGetUserList(dto?: IListDTO) {
  return useInfiniteQuery({
    initialPageParam: 0,
    queryKey: queryKeys.list(),
    getNextPageParam: ({ limit, skip, total }: IList) => {
      if (skip + limit < total) {
        return skip + limit
      }

      return null
    },
    queryFn: ({ pageParam }) => getUserList({ ...dto, skip: pageParam }),
  })
}

function useGetUsers() {
  return useQuery({
    queryFn: getUsers,
    queryKey: queryKeys.list(),
  })
}

export { useGetUserList, useGetUsers }
