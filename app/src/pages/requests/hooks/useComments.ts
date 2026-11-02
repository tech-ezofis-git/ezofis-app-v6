// @/pages/requests/hooks/useComments.ts
import { useCallback, useEffect, useRef, useState } from 'react'
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
  // The ids settle in steps while the request loads (processId first, then
  // workflowInstanceId once agent data arrives), and agent refreshes refetch
  // on top of that. Only the latest call may write, so a slower stale or
  // failed response can't replace the list with [].
  const requestSeqRef = useRef(0)
  const requestKeyRef = useRef('')

  const refetch = useCallback(async () => {
    if (!workflowId || !instanceId) return
    const seq = ++requestSeqRef.current
    const key = `${workflowId}:${instanceId}`
    const keyChanged = requestKeyRef.current !== key
    requestKeyRef.current = key
    if (keyChanged) setData([])
    setIsLoading(true)
    setError(null)

    try {
      const res = await workflowsApiV6.getInstanceComments(
        workflowId,
        instanceId,
      )
      if (seq !== requestSeqRef.current) return
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
      if (seq !== requestSeqRef.current) return
      // Keep the last good list for this request on a failed refresh.
      console.error('Error fetching V6 instance comments:', e)
      setError(e)
    } finally {
      if (seq === requestSeqRef.current) setIsLoading(false)
    }
  }, [workflowId, instanceId])

  useEffect(() => {
    if (!enabled) return
    refetch()
  }, [enabled, refetch])

  return { data, error, isLoading, refetch }
}
