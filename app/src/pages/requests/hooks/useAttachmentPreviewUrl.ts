// @/pages/requests/hooks/useAttachmentPreviewUrl.ts
import { useEffect, useState } from 'react'
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
  const localUrl = file?._localFileUrl || file?.localUrl || ''
  const repoId = String(file?.repositoryId || fallbackRepositoryId || '').trim()
  const itemId = String(file?.itemId || file?.id || '').trim()
  const contentType = file?.type || file?.contentType || ''
  const legacyFileId = file?.id
  const fetchKey = `${localUrl}|${repoId}|${itemId}|${String(legacyFileId ?? '')}|${contentType}`
  const canLoad = Boolean(
    localUrl ||
    (repoId && itemId && repoId !== 'undefined' && itemId !== 'undefined'),
  )
  const [readyKey, setReadyKey] = useState('')

  useEffect(() => {
    if (!localUrl && !repoId && !itemId) {
      setPreviewUrl(null)
      setMimeType(null)
      setReadyKey(fetchKey)
      return
    }

    let cancelled = false
    let activeUrl: string | null = null
    const { session } = authUserStore.getState()
    const tenantId = session?.tenantId
    const userId = session?.id

    const fetchFile = async () => {
      if (localUrl) {
        setPreviewUrl(localUrl)
        setMimeType(contentType || 'application/pdf')
        setReadyKey(fetchKey)
        return
      }

      if (
        !repoId ||
        !itemId ||
        repoId === 'undefined' ||
        itemId === 'undefined'
      ) {
        setPreviewUrl(null)
        setMimeType(null)
        setReadyKey(fetchKey)
        return
      }

      try {
        const res =
          isUuid(repoId) && isUuid(itemId)
            ? await fetchV6Binary(repoId, itemId)
            : await fetchLegacyBinary(
                repoId,
                itemId,
                tenantId,
                userId,
                legacyFileId,
              )

        if (cancelled) {
          if (res?.isBlob) URL.revokeObjectURL(res.url)
          return
        }

        if (res) {
          if (res.isBlob) activeUrl = res.url
          setPreviewUrl(res.url)
          setMimeType(res.mimeType)
        } else {
          setPreviewUrl(null)
          setMimeType(null)
        }
      } catch (error) {
        if (cancelled) return
        console.error('Error fetching attachment preview:', error)
        setPreviewUrl(null)
        setMimeType(null)
      } finally {
        if (!cancelled) setReadyKey(fetchKey)
      }
    }

    fetchFile()

    return () => {
      cancelled = true
      if (activeUrl) URL.revokeObjectURL(activeUrl)
    }
    // Reload only when the file identity changes. A new attachment object
    // on each parent render must not revoke the blob and flash the viewer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentType, fetchKey, itemId, legacyFileId, localUrl, repoId])

  const isCurrent = readyKey === fetchKey
  return {
    isLoading: canLoad && !isCurrent,
    mimeType: isCurrent ? mimeType : null,
    previewUrl: isCurrent ? previewUrl : null,
  }
}
