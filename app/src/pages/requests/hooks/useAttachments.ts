// @/pages/requests/hooks/useAttachments.ts
import { useCallback, useEffect, useState } from 'react'
import { workflowsApiV6 } from '@/api/v6/workflows'

export type AttachmentItem = {
  contentType?: string
  createdAt?: string
  createdAtUtc?: string

  createdBy?: string
  createdByEmail?: string

  createdByName?: string
  fileId?: number | string
  fileName?: string
  filePath?: string

  fileSize?: number
  id?: number | string
  initiate?: boolean
  isAiMatch?: boolean
  itemId?: number | string
  name?: string
  repositoryId?: number | string
  stageName?: string
  uploadedBy?: string
}

const normalizeList = (list: any[]) =>
  list.map((x: any) => ({
    ...x,
    createdAt: x.createdAt ?? x.createdAtUtc ?? x.occurredAtUtc ?? '',
    id: x.id ?? x.itemId ?? x.fileId ?? '',
    name: x.name ?? x.fileName ?? '-',
    uploadedBy:
      x.uploadedBy ?? x.createdByName ?? x.createdByEmail ?? x.createdBy ?? '',
  }))

export function useAttachments(
  workflowId?: number | string,
  instanceId?: number | string,
  enabled?: boolean,
  initialData?: any[],
) {
  const [data, setData] = useState<AttachmentItem[]>(() =>
    initialData ? normalizeList(initialData) : [],
  )
  const [isLoading, setIsLoading] = useState(() => {
    return enabled !== false && !!workflowId && !!instanceId
  })
  const [error, setError] = useState<any>(null)

  useEffect(() => {
    if (initialData) {
      setData((prev) => {
        if (prev.length !== initialData.length)
          return normalizeList(initialData)
        // simple ID check
        const prevIds = prev.map((x) => x.id).join(',')
        const newIds = initialData
          .map((x: any) => x.id ?? x.itemId ?? x.fileId ?? '')
          .join(',')
        if (prevIds !== newIds) return normalizeList(initialData)
        return prev
      })
    }
  }, [initialData])

  const refetch = useCallback(async () => {
    const defaultData = initialData ? normalizeList(initialData) : []
    if (!workflowId || !instanceId) {
      setData(defaultData)
      setIsLoading(false)
      return
    }
    setData(defaultData) // Show initial data immediately instead of empty array
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

      setData(normalizeList(list))
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
