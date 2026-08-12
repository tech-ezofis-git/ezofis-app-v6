import { type QueryParams } from '@/types/item'
import { type RequestGroupList } from '@/types/request'
import { getRequestGroups } from './helpers'

export async function getRequestGroupList(
  queryParams?: QueryParams,
): Promise<RequestGroupList> {
  const requestGroup = getRequestGroups(queryParams)

  return new Promise((resolve) => {
    setTimeout(
      () =>
        resolve({
          data: requestGroup,
          page: queryParams?.page || 1,
          pageSize: queryParams?.pageSize || 10,
          totalCount: 248,
        }),
      1000,
    )
  })
}
