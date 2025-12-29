import { axiosCrypto } from '../axios'

const getFormDataById = async (payload: any) => {
  const response: any = { data: '', error: '' }
  try {
    console.log('form data payload', payload)
    let { status, data } = await axiosCrypto.get(`/form/${payload}`)
    console.log('form data api', data)
    if (status !== 200) throw 'invalid status code'
    response.data = data
  } catch (e) {
    console.error(e)
    response.error = 'error fetching request'
  }
  return response
}

const formApi = {
  getFormDataById,
}

export default formApi
