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
  byRows: (workflowId?: Id, processIds: Id[] = []) =>
    [
      ...subWorkflowKeys.all,
      'by-rows',
      String(workflowId),
      processIds.map(String).sort().join(','),
    ] as const,
  byWorkflow: (workflowId?: Id) =>
    [...subWorkflowKeys.all, 'by-workflow', String(workflowId)] as const,
  history: (workflowId?: Id, processId?: Id) =>
    [
      ...subWorkflowKeys.all,
      'history',
      String(workflowId),
      String(processId),
    ] as const,
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

/** Children of the requests on one page of a list (one query shared by all rows). */
export const useSubProcessesForRows = (
  workflowId?: Id,
  processIds: Id[] = [],
) =>
  useQuery({
    enabled: Boolean(workflowId) && processIds.length > 0,
    queryFn: () =>
      subWorkflowApi.getSubProcessesForRows(workflowId!, processIds),
    queryKey: subWorkflowKeys.byRows(workflowId, processIds),
    staleTime: 15_000,
  })

/** Connector steps for a request's history: each linked child's own steps. */
export const useSubWorkflowHistory = (workflowId?: Id, processId?: Id) =>
  useQuery({
    enabled: Boolean(workflowId && processId),
    queryKey: subWorkflowKeys.history(workflowId, processId),
    queryFn: () => subWorkflowApi.getHistory(workflowId!, processId!),
  })

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
      queryClient.invalidateQueries({
        queryKey: [
          ...subWorkflowKeys.all,
          'by-rows',
          String(link.mainWorkflowId),
        ],
      })
    },
  })
}
