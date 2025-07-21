import type { IList } from '@/components/base/types'
import { axios } from '@/api'
import type { IListDTO } from '../types'
import type { IUsersDTO } from './types'
import { normalizeQueryParams } from '../helpers'

const URL_SLUG = '/users/'

async function getUserList(dto?: IListDTO): Promise<IList> {
  const response = await axios.instance.get<IUsersDTO>(URL_SLUG, {
    params: normalizeQueryParams({
      select: ['id', 'firstName', 'lastName'],
      sortBy: 'firstName',
      ...dto,
    }),
  })

  if (!response.data) {
    throw new Error('Failed to fetch users')
  }

  const { limit, skip, total, users } = response.data
  const items = users.map((user) => ({
    id: user.id,
    label: `${user.firstName} ${user.lastName}`,
  }))

  return {
    items,
    limit,
    skip,
    total,
  }
}

async function getUsers(): Promise<IUsersDTO> {
  const response = await axios.instance.get<IUsersDTO>(URL_SLUG)
  if (!response.data) {
    throw new Error('Failed to fetch users')
  }
  return response.data
}

export { getUserList, getUsers }
