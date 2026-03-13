// @/pages/requests/hooks/useHistory.ts
import { useCallback, useEffect, useState } from 'react'
import requestApi from '@/api/requests/requests'

export type HistoryRow = {
  action?: string
  actionAt?: string
  actionStatus?: number
  actionUser?: string
  actionUserEmail?: string
  activityId?: string | number
  requestNo?: string
  stage?: string
  status?: string
  subWorkflowHistory?: any
}

export function useHistory(
  workflowId?: number,
  processId?: number,
  enabled?: boolean,
) {
  const [data, setData] = useState<HistoryRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<any>(null)

  const refetch = useCallback(async () => {
    if (!workflowId || !processId) return
    setIsLoading(true)
    setError(null)

    try {
      // v5: workflow.processHistory(workflowId, processId) :contentReference[oaicite:9]{index=9}
      const res = await (requestApi as any).processHistory(
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
