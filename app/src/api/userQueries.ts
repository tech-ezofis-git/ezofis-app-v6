import { queryOptions } from '@tanstack/react-query'
import { TWO_MINUTES } from '@/constants'
import { userApi } from './user'

export const getUserListQueryOptions = (
  criteria = 'userType',
  value = 'Normal',
) => {
  return queryOptions({
    queryKey: ['user-list', criteria, value],
    staleTime: TWO_MINUTES,
    queryFn: async () => {
      const response = await userApi.getUserList(criteria, value)
      if (response.error) {
        throw new Error(response.error)
      }
      return response.payload
    },
  })
}
export const getGroupListQueryOptions = (criteria = '', value = '') => {
  return queryOptions({
    queryKey: ['group-list', criteria, value],
    staleTime: TWO_MINUTES,
    queryFn: async () => {
      const response = await userApi.getGroupList(criteria, value)
      if (response.error) {
        throw new Error(response.error)
      }
      return response.payload
    },
  })
}
