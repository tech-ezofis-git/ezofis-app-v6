import { useQuery } from '@tanstack/react-query'
import requestApi from '@/api/requests/requests'
import { getActionsForActivity } from '../utils/workflow.utils'
import type { WorkflowOption, InboxItem, TableGroup } from '../types'

export const useInboxData = (
  selectedWorkflow: WorkflowOption | null,
  page: number,
  pageSize: number,
  groupBy: string[],
  activeTab: string = 'Inbox',
) => {
  return useQuery({
    queryKey: [
      'inbox',
      selectedWorkflow?.id,
      page,
      pageSize,
      groupBy,
      activeTab,
    ],
    enabled: !!selectedWorkflow?.id,

    queryFn: async () => {
      const config: any = {
        itemsPerPage: pageSize,
        currentPage: page,
        sortBy: { criteria: '', order: 'DESC' },
        filterBy: [],
      }

      // Only add groupBy for Inbox to avoid API errors
      if (activeTab === 'Inbox' && groupBy.length > 0) {
        config.groupBy = groupBy
      }

      const workflowId = selectedWorkflow?.id as Number
      let response

      try {
        switch (activeTab) {
          case 'Sent':
            response = await requestApi.getSentListById(workflowId, config)
            break
          case 'Closed':
            response = await requestApi.getCompletedRequestById(
              workflowId,
              config,
            )
            break
          case 'Inbox':
          default:
            response = await requestApi.getInboxListById(workflowId, config)
            break
        }
      } catch (error) {
        console.error(error)
        return { data: [], meta: { totalItems: 0 } }
      }

      return response || { data: [], meta: { totalItems: 0 } }
    },

    select: (payload: any) => {
      let apiData = payload?.data?.data || payload?.data || []

      if (
        !Array.isArray(apiData) &&
        payload?.data &&
        Array.isArray(payload.data)
      ) {
        apiData = payload.data
      }

      const totalItems =
        payload?.meta?.totalItems || payload?.data?.meta?.totalItems || 0
      const flatList: InboxItem[] = []

      if (Array.isArray(apiData)) {
        apiData.forEach((group: any) => {
          const subGroups = Array.isArray(group.value) ? group.value : [group]

          subGroups.forEach((subGroup: any) => {
            const processes = Array.isArray(subGroup.value)
              ? subGroup.value
              : [subGroup]

            processes.forEach((process: any) => {
              if (!process || !process.processId) return

              const dynamicFields = process.formData?.fields || {}

              let actions: any[] = []
              if (activeTab === 'Inbox') {
                actions = getActionsForActivity(
                  process.activityId,
                  selectedWorkflow?.flowJson,
                )
              } else {
                // You can add 'View' action for Sent/Closed here if needed
                actions = []
              }

              flatList.push({
                ...process,
                ...dynamicFields,
                id: process.processId,
                _groupKey: group.key || activeTab,
                _actions: actions,
              })
            })
          })
        })
      }
      if (flatList.length === 0) {
        return { data: [], totalItems: 0 }
      }
      // --- CRITICAL FIX ---
      // We MUST wrap the flat list in a Group Object because useDataTable expects it.
      const groupedData: TableGroup[] = [
        {
          groupId: 'root',
          groupKey: activeTab,
          groupValue: `${activeTab} Requests`, // e.g. "Inbox Requests"
          groupCount: flatList.length,
          items: flatList, // The table looks for this .items property!
        },
      ]

      return { data: groupedData, totalItems }
    },
  })
}
