import { useQuery } from '@tanstack/react-query'
import requestApi from '@/api/requests/requests'
import workflowsApiV6 from '@/api/v6/workflows'
import { getActionsForActivity } from '../utils/workflow.utils'

export const useRequestDetail = (
  workflowId: number | string | null,
  processId: number | null,
  transactionId: number | null,
  isProcessing?: boolean,
) => {
  return useQuery({
    enabled: !!workflowId && !!processId,
    queryKey: ['request-detail', workflowId, processId, transactionId],
    refetchInterval: (query) => {
      const data: any = query.state.data
      
      // If we don't have data yet but know it's processing from parent
      if (!data) {
        return isProcessing ? 10000 : false
      }

      const isCompleted = data.stageType !== 'AP_AGENT'

      return !isCompleted ? 10000 : false
    },

    queryFn: async () => {
      // 1. Fetch Basic Process Data from V6 API instead of discontinued rowInfo
      let processData: any = null
      try {
        // Try Inbox
        const inboxRes = await workflowsApiV6.getInboxList(
          String(workflowId),
          1,
          5,
          String(processId),
          String(transactionId),
        )
        const inboxItems = inboxRes.data?.items || []
        processData = inboxItems.find((i: any) => {
          const id = i.workflowInstanceId || i.processId || i.id
          return String(id) === String(processId)
        })

        // Try Sent if not found
        if (!processData) {
          const sentRes = await workflowsApiV6.getSentList(
            String(workflowId),
            1,
            5,
            String(processId),
            String(transactionId),
          )
          const sentItems = sentRes.data?.items || []
          processData = sentItems.find((i: any) => {
            const id = i.workflowInstanceId || i.processId || i.id
            return String(id) === String(processId)
          })
        }

        // Try Completed if not found
        if (!processData) {
          const completedRes = await workflowsApiV6.getCompletedList(
            String(workflowId),
            1,
            5,
            String(processId),
            String(transactionId),
          )
          const completedItems = completedRes.data?.items || []
          processData = completedItems.find((i: any) => {
            const id = i.workflowInstanceId || i.processId || i.id
            return String(id) === String(processId)
          })
        }
      } catch (err) {
        console.error('Error fetching process details from V6 lists:', err)
      }

      if (!processData) {
        throw new Error('Process details not found')
      }

      // 2. Fetch Form Definition
      let formDefinition = null
      const formId = processData.formId || processData.formData?.formId
      if (formId) {
        try {
          formDefinition = await requestApi.getForm(formId)
        } catch (err) {
          console.error('Error fetching form definition:', err)
        }
      }

      // 3. Fetch History (Critical for Agent Data)
      let historyData = null
      try {
        historyData = await requestApi.processHistory(
          workflowId as number | string,
          processId as number,
        )
      } catch (err) {
        console.error('Error fetching process history:', err)
      }

      // 4. Extract Agent Data from History
      const agentData: any[] = []
      const stageLevel: any[] = []

      if (Array.isArray(historyData)) {
        historyData.forEach((row: any) => {
          // Build Stage Level (Stepper)
          if (row.actionStatus !== 2) {
            stageLevel.push({
              id: row.activityId,
              label: row.stage,
              status: row.status,
            })
          }

          // Build Agent Data
          if (row.agentResponse && Object.keys(row.agentResponse).length > 0) {
            agentData.push({
              ...row.agentResponse,
              id: row.activityId || Math.random().toString(),
              reqNo: row.requestNo,
              stage: row.agentType || 'No Agent',
            })
          }
        })
      }

      // Fallback: extract agentResponse from basic processData if not found in history
      if (agentData.length === 0 && processData.agentResponse) {
        let parsedAgentResponse = null
        if (typeof processData.agentResponse === 'string') {
          try {
            parsedAgentResponse = JSON.parse(processData.agentResponse)
          } catch {}
        } else if (typeof processData.agentResponse === 'object') {
          parsedAgentResponse = processData.agentResponse
        }

        if (parsedAgentResponse) {
          agentData.push({
            ...parsedAgentResponse,
            id: processData.activityId || Math.random().toString(),
            reqNo: processData.referenceNumber || processData.requestNo,
            stage: processData.stageType === 'AP_AGENT' ? processData.stage : 'AI Agent',
          })
        }
      }

      // 5. Calculate Actions
      const actions = getActionsForActivity(
        processData?.activityId,
        processData?.flowJson || processData?.workflowJson?.flowJson,
      )

      return {
        ...processData,
        _actions: actions,
        _agentData: agentData, // <--- We will use this to switch views
        _formDefinition: formDefinition,
        _history: historyData,
        _stageLevel: stageLevel,
      }
    },
  })
}
