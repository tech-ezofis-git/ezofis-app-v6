import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import workflowsApiV6 from '@/api/v6/workflows'
import {
  finalizeApAgentJobIfSucceeded,
  markApAgentJobHandled,
  wasApAgentJobFinalized,
} from '../utils/finalizeApAgentJobIfSucceeded'
import requestStore from '../stores/useRequestStore'
import {
  isJobStatusFailed,
  stopFailedApAgentJob,
} from '../utils/resolveApAgentJobMessage'

const findItemInResponse = (data: any, processId: any) => {
  if (!data) return null
  const items =
    data.items ||
    (Array.isArray(data)
      ? data.flatMap((g: any) => g.items || g.value || [])
      : [])
  return (
    items.find((i: any) => {
      const id = i.workflowInstanceId || i.processId || i.id
      return String(id) === String(processId)
    }) || null
  )
}

const POLLING_INTERVAL = 60000 // 1 minute (60 seconds)

export const ProcessingBackgroundManager = () => {
  const {
    processingProcesses,
    rawWorkflowData,
    removeProcessingProcess,
    updateProcessingProcess,
  } = requestStore()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (processingProcesses.length === 0) return

    const pollers = processingProcesses.map((process) => {
      const processId = process.processId || process.id
      const transactionId = process.transactionId
      const workflowId = process.workflowId || rawWorkflowData?.id
      const apAgentJobId = process.apAgentJobId

      // Job-based polling only needs apAgentJobId (AP Hangfire job).
      // Instance-list polling needs both processId and workflowId.
      if (!apAgentJobId && (!processId || !workflowId)) return null

      const poll = async () => {
        try {
          if (apAgentJobId) {
            // Job already finalized — stop further job/list traffic.
            if (wasApAgentJobFinalized(apAgentJobId)) return

            const res = await workflowsApiV6.getApAgentJobStatus(
              String(apAgentJobId),
            )
            if (res.data) {
              const jobData = res.data
              const percentRaw =
                jobData.percent === undefined
                  ? jobData.Percent
                  : jobData.percent
              const percentNum =
                percentRaw !== undefined && percentRaw !== null
                  ? Number(percentRaw)
                  : Number.NaN
              const percent = Number.isNaN(percentNum) ? undefined : percentNum

              const stage = jobData.stage || 'OCR Extraction'
              const message = jobData.message || jobData.hangfireStatus || ''
              const isCompleted =
                jobData.isTerminal ||
                jobData.stage === 'COMPLETED' ||
                jobData.hangfireStatus === 'Succeeded'

              // Update job status in store with full jobData payload
              const jobKey = `job-${apAgentJobId}`
              requestStore.getState().setJobStatus(jobKey, {
                ...jobData,
                apAgentJobId,
                isCompleted,
                message,
                percent,
                stage,
              })

              // Update processingProcess ID in store — keep apAgentJobId
              // after the API payload spread so resolve/message UI can find it.
              if (jobData.instanceId) {
                requestStore
                  .getState()
                  .setJobMapping(apAgentJobId, jobData.instanceId)
                requestStore
                  .getState()
                  .setJobStatus(String(jobData.instanceId), {
                    ...jobData,
                    apAgentJobId,
                    isCompleted,
                    message,
                    percent,
                    stage,
                  })

                requestStore
                  .getState()
                  .updateProcessingProcess(String(processId), {
                    ...jobData,
                    apAgentJobId,
                    id: jobData.instanceId,
                    isCompleted,
                    processId: jobData.instanceId,
                    stage,
                  })

                // Keep open detail row IDs in sync once the real instance appears.
                requestStore.setState((state) => {
                  if (
                    !state.selectedItem ||
                    (String(state.selectedItem.apAgentJobId) !==
                      String(apAgentJobId) &&
                      String(state.selectedItem.processId || '') !==
                        String(processId) &&
                      String(state.selectedItem.id || '') !== String(processId))
                  ) {
                    return {}
                  }
                  return {
                    selectedItem: {
                      ...state.selectedItem,
                      apAgentJobId,
                      id: jobData.instanceId,
                      isProcessing: !isCompleted,
                      processId: jobData.instanceId,
                      workflowInstanceId:
                        state.selectedItem.workflowInstanceId ||
                        jobData.instanceId,
                    },
                  }
                })
              } else {
                requestStore
                  .getState()
                  .updateProcessingProcess(String(processId), {
                    ...jobData,
                    apAgentJobId,
                    isCompleted,
                    stage,
                  })
              }

              if (isJobStatusFailed(jobData)) {
                markApAgentJobHandled(apAgentJobId)
                stopFailedApAgentJob(apAgentJobId, jobData)
                return
              }

              if (isCompleted) {
                // Only after Succeeded: fetch inbox/sent/completed for instanceId.
                void finalizeApAgentJobIfSucceeded({
                  apAgentJobId,
                  jobData: {
                    ...jobData,
                    isCompleted: true,
                  },
                  queryClient,
                  workflowId:
                    workflowId || jobData.workflowId || rawWorkflowData?.id,
                })
              }
            }
            return
          }

          let response = await workflowsApiV6.getSentList(
            String(workflowId),
            1,
            5,
            processId,
            transactionId,
          )
          let item = response?.data
            ? findItemInResponse(response.data, processId)
            : null

          // Fallback to Inbox List
          if (!item) {
            response = await workflowsApiV6.getInboxList(
              String(workflowId),
              1,
              5,
              processId,
              transactionId,
            )
            item = response?.data
              ? findItemInResponse(response.data, processId)
              : null
          }

          if (item) {
            const stage = item.stage || item.activityName || 'Start'
            const stageType = item.stageType

            let parsedAgentResponse = null
            if (item.agentResponse) {
              if (typeof item.agentResponse === 'string') {
                try {
                  parsedAgentResponse = JSON.parse(item.agentResponse)
                } catch {
                  parsedAgentResponse = null
                }
              } else if (typeof item.agentResponse === 'object') {
                parsedAgentResponse = item.agentResponse
              }
            }

            const hasAgentDecision = !!(
              item.review ||
              parsedAgentResponse?.decision ||
              item.completedAtUtc
            )

            // Keep polling as long as stageType is AP_AGENT and has no decision. Remove when stageType is NOT AP_AGENT or has a decision or completes.
            const isCompleted =
              stageType !== 'AP_AGENT' ||
              hasAgentDecision ||
              ['Verifier', 'Approved', 'Completed'].includes(stage)

            updateProcessingProcess(processId, {
              isCompleted,
              lastUpdated: new Date(),
              stage,
              stageType,
              ...item,
            })

            if (isCompleted) {
              queryClient.invalidateQueries({ queryKey: ['inbox'] })
              queryClient.invalidateQueries({ queryKey: ['request-detail'] })
              setTimeout(() => {
                removeProcessingProcess(processId)
              }, 5000)
            }
          }
        } catch (error) {
          console.error('Polling error for process', processId, error)
        }
      }

      // Initial poll
      poll()

      const intervalMs = apAgentJobId ? 5000 : POLLING_INTERVAL
      const intervalId = setInterval(poll, intervalMs)
      return { id: processId, intervalId }
    })

    return () => {
      pollers.forEach((p) => p && clearInterval(p.intervalId))
    }
  }, [processingProcesses.length, rawWorkflowData?.id, queryClient, removeProcessingProcess, updateProcessingProcess])

  return null
}
