import requestStore from '@/pages/requests/stores/useRequestStore'

type RegisterApAgentJobArgs = {
  apAgentJobId: string | number
  name?: string
  processId?: string | number | null
  requestNo?: string
  stage?: string
  transactionId?: string | number | null
  workflowId?: string | number | null
}

/**
 * Register an AP-agent Hangfire job for background polling
 * (ProcessingBackgroundManager → GET /Workflows/ap-agent/jobs/{id}).
 * Mirrors the Accounts Payable FileUpload path so generic create/move
 * flows also poll repeatedly and refresh inbox when the job completes.
 */
export const registerApAgentJobProcessing = ({
  apAgentJobId,
  name,
  processId,
  requestNo,
  stage,
  transactionId,
  workflowId,
}: RegisterApAgentJobArgs) => {
  const jobId = String(apAgentJobId || '').trim()
  if (!jobId) return null

  const store = requestStore.getState()
  const resolvedProcessId = processId ? String(processId) : `job-${jobId}`
  const resolvedWorkflowId =
    workflowId ||
    store.rawWorkflowData?.id ||
    store.selectedWorkflowId ||
    store.selectedItem?.workflowId ||
    null

  const alreadyTracked = store.processingProcesses.some(
    (p) =>
      String(p.apAgentJobId) === jobId ||
      String(p.processId || p.id) === resolvedProcessId ||
      String(p.processId || p.id) === `job-${jobId}`,
  )

  if (!alreadyTracked) {
    store.addProcessingProcess({
      apAgentJobId: jobId,
      id: resolvedProcessId,
      isProcessing: true,
      name: name || store.selectedItem?.name || store.selectedItem?.fileName,
      processId: resolvedProcessId,
      requestNo:
        requestNo ||
        store.selectedItem?.requestNo ||
        store.selectedItem?.reqNo ||
        'New Request',
      stage: stage || 'Processing',
      startTime: new Date().toISOString(),
      transactionId: transactionId ?? store.selectedItem?.transactionId ?? null,
      workflowId: resolvedWorkflowId,
    })
  }

  // Keep the open detail view in sync so useJobPolling / message UI work.
  if (store.selectedItem) {
    const currentJobId = String(store.selectedItem.apAgentJobId || '')
    const needsPatch =
      currentJobId !== jobId || store.selectedItem.isProcessing !== true
    if (needsPatch) {
      requestStore.setState((state) => ({
        selectedItem: state.selectedItem
          ? {
              ...state.selectedItem,
              apAgentJobId: jobId,
              isProcessing: true,
              processId: state.selectedItem.processId || resolvedProcessId,
              stage: stage || state.selectedItem.stage || 'Processing',
              workflowId: state.selectedItem.workflowId || resolvedWorkflowId,
            }
          : state.selectedItem,
      }))
    }
  }

  return { jobId, processId: resolvedProcessId, workflowId: resolvedWorkflowId }
}

export const extractApAgentJobId = (payload: unknown): string | null => {
  if (!payload || typeof payload !== 'object') return null
  const data = payload as Record<string, any>
  const nested =
    data.data && typeof data.data === 'object'
      ? (data.data as Record<string, any>)
      : null
  const raw =
    data.apAgentJobId ??
    nested?.apAgentJobId ??
    data.ApAgentJobId ??
    nested?.ApAgentJobId ??
    null
  if (raw === null || raw === undefined || raw === '') return null
  return String(raw)
}

export default registerApAgentJobProcessing
