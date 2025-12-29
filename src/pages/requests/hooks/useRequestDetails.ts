import { useQuery } from '@tanstack/react-query'
import requestApi from '@/api/requests/requests'
import { getActionsForActivity } from '../utils/workflow.utils'

export const useRequestDetail = (
  workflowId: number | null,
  processId: number | null,
  transactionId: number | null,
) => {
  return useQuery({
    queryKey: ['request-detail', workflowId, processId],
    enabled: !!workflowId && !!processId,

    queryFn: async () => {
      // 1. Fetch Basic Process Data
      const processData = await requestApi.getProcess(
        workflowId as Number,
        processId as Number,
        transactionId as Number,
      )

      // 2. Fetch Form Definition
      let formDefinition = null
      if (processData?.formData?.formId) {
        formDefinition = await requestApi.getForm(processData.formData.formId)
      }

      // 3. Fetch History (Critical for Agent Data)
      // This mimics Vue's 'showHistoryStepper' function
      const historyData = await requestApi.processHistory(
        workflowId as Number,
        processId as Number,
      )

      // 4. Extract Agent Data from History
      // Logic copied from Vue: showHistoryStepper()
      const agentData: any[] = []
      let stageLevel: any[] = []

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
              stage: row.agentType || 'No Agent',
              id: row.activityId || Math.random().toString(), // fallback ID
              reqNo: row.requestNo,
            })
          }
        })
      }

      // 5. Calculate Actions
      const actions = getActionsForActivity(
        processData?.activityId,
        processData?.flowJson,
      )

      return {
        ...processData,
        _formDefinition: formDefinition,
        _history: historyData,
        _agentData: agentData, // <--- We will use this to switch views
        _stageLevel: stageLevel,
        _actions: actions,
      }
    },
  })
}
