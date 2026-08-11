import { type FormGroupList } from '@/types/form'
import { type QueryParams } from '@/types/item'
import { getFormGroups } from './helpers'

export async function getFormGroupList(
  queryParams?: QueryParams,
): Promise<FormGroupList> {
  const formGroup = getFormGroups(queryParams)

  return new Promise((resolve) => {
    setTimeout(
      () =>
        resolve({
          data: formGroup,
          page: queryParams?.page || 1,
          pageSize: queryParams?.pageSize || 10,
          totalCount: 248,
        }),
      1000,
    )
  })
}
