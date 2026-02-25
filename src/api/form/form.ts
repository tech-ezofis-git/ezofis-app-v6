import { axiosCrypto } from '../axios'

const getFormDataById = async (id: string) => {
  const response: any = { data: null, error: '' }
  try {
    const { status, data } = await axiosCrypto.get(`/form/${id}`)
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
        const { status, data } = await axiosCrypto.post('/form', payload)
        if (status !== 200 && status !== 201) throw new Error('Invalid status code')
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
        const { status, data } = await axiosCrypto.put(`/form/${id}`, payload)
        if (status !== 200) throw new Error('Invalid status code')
        response.data = data // Success Message
    } catch (e) {
        console.error(e)
        response.error = 'Error updating form'
    }
    return response
}

const listAllForms = async (page: number = 1, size: number = 100) => {
    const response: any = { data: null, error: '' }
    try {
        const payload = {
            mode: "BROWSE",
            sortBy: {
                criteria: "name",
                order: "ASC"
            },
            groupBy: "type",
            filterBy: [],
            itemsPerPage: size,
            currentPage: page,
            hasSecurity: true
        }
        const { status, data } = await axiosCrypto.post('/form/all', payload)
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
        const { status, data } = await axiosCrypto.delete(`/form/${fId}/entry/${eId}`)
        if (status !== 200) throw new Error('Invalid status code')
        response.data = data // Success Message
    } catch (e) {
        console.error(e)
        response.error = 'Error deleting entry'
    }
    return response
}

const formApi = {
  getFormDataById,
  createForm,
  updateForm,
  listAllForms,
  deleteFormEntry
}

export default formApi
