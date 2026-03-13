import { axiosCrypto } from '../axios'

const viewBinary = async (
  tId: number,
  uId: string,
  rId: number,
  id: number,
  type: number,
) => {
  const response: any = { data: '', error: '' }
  try {
    const { data, status } = await axiosCrypto.get(
      `/file/viewBinary/${tId}/${uId}/${rId}/${id}/${type}`,
    )
    if (status != 200) return
    response.data = data
  } catch (error) {
    console.error(error)
    response.error = 'Error in fetching file binary'
  }
  return response
}

const fileApi = { viewBinary }

export default fileApi
