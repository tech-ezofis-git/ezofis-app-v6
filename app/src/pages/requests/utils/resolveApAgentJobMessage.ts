import requestStore from '@/pages/requests/stores/useRequestStore'

export const isJobStatusFailed = (status: any) => {
  if (!status) return false
  const hangfire = String(status.hangfireStatus || '').toLowerCase()
  const stage = String(status.stage || '').toUpperCase()
  return hangfire === 'failed' || stage === 'FAILED'
}

const normalizeJobMessage = (raw: unknown) => {
  const message = String(raw || '').trim()
  if (!message) return ''
  if (message === 'AP Agent finished') return ''
  if (message === 'Linking related records') return 'Linking PO Records'
  return message
}

const candidateIdsOf = (requestData: any) => {
  if (!requestData) return [] as string[]
  return [
    requestData.apAgentJobId,
    requestData.jobId,
    requestData.processId,
    requestData.id,
    requestData.workflowInstanceId,
    requestData.instanceId,
  ]
    .filter((v) => v !== null && v !== undefined && String(v).trim() !== '')
    .map((v) => String(v))
}

const lookupJobStatus = (requestData: any, includeCompleted: boolean) => {
  const { jobMappings, jobStatuses, processingProcesses } =
    requestStore.getState()

  const statuses = jobStatuses || {}
  const mappings = jobMappings || {}
  const candidateIds = candidateIdsOf(requestData)

  const pick = (status: any) => {
    if (!status) return null
    if (!includeCompleted && status.isCompleted) return null
    return status
  }

  // 1) Direct lookup by known ids (job-37334, 37334, instance uuid, …)
  for (const id of candidateIds) {
    const hit = pick(statuses[`job-${id}`]) || pick(statuses[id]) || null
    if (hit) return hit
  }

  // 2) Reverse jobMappings: jobId -> instanceId
  for (const [jobId, instanceId] of Object.entries(mappings)) {
    if (!candidateIds.includes(String(instanceId))) continue
    const hit =
      pick(statuses[`job-${jobId}`]) ||
      pick(statuses[String(jobId)]) ||
      pick(statuses[String(instanceId)]) ||
      null
    if (hit) return hit
  }

  // 3) processingProcesses entry for this request
  for (const process of processingProcesses || []) {
    const processIds = [
      process.apAgentJobId,
      process.jobId,
      process.processId,
      process.id,
      process.instanceId,
    ]
      .filter(Boolean)
      .map(String)

    const overlaps =
      candidateIds.length === 0
        ? false
        : processIds.some((id) => candidateIds.includes(id))
    if (!overlaps && candidateIds.length > 0) continue

    const jobId = process.apAgentJobId || process.jobId
    if (jobId) {
      const hit =
        pick(statuses[`job-${jobId}`]) || pick(statuses[String(jobId)]) || null
      if (hit) return hit
    }
  }

  // 4) Scan statuses for matching instanceId / jobId fields
  for (const status of Object.values(statuses) as any[]) {
    if (!pick(status)) continue
    const statusIds = [status.instanceId, status.jobId, status.apAgentJobId]
      .filter(Boolean)
      .map(String)
    if (statusIds.some((id) => candidateIds.includes(id))) return status
  }

  // 5) Detail view usually has one in-flight job — use its message.
  if (!includeCompleted) {
    const active = (Object.values(statuses) as any[]).filter(
      (status) =>
        pick(status) &&
        normalizeJobMessage(status.message || status.hangfireStatus),
    )
    if (active.length === 1) return active[0]
  }

  return null
}

/** Resolve live AP-agent job status for a request row / selected item. */
export const resolveApAgentJobStatus = (requestData: any) =>
  lookupJobStatus(requestData, false)

/** Job already succeeded, but the request result may still be loading. */
export const isApAgentJobCompleted = (requestData: any) => {
  if (resolveApAgentJobStatus(requestData)) return false
  const status = lookupJobStatus(requestData, true)
  if (!status?.isCompleted || isJobStatusFailed(status)) return false
  return true
}

/** Hangfire reported a terminal failure for this request's agent job. */
export const isApAgentJobFailed = (requestData: any) =>
  isJobStatusFailed(lookupJobStatus(requestData, true))

export const apAgentJobFailureText = (requestData: any) => {
  const status = lookupJobStatus(requestData, true)
  if (!isJobStatusFailed(status)) return ''
  return [status?.message, status?.errorMessage, status?.stage]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

/** Drop the in-flight process so the request stops looking like it is still running. */
export const stopFailedApAgentJob = (
  apAgentJobId: string | number,
  jobData?: any,
) => {
  const store = requestStore.getState()
  const ids = [
    `job-${apAgentJobId}`,
    apAgentJobId,
    jobData?.instanceId,
    jobData?.processId,
  ].filter((id) => id !== null && id !== undefined && String(id).trim() !== '')
  ids.forEach((id) => store.removeProcessingProcess(id))

  requestStore.setState((state) => {
    const selected = state.selectedItem
    if (!selected) return {}
    const selectedIds = [
      selected.apAgentJobId,
      selected.processId,
      selected.id,
      selected.workflowInstanceId,
      selected.instanceId,
    ].map((id) => String(id || ''))
    const failedIds = ids.map((id) => String(id))
    if (!selectedIds.some((id) => id && failedIds.includes(id))) return {}
    return {
      selectedItem: {
        ...selected,
        isProcessing: false,
      },
    }
  })
}

export const resolveApAgentJobMessage = (requestData?: any) => {
  const status = resolveApAgentJobStatus(requestData)
  if (!status) return ''
  return normalizeJobMessage(status.message || status.hangfireStatus)
}

export default resolveApAgentJobMessage
