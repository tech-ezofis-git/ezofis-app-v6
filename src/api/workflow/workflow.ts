import { axiosCrypto } from '../axios'

const createProcessTransaction = async (payload: any) => {
  const response: any = { data: '', error: '' }
  try {
    const { data, status } = await axiosCrypto.post(
      `/workflow/transaction`,
      JSON.stringify(payload),
    )
    if (status !== 200 && status !== 201) return
    response.data = data
  } catch (error) {
    console.error(error)
    response.error = 'Error in fetching the request meta data'
  }
  return response
}

const getAllWorkflows = async (payload: any) => {
  try {
    const { data, status } = await axiosCrypto.post(
      '/workflow/all',
      JSON.stringify(payload),
    )
    if (status === 200) return data
    throw new Error('Failed to fetch workflows')
  } catch (e) {
    console.error(e)
    throw e
  }
}

const getWorkflowById = async (id: string) => {
  try {
    const { data, status } = await axiosCrypto.get(`/workflow/${id}`)
    if (status === 200) return data
    throw new Error('Failed to fetch workflow')
  } catch (e) {
    console.error(e)
    throw e
  }
}

const createWorkflow = async (payload: any) => {
  const response: any = { payload: '', error: '' }

  try {
    const { status, data } = await axiosCrypto.post(
      '/workflow',
      JSON.stringify(payload),
    )

    if (status !== 201) {
      throw new Error('Failed to create workflow')
    }

    response.payload = data
  } catch (e: any) {
    console.error(e)

    if (e.response?.status === 406) {
      response.error = 'workflow with the given name already exists'
    } else {
      response.error = 'error creating workflow'
    }
  }

  return response
}

const updateWorkflow = async (id: number, payload: any) => {
  const response: any = { payload: '', error: '' }

  try {
    const { status, data } = await axiosCrypto.put(
      `/workflow/${id}`,
      JSON.stringify(payload),
    )

    if (status !== 202) {
      throw new Error('Failed to update workflow')
    }

    response.payload = typeof data === 'string' ? JSON.parse(data) : data
  } catch (e: any) {
    console.error(e)
    if (e.response?.status === 404) {
      response.error = 'workflow with the given id is not found'
    } else if (e.response?.status === 406) {
      response.error = 'workflow with the given name already exists'
    } else {
      response.error = 'error updating workflow'
    }
  }

  return response
}

const workflowApi = {
  createProcessTransaction,
  createWorkflow,
  getAllWorkflows,
  getWorkflowById,
  updateWorkflow,
}

export default workflowApi
