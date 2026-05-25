import { axiosCrypto } from './axios'

export const createFolder = async (payload: any) => {
  const response: any = { data: null, error: '' }
  try {
    const { data, status } = await axiosCrypto.post('/repository', payload)
    if (![200, 201, 202].includes(status))
      throw new Error(`Invalid status code ${status}`)
    response.data = data // Should be Folder ID/Details
  } catch (e) {
    console.error(e)
    response.error = 'Error creating folder'
  }
  return response
}
