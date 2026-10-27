import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import type { Id } from '../types'
import { subWorkflowApi } from './subWorkflowApi'

export const subWorkflowKeys = {
  all: ['sub-workflow'] as const,
  mainProcess: (workflowId?: Id, processId?: Id) =>
    [
      ...subWorkflowKeys.all,
      'main',
      String(workflowId),
      String(processId),
    ] as const,
  subProcesses: (workflowId?: Id, processId?: Id) =>
    [
      ...subWorkflowKeys.all,
      'children',
      String(workflowId),
      String(processId),
    ] as const,
}

export const getSubProcessesQueryOptions = (workflowId?: Id, processId?: Id) =>
  queryOptions({
    enabled: Boolean(workflowId && processId),
    queryKey: subWorkflowKeys.subProcesses(workflowId, processId),
    queryFn: () => subWorkflowApi.getSubProcesses(workflowId!, processId!),
  })

export const getMainProcessQueryOptions = (workflowId?: Id, processId?: Id) =>
  queryOptions({
    enabled: Boolean(workflowId && processId),
    queryKey: subWorkflowKeys.mainProcess(workflowId, processId),
    queryFn: () => subWorkflowApi.getMainProcess(workflowId!, processId!),
  })

export const useSubProcesses = (workflowId?: Id, processId?: Id) =>
  useQuery(getSubProcessesQueryOptions(workflowId, processId))

export const useMainProcess = (workflowId?: Id, processId?: Id) =>
  useQuery(getMainProcessQueryOptions(workflowId, processId))

export const useLinkSubProcess = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: Parameters<typeof subWorkflowApi.linkSubProcess>) =>
      subWorkflowApi.linkSubProcess(...args),
    onSuccess: (link) => {
      queryClient.invalidateQueries({
        queryKey: subWorkflowKeys.subProcesses(
          link.mainWorkflowId,
          link.mainProcessId,
        ),
      })
      queryClient.invalidateQueries({
        queryKey: subWorkflowKeys.mainProcess(
          link.subWorkflowId,
          link.subProcessId,
        ),
      })
    },
  })
}
