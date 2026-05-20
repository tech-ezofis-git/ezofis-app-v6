import { useQuery } from '@tanstack/react-query'
import requestApi from '@/api/requests/requests'
import { getActionsForActivity } from '../utils/workflow.utils'

export const useRequestDetail = (
  workflowId: number | null,
  processId: number | null,
  transactionId: number | null,
) => {
  return useQuery({
    enabled: !!workflowId && !!processId,
    queryKey: ['request-detail', workflowId, processId, transactionId],

    queryFn: async () => {
      // 1. Fetch Basic Process Data
      const processData = await requestApi.getProcess(
        workflowId as number,
        processId as number,
        transactionId as number,
      )

      // 2. Fetch Form Definition
      let formDefinition = null
      if (processData?.formData?.formId) {
        formDefinition = await requestApi.getForm(processData.formData.formId)
      }

      // 3. Fetch History (Critical for Agent Data)
      // This mimics Vue's 'showHistoryStepper' function
      const historyData = await requestApi.processHistory(
        workflowId as number,
        processId as number,
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
