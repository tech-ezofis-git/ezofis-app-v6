import { useQuery } from '@tanstack/react-query'
import requestApi from '@/api/requests/requests'
import workflowsApiV6 from '@/api/v6/workflows'
import { getActionsForActivity } from '../utils/workflow.utils'

export const useRequestDetail = (
  workflowId: number | string | null,
  processId: number | string | null,
  transactionId: number | string | null,
  isProcessing?: boolean,
  /** Fallback when the list payload omits formId (common after stage moves). */
  fallbackFormId?: number | string | null,
  /**
   * When an AP Hangfire job is in flight, skip inbox/sent/completed polling.
   * Those lists are fetched once after hangfireStatus === Succeeded.
   */
  suspendListPolling?: boolean,
) => {
  return useQuery({
    enabled:
      !!workflowId && !!processId && !String(processId).startsWith('job-'),
    queryKey: [
      'request-detail',
      workflowId,
      processId,
      transactionId,
      fallbackFormId ? String(fallbackFormId) : '',
    ],
    queryFn: async () => {
      // 1. Fetch Basic Process Data from V6 API instead of discontinued rowInfo
      let processData: any = null
      try {
        // Stage-based tickets (Enquiry / Qualified) are not always in Inbox.
        // Keep the transaction the user opened instead of a Sent/Completed
        // copy of an earlier agent step.
        const openedTransactionId =
          transactionId != null && String(transactionId) !== ''
            ? String(transactionId)
            : ''

        const [inboxRes, sentRes, completedRes] = await Promise.all([
          workflowsApiV6.getInboxList(
            String(workflowId),
            1,
            5,
            String(processId),
            undefined,
          ),
          workflowsApiV6.getSentList(
            String(workflowId),
            1,
            5,
            String(processId),
            undefined,
          ),
          workflowsApiV6.getCompletedList(
            String(workflowId),
            1,
            5,
            String(processId),
            undefined,
          ),
        ])

        const allItems = [
          ...(inboxRes.data?.items || []),
          ...(sentRes.data?.items || []),
          ...(completedRes.data?.items || []),
        ]

        const processItems = allItems.filter((i: any) => {
          const id = i.workflowInstanceId || i.processId || i.id
          return String(id) === String(processId)
        })

        if (processItems.length > 0) {
          const opened = openedTransactionId
            ? processItems.find(
                (item: any) =>
                  String(item.transactionId || '') === openedTransactionId,
              )
            : null

          if (opened) {
            processData = opened
          } else {
            // Numeric transaction ids sort descending. UUID ids fall back to
            // the newest timestamp. A completed Sent row must not replace the
            // live person step the user opened when that step is not in Inbox.
            const liveItems = processItems.filter(
              (item: any) => !item.completedAtUtc,
            )
            const pool =
              liveItems.length > 0
                ? liveItems
                : openedTransactionId
                  ? []
                  : processItems
            pool.sort((a: any, b: any) => {
              const txA = Number(a.transactionId)
              const txB = Number(b.transactionId)
              if (!Number.isNaN(txA) && !Number.isNaN(txB)) {
                return txB - txA
              }
              const dateA = new Date(
                a.transactionCreatedAt ||
                  a.lastActionDate ||
                  a.updatedAt ||
                  a.createdAt ||
                  0,
              ).getTime()
              const dateB = new Date(
                b.transactionCreatedAt ||
                  b.lastActionDate ||
                  b.updatedAt ||
                  b.createdAt ||
                  0,
              ).getTime()
              return dateB - dateA
            })
            processData = pool[0] || null
          }
        }
      } catch (err) {
        console.error('Error fetching process details from V6 lists:', err)
      }

      if (!processData) {
        if (isProcessing) {
          return null
        }
        throw new Error('Process details not found')
      }

      // 2. Fetch Form Definition (ticket formId, else workflow formId)
      let formDefinition = null
      const formId =
        processData.formId ||
        processData.formData?.formId ||
        fallbackFormId ||
        null
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
        const historyRes = await workflowsApiV6.getInstanceHistory(
          workflowId as number | string,
          processId as number | string,
        )
        historyData = historyRes.data
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
            stage:
              processData.stageType === 'AP_AGENT'
                ? processData.stage
                : 'AI Agent',
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

    refetchInterval: (query) => {
      // Hangfire job owns progress — do not hammer inbox/sent/completed.
      if (suspendListPolling) return false

      const data: any = query.state.data

      // If we don't have data yet but know it's processing from parent
      if (!data) {
        return isProcessing ? 10000 : false
      }

      // Check if it has agent decision or is completed
      const agentDataList = data._agentData || []
      const hasAgentDecision =
        agentDataList.some((agent: any) => {
          return !!(agent?.decision || data.review || data.completedAtUtc)
        }) ||
        !!data.qualifyAgentResponse?.qualifier_result ||
        !!data.agentResponse

      const isAgentStage =
        data.stageType?.includes('AGENT') || data.stageType === 'AP_AGENT'
      const isDone =
        hasAgentDecision ||
        ['Verifier', 'Approved', 'Completed'].includes(data.stage)

      // If explicitly marked as processing, or if it's an active agent stage, keep polling
      if ((isProcessing || isAgentStage) && !isDone) {
        return 10000
      }

      return false
    },
  })
}
