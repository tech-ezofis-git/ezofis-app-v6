import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import workflowsApiV6 from '@/api/v6/workflows'
import requestStore from '../stores/useRequestStore'

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

      if (!processId || !workflowId) return null

      const poll = async () => {
        try {
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

            updateProcessingProcess(processId, {
              lastUpdated: new Date(),
              stage,
              stageType,
            })

            // Keep polling as long as stageType is AP_AGENT and has no decision. Remove when stageType is NOT AP_AGENT or has a decision or completes.
            const isCompleted =
              stageType !== 'AP_AGENT' ||
              hasAgentDecision ||
              ['Verifier', 'Approved', 'Completed'].includes(stage)
            if (isCompleted) {
              removeProcessingProcess(processId)
              queryClient.invalidateQueries({ queryKey: ['inbox'] })
              queryClient.invalidateQueries({ queryKey: ['request-detail'] })
            }
          }
        } catch (error) {
          console.error('Polling error for process', processId, error)
        }
      }

      // Initial poll
      poll()

      const intervalId = setInterval(poll, POLLING_INTERVAL)
      return { id: processId, intervalId }
    })

    return () => {
      pollers.forEach((p) => p && clearInterval(p.intervalId))
    }
  }, [processingProcesses.length, rawWorkflowData?.id])

  return null
}
