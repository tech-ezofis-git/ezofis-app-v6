import { axiosCrypto } from '../axios'

const createProcessTransaction = async (payload: any) => {
  const response: any = { data: '', error: '' }
  try {
    const { status, data } = await axiosCrypto.post(
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

const workflowApi = {
  createProcessTransaction,
}

export default workflowApi
