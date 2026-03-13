import { queryOptions } from '@tanstack/react-query'
import { TWO_MINUTES } from '@/constants'
import { connectorApi, type ConnectorPayload } from './connector'

export const getConnectionQueryOptions = (connectorType: string) => {
  const payload: ConnectorPayload = {
    filterBy: [
      {
        filters: [
          {
            condition: 'IS_EQUALS_TO',
            criteria: 'connectorType',
            value: connectorType,
          },
        ],
        groupCondition: '',
      },
    ],
    mode: 'BROWSE',
  }

  return queryOptions({
    queryKey: ['connections', connectorType],
    staleTime: TWO_MINUTES,
    queryFn: async () => {
      const response = await connectorApi.getConnection(payload)
      if (response.error) {
        throw new Error(response.error)
      }
      return response.payload
    },
  })
}
