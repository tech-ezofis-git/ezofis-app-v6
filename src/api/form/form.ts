import { axiosCrypto } from '../axios'

const getFormDataById = async (id: string) => {
  const response: any = { data: null, error: '' }
  try {
    const { data, status } = await axiosCrypto.get(`/form/${id}`)
    if (status !== 200) throw new Error('Invalid status code')

    // Parse formJson if it exists
    if (data && data.formJson) {
      data.formJson = JSON.parse(data.formJson)
      // Safety check for hubLinkIds as per technical reference
      if (!data.formJson.hubLinkIds) {
        data.formJson.hubLinkIds = []
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
    const { data, status } = await axiosCrypto.post('/form', payload)
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
    const { data, status } = await axiosCrypto.put(`/form/${id}`, payload)
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
    const { data, status } = await axiosCrypto.post('/form/all', payload)
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
    const { data, status } = await axiosCrypto.post('/form/all', payload)
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

const formApi = {
  createForm,
  deleteFormEntry,
  listAllForms,
  updateForm,
  getFormDataById,
  getForms,
}

export default formApi
