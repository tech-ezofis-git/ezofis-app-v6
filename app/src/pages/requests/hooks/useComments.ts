// @/pages/requests/hooks/useComments.ts
import { useCallback, useEffect, useState } from 'react'
import { workflowsApiV6 } from '@/api/v6/workflows'

export type CommentItem = {
  authorName?: string
  authorType?: string
  comments?: string
  createdAt?: string
  createdBy?: string
  createdByEmail?: string
  createdByName?: string
  externalCommentsBy?: string
  fileIds?: Array<string | number>
  hasNotifytoInitiated?: boolean
  id?: string | number
  isAgent?: boolean
  showTo?: number // 1/2 etc in v5
}

export function useComments(
  workflowId?: number | string,
  instanceId?: number | string,
  enabled?: boolean,
) {
  const [data, setData] = useState<CommentItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<any>(null)

  const refetch = useCallback(async () => {
    if (!workflowId || !instanceId) return
    setIsLoading(true)
    setError(null)

    try {
      const res = await workflowsApiV6.getInstanceComments(
        workflowId,
        instanceId,
      )
      if (res.error) {
        throw new Error(res.error)
      }

      const list = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.comments)
          ? res.data.comments
          : Array.isArray(res.data?.items)
            ? res.data.items
            : []

      const mapped: CommentItem[] = list.map((c: any) => ({
        authorName: c.authorName || c.externalCommentsBy || '',
        authorType: c.authorType || '',
        comments: c.comments || c.text || c.comment || '',
        createdAt:
          c.createdAt || c.createdAtUtc || c.occurredAtUtc || c.createdOn || '',
        createdBy: c.createdBy || '',
        createdByEmail:
          c.createdByEmail ||
          c.createdByUserName ||
          c.performedByUserName ||
          '',
        createdByName:
          c.createdByName || c.createdByUserName || c.performedByUserName || '',
        externalCommentsBy: c.externalCommentsBy || '',
        fileIds: c.fileIds || [],
        hasNotifytoInitiated: c.hasNotifytoInitiated || false,
        id: c.id || c._id || '',
        isAgent:
          c.isAgent === true ||
          String(c.authorType || '').toUpperCase() === 'AGENT',
        showTo: c.showTo ?? 2,
      }))

      setData(mapped)
    } catch (e) {
      console.error('Error fetching V6 instance comments:', e)
      setError(e)
      setData([])
    } finally {
      setIsLoading(false)
    }
  }, [workflowId, instanceId])

  useEffect(() => {
    if (!enabled) return
    refetch()
  }, [enabled, refetch])

  return { data, error, isLoading, refetch }
}
