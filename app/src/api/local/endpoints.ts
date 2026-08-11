import { type QueryParams } from '@/types/item'
import { type UserGroupList } from '@/types/user'
import { getUserGroups } from './helpers'

export async function getUserGroupList(
  queryParams?: QueryParams,
): Promise<UserGroupList> {
  const userGroup = getUserGroups(queryParams)

  return new Promise((resolve) => {
    setTimeout(
      () =>
        resolve({
          data: userGroup,
          page: queryParams?.page || 1,
          pageSize: queryParams?.pageSize || 10,
          totalCount: 248,
        }),
      1000,
    )
  })
}
