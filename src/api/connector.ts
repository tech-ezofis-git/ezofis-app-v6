import authUserStore from '../stores/authUserStore'
import { axiosV6 } from './axios'

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
    const store = authUserStore.getState()
    const tenantId = store.session?.tenantId || ''

    const response = await axiosV6.get('/connector/all', {
      headers: {
        'X-Tenant-Id': tenantId,
      },
    })
    const { data, status } = response

    if (status !== 200) {
      throw new Error('invalid status code')
    }

    // Safely extract list from the response
    const extractData = (obj: any): any[] => {
      if (!obj) return []
      if (Array.isArray(obj)) return obj
      const inner = obj.data || obj.value || obj.items
      if (Array.isArray(inner)) return inner
      if (typeof obj === 'object') {
        for (const key in obj) {
          if (Array.isArray(obj[key])) return obj[key]
        }
      }
      return []
    }

    const allConnectors = typeof data === 'string' ? JSON.parse(data) : data
    const list = extractData(allConnectors)

    // Apply client-side filtering based on payload criteria
    const connectorType = payload.filterBy?.[0]?.filters?.find(
      (f) => f.criteria === 'connectorType',
    )?.value

    _response.payload = connectorType
      ? list.filter(
          (item: any) =>
            String(item.connectorType || item.ConnectorType || '').toUpperCase() ===
            String(connectorType).toUpperCase(),
        )
      : list
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
    const store = authUserStore.getState()
    const tenantId = store.session?.tenantId || ''

    const response = await axiosV6.post('/connector', payload, {
      headers: {
        'X-Tenant-Id': tenantId,
      },
    })
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
