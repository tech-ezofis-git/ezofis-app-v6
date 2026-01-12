import { axiosCrypto, _axios } from '../axios'
import authUserStore from '../../stores/authUserStore'

const fetchFoldersById = async (folderId: Number) => {
  const response: any = { data: '', error: '' }
  try {
    const { status, data } = await axiosCrypto(`/repository/${folderId}`)
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
    const { status, data } = await _axios.post(
      `/uploadAndIndex/upload`,
      formData,
      {
        headers: {
          'Token': token,
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
        },
      },
    )

    if (status != 200) return
    response.data = JSON.parse(data)
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
    const { status, data } = await _axios.post(
      `/form/uploadMasterFile`,
      payload,
      {
        headers: {
          'Token': token,
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
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
const folderApi = { fetchFoldersById, uploadFileWithIndex, uploadMasterFile }

export default folderApi
