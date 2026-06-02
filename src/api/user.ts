import authUserStore from '../stores/authUserStore'
import { axiosCrypto, axiosV6 } from './axios'

export interface UserListData {
  [key: string]: any
  id: string | number
  loginName?: string
  value?: string
}

const extractArrayData = (obj: any): any[] => {
  if (!obj) return []
  if (Array.isArray(obj)) return obj
  const inner = obj.data || obj.payload || obj.value || obj.items
  if (Array.isArray(inner)) return inner
  if (typeof obj === 'object') {
    for (const key in obj) {
      const result = extractArrayData(obj[key])
      if (result.length > 0) return result
    }
  }
  return []
}

export const getUserList = async (criteria = 'userType', value = 'Normal') => {
  void criteria
  void value

  const _response = {
    error: '',
    payload: [] as UserListData[],
  }

  try {
    const store = authUserStore.getState()
    const tenantId = store.session?.tenantId || ''
    const response = await axiosV6.get('/users', {
      headers: {
        'X-Tenant-Id': tenantId,
      },
    })
    const { data, status } = response

    if (status !== 200) {
      throw new Error('invalid status code')
    }

    const rawData = typeof data === 'string' ? JSON.parse(data) : data
    _response.payload = extractArrayData(rawData)
  } catch (e: any) {
    console.error(e)
    _response.error = 'error fetching users'
  }

  return _response
}

export const getGroupList = async (criteria = '', value = '') => {
  const _response = {
    error: '',
    payload: [] as any[],
  }

  try {
    const response = await axiosCrypto.post(
      '/group/list',
      JSON.stringify({ criteria, value }),
    )
    const { data, status } = response

    if (status !== 200) {
      throw new Error('invalid status code')
    }

    _response.payload = typeof data === 'string' ? JSON.parse(data) : data
  } catch (e: any) {
    console.error(e)
    _response.error = 'error fetching groups'
  }

  return _response
}

export const userApi = {
  getGroupList,
  getUserList,
}

export default userApi
