// @/pages/requests/hooks/useHistory.ts
import { useCallback, useEffect, useState } from 'react'
import { workflowsApiV6 } from '@/api/v6/workflows'

export type HistoryRow = {
  action?: string
  actionAt?: string | number | Date | null
  actionStatus?: number
  actionUser?: string | null
  actionUserEmail?: string | null
  activityId?: string | number
  agentResponse?: string | null
  agentType?: string | null
  description?: string
  performedByUserName?: string
  processedBy?: string | null
  processedOn?: string | number | Date | null
  receivedOn?: string | number | Date | null
  review?: string

  stage?: string
  stageName?: string
  stageType?: string
  status?: string
  subWorkflowHistory?: any
  // V6 Real-time properties
  title?: string
}

export function useHistory(
  workflowId?: number | string,
  instanceId?: number | string,
  enabled?: boolean,
) {
  const [data, setData] = useState<HistoryRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<any>(null)

  const refetch = useCallback(async () => {
    if (!workflowId || !instanceId) return
    setIsLoading(true)
    setError(null)

    try {
      const res = await workflowsApiV6.getInstanceHistory(
        workflowId,
        instanceId,
      )
      if (res.error) {
        throw new Error(res.error)
      }

      const list =
        res.data && Array.isArray(res.data.flows)
          ? res.data.flows
          : Array.isArray(res.data)
            ? res.data
            : []
      const mapped: HistoryRow[] = list.map((item: any, idx: number) => {
        const milestoneLower = String(
          item.milestone || item.stageType || item.step || '',
        ).toLowerCase()

        let stage = item.stageName || item.step || ''
        let status = item.review || item.milestone || item.step || ''
        let agentType = undefined

        if (milestoneLower === 'submitted' || milestoneLower === 'start') {
          stage = 'start'
          status = 'ingested'
        } else if (milestoneLower === 'ap_agent') {
          stage = 'ocr'
          status = 'extraction'
          agentType = 'ocr'
        } else if (milestoneLower === 'verified') {
          stage = 'validate'
          status = 'verified'
        } else if (milestoneLower === 'approved') {
          stage = 'Approval'
          status = 'approved'
        } else if (milestoneLower === 'completed') {
          stage = 'Completed'
          status = ''
        }

        const isApAgentNode =
          milestoneLower === 'ap_agent' ||
          milestoneLower === 'ocr' ||
          String(item.stageType || '').toLowerCase() === 'ap_agent'

        const rawActor = item.performedByUserName || item.modifiedByName || item.createdByName || ''
        const user = (isApAgentNode && rawActor === 'pilot@ezofis.com') ? 'AI Agent' : rawActor

        return {
          action: item.action || item.step || '',
          actionAt: item.occurredAtUtc || null,
          actionStatus: item.actionStatus ?? 1,
          actionUser: user || null,
          actionUserEmail: user || null,
          activityId: item.activityId || `v6-step-${idx}`,
          agentType,
          description: item.description || '',
          performedByUserName: user,
          processedBy: user || null,
          processedOn: item.occurredAtUtc || null,
          receivedOn: item.occurredAtUtc || null,
          review: item.review || '',
          stage,
          stageName: item.stageName || '',
          stageType: item.stageType || '',
          status,
          title: item.title || '',
        }
      })

      setData(mapped)
    } catch (e) {
      console.error('Error fetching V6 instance history:', e)
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
