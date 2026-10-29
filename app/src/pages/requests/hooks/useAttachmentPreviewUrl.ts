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

// A file chosen on this device has no server content type yet. Without one,
// the preview must not assume PDF, or an uploaded email (.eml) would first open
// in the PDF viewer and only switch to the email viewer once the server copy
// arrives - a second load.
const guessMimeFromName = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  const byExtension: Record<string, string> = {
    eml: 'message/rfc822',
    gif: 'image/gif',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    msg: 'application/vnd.ms-outlook',
    png: 'image/png',
    webp: 'image/webp',
  }
  return byExtension[ext] ?? 'application/pdf'
}

const normalizeFileName = (name: string | undefined): string =>
  String(name ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, '')

// The server copy of an uploaded file keeps its name (possibly cleaned up), so
// a different name means a different file, such as a generated quote PDF that
// arrives later on the same request.
const isSameFileName = (a: string, b: string): boolean => {
  const first = normalizeFileName(a)
  const second = normalizeFileName(b)
  if (!first || !second) return true
  return first === second || first.includes(second) || second.includes(first)
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
  options?: {
    /**
     * A request that starts from an uploaded file first shows that local file;
     * its server copy arrives later. With this on, the file already on screen
     * stays (no second download, no viewer rebuild) until it is turned off,
     * for example when the user opens a different attachment.
     */
    keepLocalPreview?: boolean
    /** Identifies the open request; the kept file is dropped when it changes. */
    requestKey?: string
  },
) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [mimeType, setMimeType] = useState<string | null>(null)
  const rawLocalUrl = file?._localFileUrl || file?.localUrl || ''
  const rawRepoId = String(
    file?.repositoryId || fallbackRepositoryId || '',
  ).trim()
  const rawItemId = String(file?.itemId || file?.id || '').trim()
  const rawContentType = file?.type || file?.contentType || ''
  const rawLegacyFileId = file?.id

  // Remember the uploaded (local) file while it is the one on screen. When the
  // server copy of the same request replaces it, reuse the remembered values so
  // the preview key does not change and nothing reloads.
  const keptRef = useRef<{
    contentType: string
    fileName: string
    itemId: string
    legacyFileId: typeof rawLegacyFileId
    localUrl: string
    repoId: string
    requestKey: string
  } | null>(null)
  const requestKey = options?.requestKey ?? ''
  const localFileName = String(file?.fileName || file?.name || '')
  if (!options?.keepLocalPreview) {
    keptRef.current = null
  } else if (keptRef.current && keptRef.current.requestKey !== requestKey) {
    keptRef.current = null
  }
  if (options?.keepLocalPreview && rawLocalUrl) {
    keptRef.current = {
      contentType: rawContentType,
      fileName: localFileName,
      itemId: rawItemId,
      legacyFileId: rawLegacyFileId,
      localUrl: rawLocalUrl,
      repoId: rawRepoId,
      requestKey,
    }
  }
  const kept =
    !rawLocalUrl &&
    rawItemId &&
    keptRef.current &&
    isSameFileName(keptRef.current.fileName, localFileName)
      ? keptRef.current
      : null

  const localUrl = kept ? kept.localUrl : rawLocalUrl
  const repoId = kept ? kept.repoId : rawRepoId
  const itemId = kept ? kept.itemId : rawItemId
  const contentType = kept ? kept.contentType : rawContentType
  const legacyFileId = kept ? kept.legacyFileId : rawLegacyFileId
  // The key names the file, not its description. Details such as the content
  // type or a legacy id can arrive after the request opens (when the
  // attachment list loads) and must not trigger a second download of the same
  // file.
  const fetchKey = localUrl
    ? `local:${localUrl}`
    : isUuid(repoId) && isUuid(itemId)
      ? `${repoId}|${itemId}`
      : `${repoId}|${itemId}|${String(legacyFileId ?? '')}`
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
        setMimeType(contentType || guessMimeFromName(localFileName))
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
  }, [fetchKey])

  // A file on this device is ready at once; there is nothing to download.
  if (localUrl) {
    return {
      isLoading: false,
      mimeType: contentType || guessMimeFromName(localFileName),
      previewUrl: localUrl,
    }
  }

  const isCurrent = readyKey === fetchKey
  return {
    isLoading: canLoad && !isCurrent,
    mimeType: isCurrent ? mimeType : null,
    previewUrl: isCurrent ? previewUrl : null,
  }
}
