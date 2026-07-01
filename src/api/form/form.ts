import authUserStore from '../../stores/authUserStore'
import { axiosCrypto, axiosV6 } from '../axios'

const getFormDataById = async (id: string) => {
  const response: any = { data: null, error: '' }
  try {
    const store = authUserStore.getState()
    const tenantId = store.session?.tenantId || ''
    const { data, status } = await axiosV6.get(`/form/${id}`, {
      headers: {
        'X-Tenant-Id': tenantId,
      },
    })
    if (status !== 200) throw new Error('Invalid status code')

    // Safely parse formJson if it exists and is a string
    if (data?.formJson) {
      if (typeof data.formJson === 'string') {
        try {
          data.formJson = JSON.parse(data.formJson)
        } catch (e) {
          console.error('Failed to parse formJson in getFormDataById:', e)
        }
      }

      // Safety check for hubLinkIds as per technical reference
      if (data.formJson && typeof data.formJson === 'object') {
        if (!data.formJson.hubLinkIds) {
          data.formJson.hubLinkIds = []
        }
      }
    }

    response.data = data
  } catch (e) {
    console.error(e)
    response.error = 'Error fetching form'
  }
  return response
}

const createForm = async (payload: any) => {
  const response: any = { data: null, error: '' }
  try {
    const store = authUserStore.getState()
    const tenantId = store.session?.tenantId || ''
    const { data, status } = await axiosV6.post('/form', payload, {
      headers: {
        'X-Tenant-Id': tenantId,
      },
    })
    if (![200, 201, 202].includes(status))
      throw new Error(`Invalid status code ${status}`)
    response.data = data // Should be Form ID (String)
  } catch (e) {
    console.error(e)
    response.error = 'Error creating form'
  }
  return response
}

const updateForm = async (id: string, payload: any) => {
  const response: any = { data: null, error: '' }
  try {
    const store = authUserStore.getState()
    const tenantId = store.session?.tenantId || ''
    const { data, status } = await axiosV6.put(`/form/${id}`, payload, {
      headers: {
        'X-Tenant-Id': tenantId,
      },
    })
    if (![200, 201, 202, 204].includes(status)) {
      console.error(
        `[formApi.updateForm] Error: Invalid status code ${status}`,
        data,
      )
      throw new Error(`Invalid status code ${status}`)
    }
    response.data = data // Success Message
  } catch (e: any) {
    console.error('[formApi.updateForm] Failed:', e)
    response.error = e.message || 'Error updating form'
  }

  return response
}

const listAllForms = async (
  page: number = 1,
  size: number = 100,
  groupBy: string = 'type',
  filterBy: any[] = [],
) => {
  const response: any = { data: null, error: '' }
  try {
    const payload = {
      currentPage: page,
      filterBy: filterBy,
      groupBy: groupBy,
      hasSecurity: true,
      itemsPerPage: size,
      mode: 'BROWSE',
      sortBy: {
        criteria: 'name',
        order: 'ASC',
      },
    }
    const store = authUserStore.getState()
    const tenantId = store.session?.tenantId || ''
    const { data, status } = await axiosV6.post('/form/all', payload, {
      headers: {
        'X-Tenant-Id': tenantId,
      },
    })
    if (status !== 200) throw new Error('Invalid status code')
    response.data = data
  } catch (e) {
    console.error(e)
    response.error = 'Error listing forms'
  }
  return response
}

const deleteFormEntry = async (fId: string, eId: string) => {
  const response: any = { data: null, error: '' }
  try {
    const { data, status } = await axiosCrypto.delete(
      `/form/${fId}/entry/${eId}`,
    )
    if (status !== 200) throw new Error('Invalid status code')
    response.data = data // Success Message
  } catch (e) {
    console.error(e)
    response.error = 'Error deleting entry'
  }
  return response
}

const getForms = async (payload: any) => {
  const response: any = { data: null, error: '' }
  try {
    const store = authUserStore.getState()
    const tenantId = store.session?.tenantId || ''
    const { data, status } = await axiosV6.post('/form/all', payload, {
      headers: {
        'X-Tenant-Id': tenantId,
      },
    })
    if (status !== 200) throw new Error('Invalid status code')

    // The payload usually comes back as a JSON string from backend in some cases
    // but axios might have already parsed it if it's JSON.
    // Based on previous patterns in the project, we'll return data directly.
    // Parse string responses if found, consistent with other API patterns
    response.data = typeof data === 'string' ? JSON.parse(data) : data
  } catch (e) {
    console.error(e)
    response.error = 'Error fetching forms'
  }
  return response
}

const deleteForm = async (id: string) => {
  const response: any = { data: null, error: '' }
  try {
    const store = authUserStore.getState()
    const tenantId = store.session?.tenantId || ''
    const { data, status } = await axiosV6.delete(`/form/${id}`, {
      headers: {
        'X-Tenant-Id': tenantId,
      },
    })
    if (![200, 201, 202, 204].includes(status))
      throw new Error(`Invalid status code ${status}`)
    response.data = data
  } catch (e: any) {
    console.error(e)
    response.error = e.message || 'Error deleting form'
  }
  return response
}

const uploadMasterFile = async (payload: any) => {
  const response: any = { data: null, error: '' }
  try {
    const store = authUserStore.getState()
    const tenantId = store.session?.tenantId || ''
    const { data, status } = await axiosV6.post(
      '/form/uploadMasterFile',
      payload,
      {
        headers: {
          'Accept': 'text/plain',
          'Content-Type': 'multipart/form-data',
          'X-Tenant-Id': tenantId,
        },
      },
    )
    if (status !== 200) throw new Error('Invalid status code')
    response.data = data
  } catch (e: any) {
    console.error(e)
    response.error = e.message || 'Error uploading master file'
  }
  return response
}

const formApi = {
  createForm,
  deleteForm,
  deleteFormEntry,
  listAllForms,
  updateForm,
  getFormDataById,
  getForms,
  uploadMasterFile,
}

export default formApi
