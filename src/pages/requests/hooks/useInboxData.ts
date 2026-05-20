import { useQuery } from '@tanstack/react-query'
import requestApi from '@/api/requests/requests'
import type { InboxItem, TableGroup, WorkflowOption } from '../types'
import { getActionsForActivity } from '../utils/workflow.utils'

export const useInboxData = (
  selectedWorkflow: WorkflowOption | null,
  page: number,
  pageSize: number,
  groupBy: string[],
  activeTab: string = 'Inbox',
) => {
  return useQuery({
    enabled: !!selectedWorkflow?.id,
    queryKey: [
      'inbox',
      selectedWorkflow?.id,
      page,
      pageSize,
      groupBy,
      activeTab,
    ],

    queryFn: async () => {
      const config: any = {
        currentPage: page,
        filterBy: [],
        itemsPerPage: pageSize,

        sortBy: { criteria: '', order: 'DESC' },
      }

      // Only add groupBy for Inbox to avoid API errors
      if (activeTab === 'Inbox') {
        config.groupBy =
          groupBy.length > 0 ? groupBy : ['RXwLGHILLrreMmRqlk9mj']
      }

      const workflowId = selectedWorkflow?.id as number | string
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
          case 'Exceptions':
            response = await requestApi.getInboxListById(workflowId, config)
            break
          case 'Processed': {
            const [sentResponse, completedResponse] = await Promise.all([
              requestApi.getSentListById(workflowId, config),
              requestApi.getCompletedRequestById(workflowId, config),
            ])

            const sentData =
              sentResponse?.data?.data || sentResponse?.data || []
            const completedData =
              completedResponse?.data?.data || completedResponse?.data || []

            const combinedData = [...sentData, ...completedData]
            const totalItems =
              (sentResponse?.meta?.totalItems ||
                sentResponse?.data?.meta?.totalItems ||
                0) +
              (completedResponse?.meta?.totalItems ||
                completedResponse?.data?.meta?.totalItems ||
                0)

            response = {
              data: {
                data: combinedData,
                meta: {
                  totalItems,
                },
              },
            }
            break
          }
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
      const transformProcess = (
        process: any,
        groupKey: string,
        originalIndex: number,
      ): InboxItem => {
        const dynamicFields = process.formData?.fields || {}
        let actions: any[] = []
        if (activeTab === 'Inbox' || activeTab === 'Exceptions') {
          actions = getActionsForActivity(
            process.activityId,
            selectedWorkflow?.flowJson,
          )
        }
        return {
          ...process,
          ...dynamicFields,
          _actions: actions,
          _groupKey: groupKey || activeTab,
          _originalIndex: originalIndex,
          id: process.processId || process.id,
        }
      }

      let globalIndex = 0
      if (Array.isArray(apiData)) {
        apiData.forEach((outer: any) => {
          // outer is usually { key: "", totalCount: X, value: [...] }
          if (outer && Array.isArray(outer.value)) {
            outer.value.forEach((inner: any, idx: number) => {
              // Format 1: Grouped (inner has 'value' array of items)
              if (inner && Array.isArray(inner.value)) {
                let groupItems = inner.value
                  .filter((p: any) => p && (p.processId || p.id))
                  .map((p: any) => {
                    const item = transformProcess(p, inner.key, globalIndex)
                    globalIndex++
                    return item
                  })

                if (activeTab === 'Exceptions') {
                  groupItems = groupItems.filter(
                    (item: any) => (item as any)._originalIndex % 12 !== 0,
                  )
                }

                if (groupItems.length > 0) {
                  groupedData.push({
                    groupCount: groupItems.length,
                    groupId: inner.key || `group-${idx}`,
                    groupKey: inner.key,
                    groupValue: inner.key,
                    items: groupItems,
                  })
                }
              }
              // Format 2: Flat (inner is the item itself)
              else if (inner && (inner.processId || inner.id)) {
                const transformed = transformProcess(
                  inner,
                  activeTab,
                  globalIndex,
                )
                globalIndex++

                if (
                  activeTab === 'Exceptions' &&
                  (transformed as any)._originalIndex % 12 === 0
                ) {
                  return
                }

                const rootGroup = groupedData.find((g) => g.groupId === 'root')
                if (rootGroup) {
                  rootGroup.items.push(transformed)
                  rootGroup.groupCount = rootGroup.items.length
                } else {
                  groupedData.push({
                    groupCount: 1,
                    groupId: 'root',
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
