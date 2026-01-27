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
        groupBy: groupBy.length > 0 ? groupBy : ["RXwLGHILLrreMmRqlk9mj"],
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
      const apiData = payload?.data?.data || payload?.data || []
      const totalItems =
        payload?.meta?.totalItems || payload?.data?.meta?.totalItems || 0

      const groupedData: TableGroup[] = []

      // Helper to transform process into InboxItem
      const transformProcess = (process: any, groupKey: string): InboxItem => {
        const dynamicFields = process.formData?.fields || {}
        let actions: any[] = []
        if (activeTab === 'Inbox') {
          actions = getActionsForActivity(
            process.activityId,
            selectedWorkflow?.flowJson,
          )
        }
        return {
          ...process,
          ...dynamicFields,
          id: process.processId || process.id,
          _groupKey: groupKey || activeTab,
          _actions: actions,
        }
      }

      if (Array.isArray(apiData)) {
        apiData.forEach((outer: any) => {
          // outer is usually { key: "", totalCount: X, value: [...] }
          if (outer && Array.isArray(outer.value)) {
            outer.value.forEach((inner: any, idx: number) => {
              // Format 1: Grouped (inner has 'value' array of items)
              if (inner && Array.isArray(inner.value)) {
                const groupItems = inner.value
                  .filter((p: any) => p && (p.processId || p.id))
                  .map((p: any) => transformProcess(p, inner.key))

                if (groupItems.length > 0) {
                  groupedData.push({
                    groupId: inner.key || `group-${idx}`,
                    groupKey: inner.key,
                    groupValue: inner.key,
                    groupCount: inner.totalCount || groupItems.length,
                    items: groupItems,
                  })
                }
              }
              // Format 2: Flat (inner is the item itself)
              else if (inner && (inner.processId || inner.id)) {
                let rootGroup = groupedData.find((g) => g.groupId === 'root')
                const transformed = transformProcess(inner, activeTab)

                if (rootGroup) {
                  rootGroup.items.push(transformed)
                  rootGroup.groupCount = rootGroup.items.length
                } else {
                  groupedData.push({
                    groupId: 'root',
                    groupCount: 1,
                    items: [transformed],
                  })
                }
              }
            })
          }
        })
      }

      return { data: groupedData, totalItems }
    },
  })
}
