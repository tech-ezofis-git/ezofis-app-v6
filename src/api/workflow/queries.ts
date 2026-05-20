import { queryOptions } from '@tanstack/react-query'
import workflowApi from './workflow'

export const getWorkflowListQueryOptions = (payload: any) =>
  queryOptions({
    queryKey: ['workflows', 'all', payload],
    queryFn: () => workflowApi.getAllWorkflows(payload),
  })

export const getWorkflowQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ['workflows', id],
    queryFn: () => workflowApi.getWorkflowById(id),
  })
