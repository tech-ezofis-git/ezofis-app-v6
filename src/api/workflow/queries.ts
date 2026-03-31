import { queryOptions } from '@tanstack/react-query'
import workflowApi from './workflow'

export const getWorkflowListQueryOptions = (payload: any) =>
  queryOptions({
    queryFn: () => workflowApi.getAllWorkflows(payload),
    queryKey: ['workflows', 'all', payload],
  })

export const getWorkflowQueryOptions = (id: string) =>
  queryOptions({
    queryFn: () => workflowApi.getWorkflowById(id),
    queryKey: ['workflows', id],
  })
