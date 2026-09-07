// @/pages/requests/hooks/useAttachmentPreviewUrl.ts
import { useEffect, useRef, useState } from 'react'
import fileApi from '@/api/file/file'
import authUserStore from '@/stores/authUserStore'
import type { AttachmentItem } from './useAttachments'

type PreviewableAttachment = AttachmentItem & {
  _localFileUrl?: string
  localUrl?: string
  type?: string
}

const isUuid = (val: string | number | undefined | null): boolean => {
  if (typeof val !== 'string') return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    val,
  )
}

const getMimeTypeFromBase64 = (base64: string): string => {
  if (base64.startsWith('/9j/')) return 'image/jpeg'
  if (base64.startsWith('iVBORw0KGgo')) return 'image/png'
  return 'application/pdf'
}

const formatBase64Url = (base64: string, mimeType: string): string => {
  return base64.startsWith('data:')
    ? base64
    : `data:${mimeType};base64,${base64}`
}

const fetchV6Binary = async (repoId: string, itemId: string) => {
  const response = await fileApi.viewBinaryV6(repoId, itemId)
  if (response?.data instanceof Blob) {
    const mimeType = response.data.type || 'application/pdf'
    const url = URL.createObjectURL(response.data)
    return { isBlob: true, mimeType, url }
  }
  return null
}

const fetchLegacyBinary = async (
  repoId: string,
  itemId: string,
  tenantId: string | number | undefined,
  userId: string | number | undefined,
  selectedFileId: string | number | undefined,
) => {
  const rId = Number(repoId)
  if (!Number.isNaN(rId) && rId > 0) {
    const tId = tenantId ? Number(tenantId) : 2
    const uId = userId ? String(userId) : '2'
    const response = await fileApi.viewBinary(
      tId,
      uId,
      rId,
      Number(itemId || selectedFileId || 0),
      2,
    )

    const base64 = response?.data?.file || response?.data
    if (typeof base64 === 'string') {
      const mimeType = getMimeTypeFromBase64(base64)
      const url = formatBase64Url(base64, mimeType)
      return { isBlob: false, mimeType, url }
    }
  }
  return null
}

/**
 * Resolves a previewable URL + mime type for an attachment, covering both the
 * V6 (UUID repo/item id, blob response) and legacy (numeric repo id,
 * base64 response) binary endpoints. Shared by the AP and generic request
 * overview screens so the fetch/blob-cleanup logic lives in one place.
 */
export function useAttachmentPreviewUrl(
  file: PreviewableAttachment | null,
  fallbackRepositoryId?: string | number,
) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [mimeType, setMimeType] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const lastFetchedRef = useRef<{ itemId: string; repoId: string } | null>(null)

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      setMimeType(null)
      setIsLoading(false)
      lastFetchedRef.current = null
      return
    }

    let activeUrl: string | null = null
    const { session } = authUserStore.getState()
    const tenantId = session?.tenantId
    const userId = session?.id

    const fetchFile = async () => {
      const localUrl = file._localFileUrl || file.localUrl
      if (localUrl) {
        setPreviewUrl(localUrl)
        setMimeType(file.type || file.contentType || 'application/pdf')
        setIsLoading(false)
        return
      }

      const repoId = String(
        file.repositoryId || fallbackRepositoryId || '',
      ).trim()
      const itemId = String(file.itemId || file.id || '').trim()

      if (
        !repoId ||
        !itemId ||
        repoId === 'undefined' ||
        itemId === 'undefined'
      ) {
        setPreviewUrl(null)
        setMimeType(null)
        return
      }

      if (
        lastFetchedRef.current?.repoId === repoId &&
        lastFetchedRef.current?.itemId === itemId
      ) {
        return
      }
      lastFetchedRef.current = { itemId, repoId }

      setIsLoading(true)
      try {
        const res =
          isUuid(repoId) && isUuid(itemId)
            ? await fetchV6Binary(repoId, itemId)
            : await fetchLegacyBinary(repoId, itemId, tenantId, userId, file.id)

        if (res) {
          if (res.isBlob) activeUrl = res.url
          setPreviewUrl(res.url)
          setMimeType(res.mimeType)
        } else {
          setPreviewUrl(null)
          setMimeType(null)
        }
      } catch (error) {
        console.error('Error fetching attachment preview:', error)
        lastFetchedRef.current = null
        setPreviewUrl(null)
        setMimeType(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchFile()

    return () => {
      if (activeUrl) URL.revokeObjectURL(activeUrl)
    }
  }, [file, fallbackRepositoryId])

  return { isLoading, mimeType, previewUrl }
}
