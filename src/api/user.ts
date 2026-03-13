import { axiosCrypto } from './axios'

export interface UserListData {
  [key: string]: any
  id: string | number
  loginName?: string
  value?: string
}

export const getUserList = async (criteria = 'userType', value = 'Normal') => {
  const _response = {
    error: '',
    payload: [] as UserListData[],
  }

  try {
    const response = await axiosCrypto.post(
      '/user/list',
      JSON.stringify({ criteria, value }),
    )
    const { data, status } = response

    if (status !== 200) {
      throw new Error('invalid status code')
    }

    _response.payload = typeof data === 'string' ? JSON.parse(data) : data
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
