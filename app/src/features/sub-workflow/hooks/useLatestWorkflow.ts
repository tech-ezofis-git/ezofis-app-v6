import { useQuery } from '@tanstack/react-query'
import workflowsApiV6 from '@/api/v6/workflows'

/**
 * The saved workflow definition. The requests store persists its copy of the
 * workflow and keeps it after a publish, so sub-workflow settings are read
 * from here instead.
 */
const useLatestWorkflow = (
  workflowId?: null | number | string,
  enabled = true,
) =>
  useQuery({
    enabled: enabled && !!workflowId,
    queryKey: ['sub-workflow', 'latest-workflow', String(workflowId)],
    refetchOnMount: 'always',
    queryFn: async () => {
      // The request page loads the same URL; don't let one abort the other.
      const { data, error } = await workflowsApiV6.getWorkflowById(
        String(workflowId),
        { skipCancellation: true },
      )
      if (error || !data) throw new Error(error || 'Workflow not found')
      return data
    },
  })

export default useLatestWorkflow
