import authUserStore from '../../stores/authUserStore'
import { _axios, axiosCrypto } from '../axios'

const fetchFoldersById = async (folderId: number) => {
  const response: any = { data: '', error: '' }
  try {
    const { data, status } = await axiosCrypto(`/repository/${folderId}`)
    if (status != 200) return
    response.data = data
  } catch (error) {
    console.error(error)
    response.error = 'Error in fetching the request meta data'
  }
  return response
}

const uploadFileWithIndex = async (formData: FormData) => {
  const response: any = { data: '', error: '' }
  try {
    const store = authUserStore.getState()
    const token = store?.identity?.token
    const { data, status } = await _axios.post(
      `/uploadAndIndex/upload`,
      formData,
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
          'Token': token,
        },
      },
    )

    if (status != 200) return
    response.data = typeof data === 'string' ? JSON.parse(data) : data
  } catch (error) {
    console.error(error)
    response.error = 'Error in uploading file'
  }
  return response
}
const uploadMasterFile = async (payload: any) => {
  const response: any = { data: '', error: '' }
  try {
    const store = authUserStore.getState()
    const token = store?.identity?.token
    const { data, status } = await _axios.post(
      `/form/uploadMasterFile`,
      payload,
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
          'Token': token,
        },
      },
    )

    if (status != 200) return
    response.data = data
  } catch (error) {
    console.error(error)
    response.error = 'Error in uploading file'
  }
  return response
}

const getRepositoryList = async (criteria = '', value = '') => {
  const response: any = { data: '', error: '' }
  try {
    const { data, status } = await axiosCrypto.post('/repository/list', {
      criteria,
      value,
    })

    if (status !== 200) {
      throw new Error('Failed to fetch repositories')
    }

    response.data = typeof data === 'string' ? JSON.parse(data) : data
  } catch (e: any) {
    console.error(e)
    response.error = e.message || 'error fetching repositories'
  }
  return response
}

const folderApi = {
  fetchFoldersById,
  uploadFileWithIndex,
  uploadMasterFile,
  getRepositoryList,
}

export default folderApi
