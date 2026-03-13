// @/pages/requests/hooks/useAttachments.ts
import { useCallback, useEffect, useState } from 'react'
import requestApi from '@/api/requests/requests'

export type AttachmentItem = {
  createdAt?: string
  createdByEmail?: string
  fileId?: number | string

  fileName?: string
  id?: number | string

  // Vue had "initiate" for upload-and-index initiated files
  initiate?: boolean
  itemId?: number | string
  name?: string
  repositoryId?: number | string

  stageName?: string
}

export function useAttachments(
  workflowId?: number,
  processId?: number,
  enabled?: boolean,
) {
  const [data, setData] = useState<AttachmentItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<any>(null)

  const refetch = useCallback(async () => {
    if (!workflowId || !processId) return
    setIsLoading(true)
    setError(null)

    try {
      // v5: workflow.getAttachments(workflowId, processId) :contentReference[oaicite:3]{index=3}
      // v6: you mentioned same API names inside requestApi
      const res = await (requestApi as any).getAttachments(
        workflowId,
        processId,
      )

      const payload = res.length > 0 ? res : []
      console.log(payload)
      const list: AttachmentItem[] = Array.isArray(payload) ? payload : []

      // Make sure UI always has id + name fields even if backend uses fileId/fileName
      const normalized = list.map((x) => ({
        ...x,
        id: normalizeId(x),
        name: normalizeName(x),
      }))

      setData(normalized)
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
function normalizeId(a: AttachmentItem) {
  return a.id ?? a.itemId ?? a.fileId ?? ''
}

function normalizeName(a: AttachmentItem) {
  return a.name ?? a.fileName ?? '-'
}
