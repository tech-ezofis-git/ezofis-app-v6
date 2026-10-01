import requestStore from '@/pages/requests/stores/useRequestStore'

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

/** Resolve live AP-agent job status for a request row / selected item. */
export const resolveApAgentJobStatus = (requestData: any) => {
  const { jobMappings, jobStatuses, processingProcesses } =
    requestStore.getState()

  const statuses = jobStatuses || {}
  const mappings = jobMappings || {}
  const candidateIds = candidateIdsOf(requestData)

  const pickActive = (status: any) => {
    if (!status || status.isCompleted) return null
    return status
  }

  // 1) Direct lookup by known ids (job-37334, 37334, instance uuid, …)
  for (const id of candidateIds) {
    const hit =
      pickActive(statuses[`job-${id}`]) ||
      pickActive(statuses[id]) ||
      null
    if (hit) return hit
  }

  // 2) Reverse jobMappings: jobId -> instanceId
  for (const [jobId, instanceId] of Object.entries(mappings)) {
    if (!candidateIds.includes(String(instanceId))) continue
    const hit =
      pickActive(statuses[`job-${jobId}`]) ||
      pickActive(statuses[String(jobId)]) ||
      pickActive(statuses[String(instanceId)]) ||
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
        pickActive(statuses[`job-${jobId}`]) ||
        pickActive(statuses[String(jobId)]) ||
        null
      if (hit) return hit
    }
  }

  // 4) Scan statuses for matching instanceId / jobId fields
  for (const status of Object.values(statuses) as any[]) {
    if (!pickActive(status)) continue
    const statusIds = [status.instanceId, status.jobId, status.apAgentJobId]
      .filter(Boolean)
      .map(String)
    if (statusIds.some((id) => candidateIds.includes(id))) return status
  }

  // 5) Detail view usually has one in-flight job — use its message.
  const active = (Object.values(statuses) as any[]).filter(
    (status) =>
      pickActive(status) &&
      normalizeJobMessage(status.message || status.hangfireStatus),
  )
  if (active.length === 1) return active[0]

  return null
}

export const resolveApAgentJobMessage = (requestData?: any) => {
  const status = resolveApAgentJobStatus(requestData)
  if (!status) return ''
  return normalizeJobMessage(status.message || status.hangfireStatus)
}

export default resolveApAgentJobMessage
