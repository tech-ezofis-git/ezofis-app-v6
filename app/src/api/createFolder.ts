import authUserStore from '../stores/authUserStore'
import { axiosV6 } from './axios'

export const createRepository = async (payload: any) => {
  const response: any = { data: null, error: '' }
  try {
    const store = authUserStore.getState()
    const tenantId = store.session?.tenantId || ''
    const { data, status } = await axiosV6.post('/repositories', payload, {
      headers: {
        'X-Tenant-Id': tenantId,
      },
    })
    if (![200, 201, 202].includes(status))
      throw new Error(`Invalid status code ${status}`)
    response.data = data // Should be Folder ID/Details
  } catch (e) {
    console.error(e)
    response.error = 'Error creating folder'
  }
  return response
}

export const updateRepository = async (id: string, payload: any) => {
  const response: { data: unknown; error: string } = {
    data: null,
    error: '',
  }

  try {
    const store = authUserStore.getState()
    const tenantId = store.session?.tenantId || ''
    const { data, status } = await axiosV6.put(`/repositories/${id}`, payload, {
      headers: tenantId ? { 'X-Tenant-Id': tenantId } : undefined,
    })

    if (![200, 201, 202, 204].includes(status)) {
      throw new Error(`Invalid status code ${status}`)
    }

    response.data = data
  } catch (e: any) {
    console.error(e)
    response.error =
      e?.response?.data?.message ||
      e?.response?.data ||
      'Failed to update folder'
  }

  return response
}

export const deleteRepository = async (id: string) => {
  const response: { data: unknown; error: string } = {
    data: null,
    error: '',
  }

  try {
    const store = authUserStore.getState()
    const tenantId = store.session?.tenantId || ''
    const { data, status } = await axiosV6.delete(`/repositories/${id}`, {
      headers: tenantId ? { 'X-Tenant-Id': tenantId } : undefined,
    })

    if (status !== 200 && status !== 204) {
      throw new Error(`Invalid status code ${status}`)
    }

    response.data = data
  } catch (e: any) {
    console.error(e)
    response.error =
      e?.response?.data?.message ||
      e?.response?.data ||
      'Failed to delete folder'
  }

  return response
}
