// @/pages/requests/hooks/useAttachments.ts
import { useCallback, useEffect, useState } from 'react'
import { workflowsApiV6 } from '@/api/v6/workflows'

export type AttachmentItem = {
  createdAt?: string
  createdByEmail?: string
  fileId?: number | string

  fileName?: string
  id?: number | string

  initiate?: boolean
  itemId?: number | string
  name?: string
  repositoryId?: number | string

  stageName?: string
}

export function useAttachments(
  workflowId?: number | string,
  instanceId?: number | string,
  enabled?: boolean,
) {
  const [data, setData] = useState<AttachmentItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<any>(null)

  const refetch = useCallback(async () => {
    if (!workflowId || !instanceId) return
    setIsLoading(true)
    setError(null)

    try {
      const res = await workflowsApiV6.getInstanceAttachments(
        workflowId,
        instanceId,
      )
      if (res.error) {
        throw new Error(res.error)
      }

      const list = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.attachments)
          ? res.data.attachments
          : Array.isArray(res.data?.items)
            ? res.data.items
            : []

      const normalized = list.map((x: any) => ({
        ...x,
        id: x.id ?? x.itemId ?? x.fileId ?? '',
        name: x.name ?? x.fileName ?? '-',
        createdAt: x.createdAt ?? x.createdAtUtc ?? x.occurredAtUtc ?? '',
      }))

      setData(normalized)
    } catch (e) {
      console.error('Error fetching V6 instance attachments:', e)
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
