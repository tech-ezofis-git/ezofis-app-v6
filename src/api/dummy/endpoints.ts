import axios from '@/api/axios'
import type { User, UserList } from './types/user'
import { type QueryParams } from './types/item'
import { type OptionList, OptionListSchema } from './types/option'
import { UserListSchema } from './types/user'

const URL_SLUG = '/users/'

export async function getUserList(
  queryParams?: QueryParams,
): Promise<UserList> {
  const response = await axios.instance.get(URL_SLUG, {
    params: queryParams,
  })

  if (!response.data) {
    throw new Error('Failed to fetch users')
  }

  const { users, ...rest } = response.data
  const data = users.map((user: User) => ({
    ...user,
    name: `${user.firstName} ${user.lastName}`,
  }))

  return UserListSchema.parse({ data, ...rest })
}

export async function getUserOptionList(
  queryParams?: QueryParams,
): Promise<OptionList> {
  const response = await getUserList({
    order: 'asc',
    sortBy: 'firstName',
    ...queryParams,
  })

  const { data, ...rest } = response
  const options = data.map((user: User) => ({
    // description: user.email,
    disabled: false,
    id: user.id,
    name: user.name,
  }))

  return OptionListSchema.parse({ data: options, ...rest })
}
