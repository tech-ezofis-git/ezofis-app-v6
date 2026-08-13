import { axiosV6 } from '../axios'

const viewBinary = async (
  tId: number,
  uId: string,
  rId: number,
  id: number,
  type: number,
) => {
  const response: any = { data: '', error: '' }
  try {
    const { data, status } = await axiosV6.get(
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

const viewBinaryV6 = async (
  repositoryId: string,
  itemId: string,
  disposition: string = 'inline',
  /** Bust browser/proxy cache after the signed file is rewritten server-side. */
  cacheBust?: string | number,
) => {
  const response: any = { data: null, error: '' }
  try {
    const bust =
      cacheBust === undefined || cacheBust === null || cacheBust === ''
        ? ''
        : `&_=${encodeURIComponent(String(cacheBust))}`
    const { data, status } = await axiosV6.get(
      `/repositories/${repositoryId}/items/${itemId}/file?disposition=${disposition}${bust}`,
      {
        headers: cacheBust
          ? { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
          : undefined,
        responseType: 'blob',
      },
    )
    if (status !== 200) throw new Error('invalid status code')
    response.data = data
  } catch (error: any) {
    console.error(error)
    response.error = error?.message || 'Error in fetching file binary'
  }
  return response
}

const fileApi = { viewBinary, viewBinaryV6 }

export default fileApi
