import { useQuery } from '@tanstack/react-query'
import requestApi from '@/api/requests/requests'
import { getActionsForActivity } from '../utils/workflow.utils'

export const useRequestDetail = (
  workflowId: number | string | null,
  processId: number | string | null,
  transactionId: number | string | null,
) => {
  return useQuery({
    enabled: !!workflowId && !!processId,
    queryKey: ['request-detail', workflowId, processId],

    queryFn: async () => {
      // 1. Fetch Basic Process Data
      const processData = await requestApi.getProcess(
        workflowId as number | string,
        processId as number | string,
        transactionId as number | string,
      )

      // 2. Fetch Form Definition
      let formDefinition = null
      if (processData?.formData?.formId) {
        formDefinition = await requestApi.getForm(processData.formData.formId)
      }

      // 3. Fetch History (Critical for Agent Data)
      // This mimics Vue's 'showHistoryStepper' function
      const historyData = await requestApi.processHistory(
        workflowId as number | string,
        processId as number | string,
      )

      // 4. Extract Agent Data from History
      // Logic copied from Vue: showHistoryStepper()
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
              id: row.activityId || Math.random().toString(), // fallback ID
              reqNo: row.requestNo,
              stage: row.agentType || 'No Agent',
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
        _actions: actions,
        _agentData: agentData, // <--- We will use this to switch views
        _formDefinition: formDefinition,
        _history: historyData,
        _stageLevel: stageLevel,
      }
    },
  })
}
