import type { QueryClient } from '@tanstack/react-query'
import workflowsApiV6 from '@/api/v6/workflows'
import requestStore from '@/pages/requests/stores/useRequestStore'

/** Jobs we already finalized — avoids inbox/sent/completed storms. */
const finalizedApJobs = new Set<string>()

export const wasApAgentJobFinalized = (jobId: string | number) =>
  finalizedApJobs.has(String(jobId))

export const isApAgentJobSucceeded = (jobData: any) =>
  Boolean(
    jobData &&
      (jobData.isTerminal ||
        jobData.isCompleted ||
        String(jobData.stage || '').toUpperCase() === 'COMPLETED' ||
        String(jobData.hangfireStatus || '') === 'Succeeded'),
  )

/**
 * When Hangfire reports Succeeded, fetch inbox / sent / completed once for
 * the real instanceId, then refresh list + detail queries. Safe to call
 * multiple times — only the first Succeeded for a jobId runs the fetches.
 */
export const finalizeApAgentJobIfSucceeded = async ({
  jobData,
  apAgentJobId,
  queryClient,
  workflowId,
}: {
  apAgentJobId: string | number
  jobData: any
  queryClient: QueryClient
  workflowId?: string | number | null
}) => {
  if (!isApAgentJobSucceeded(jobData)) return false

  const jobId = String(apAgentJobId)
  if (finalizedApJobs.has(jobId)) return false
  finalizedApJobs.add(jobId)

  const instanceId =
    jobData.instanceId ||
    requestStore.getState().jobMappings?.[jobId] ||
    null
  const resolvedWorkflowId =
    workflowId ||
    jobData.workflowId ||
    requestStore.getState().rawWorkflowData?.id ||
    requestStore.getState().selectedWorkflowId ||
    null

  // Only after Succeeded: resolve the instance from inbox / sent / completed.
  if (instanceId && resolvedWorkflowId) {
    try {
      await Promise.all([
        workflowsApiV6.getInboxList(
          String(resolvedWorkflowId),
          1,
          5,
          String(instanceId),
        ),
        workflowsApiV6.getSentList(
          String(resolvedWorkflowId),
          1,
          5,
          String(instanceId),
        ),
        workflowsApiV6.getCompletedList(
          String(resolvedWorkflowId),
          1,
          5,
          String(instanceId),
        ),
      ])
    } catch (error) {
      console.error(
        'Error fetching lists after AP agent job succeeded:',
        error,
      )
    }
  }

  queryClient.invalidateQueries({ queryKey: ['inbox'] })
  queryClient.invalidateQueries({ queryKey: ['request-detail'] })
  requestStore.getState().workflowRefresh()

  // Drop processing trackers shortly after success.
  setTimeout(() => {
    const store = requestStore.getState()
    if (instanceId) store.removeProcessingProcess(String(instanceId))
    store.removeProcessingProcess(`job-${jobId}`)
    store.removeProcessingProcess(jobId)
  }, 1500)

  return true
}

export default finalizeApAgentJobIfSucceeded
