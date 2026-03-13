// @/pages/requests/hooks/useComments.ts
import { useCallback, useEffect, useState } from 'react'
import requestApi from '@/api/requests/requests'

export type CommentItem = {
  comments?: string
  createdAt?: string
  createdByEmail?: string
  createdByName?: string
  fileIds?: Array<string | number>
  hasNotifytoInitiated?: boolean
  id?: string | number
  showTo?: number // 1/2 etc in v5
}

export function useComments(
  workflowId?: number,
  processId?: number,
  enabled?: boolean,
) {
  const [data, setData] = useState<CommentItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<any>(null)

  const refetch = useCallback(async () => {
    if (!workflowId || !processId) return
    setIsLoading(true)
    setError(null)

    try {
      // v5: workflow.getProcessComments(workflowId, processId) :contentReference[oaicite:4]{index=4}
      const res = await (requestApi as any).getProcessComments(
        workflowId,
        processId,
      )
      const payload = res.length > 0 ? res : []
      setData(Array.isArray(payload) ? payload : [])
    } catch (e) {
      setError(e)
      setData([])
    } finally {
      setIsLoading(false)
    }
  }, [workflowId, processId])

  useEffect(() => {
    if (!enabled) return
    refetch()
  }, [enabled, refetch])

  return { data, error, isLoading, refetch }
}
