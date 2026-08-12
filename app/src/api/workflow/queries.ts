import { queryOptions } from '@tanstack/react-query'
import workflowsApiV6, {
  type WorkflowBrowsePayload,
  type WorkflowBrowseResponse,
} from '../v6/workflows'
import workflowApi from './workflow'

export const getWorkflowListQueryOptions = (payload: WorkflowBrowsePayload) =>
  queryOptions({
    queryKey: ['workflows', 'all', payload],
    queryFn: async (): Promise<WorkflowBrowseResponse> => {
      const { data, error } = await workflowsApiV6.getAllWorkflows(payload)
      if (error) {
        throw new Error(
          typeof error === 'string' ? error : 'Failed to fetch workflows',
        )
      }
      return (
        data ?? {
          data: [],
          meta: { currentPage: 1, itemsPerPage: 0, totalItems: 0 },
        }
      )
    },
  })

export const getWorkflowQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ['workflows', id],
    queryFn: () => workflowApi.getWorkflowById(id),
  })
