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
