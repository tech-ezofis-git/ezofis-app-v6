import { axiosCrypto } from './axios'

export interface ConnectorPayload {
  filterBy: {
    filters: {
      condition: string
      criteria: string
      value: string
    }[]
    groupCondition: string
  }[]
  mode: string
}

export const getConnection = async (payload: ConnectorPayload) => {
  const _response = {
    error: '',
    payload: [] as any[],
  }

  try {
    const response = await axiosCrypto.post(
      '/connector/all',
      JSON.stringify(payload),
    )
    const { data, status } = response

    if (status !== 200) {
      throw new Error('invalid status code')
    }

    _response.payload = typeof data === 'string' ? JSON.parse(data) : data
  } catch (e: any) {
    console.error(e)
    _response.error = 'error fetching connection'
  }

  return _response
}

export const addConnector = async (payload: any) => {
  const _response = {
    error: '',
    payload: '' as any,
  }

  try {
    const response = await axiosCrypto.post(
      '/connector',
      JSON.stringify(payload),
    )
    const { data, status } = response

    if (status !== 201 && status !== 200) {
      throw new Error('invalid status code')
    }

    _response.payload = data
  } catch (e: any) {
    console.error(e)
    _response.error = 'error adding connection'
  }

  return _response
}

export const connectorApi = {
  addConnector,
  getConnection,
}

export default connectorApi
