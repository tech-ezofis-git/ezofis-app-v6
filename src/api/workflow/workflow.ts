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

const workflowApi = {
  createProcessTransaction,
  getAllWorkflows,
  getWorkflowById,
}

export default workflowApi
