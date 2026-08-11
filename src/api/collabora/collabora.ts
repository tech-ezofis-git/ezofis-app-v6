import axios from 'axios'

/**
 * Talks to the shared Collabora/WOPI host (a separate service from the V6
 * backend) — no bearer auth, no V6 base URL, no request/response encryption.
 */
const COLLABORA_API_URL = String(
  import.meta.env?.VITE_COLLABORA_API_URL || '',
).replace(/\/$/, '')

/**
 * Host used to build WOPISrc — fetched by the Collabora Online server
 * itself, not the browser. In local dev, Collabora usually runs in Docker,
 * where "localhost" resolves to the container, not the host machine, so
 * this must point at host.docker.internal instead of VITE_COLLABORA_API_URL.
 * In production both are the same public URL, so this var is optional and
 * falls back to VITE_COLLABORA_API_URL.
 */
const COLLABORA_WOPI_HOST_URL = String(
  import.meta.env?.VITE_COLLABORA_WOPI_HOST_URL || COLLABORA_API_URL,
).replace(/\/$/, '')

const COLLABORA_VIEWER_URL_RAW = String(
  import.meta.env?.VITE_COLLABORA_VIEWER_URL || '',
)

const collaboraAxios = axios.create({
  baseURL: COLLABORA_API_URL,
})

/** Guards against the legacy bug where the viewer URL was missing its scheme. */
const withScheme = (url: string) => {
  if (!url) return url
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

export interface CollaboraUploadResult {
  fileId: string
  token: string
}

export const uploadDocumentToCollabora = async (
  blob: Blob,
  fileName: string,
): Promise<CollaboraUploadResult> => {
  const formData = new FormData()
  formData.append('document', blob, fileName)

  const { data } = await collaboraAxios.post('/upload', formData)

  return {
    fileId: String(data.fileId),
    token: String(data.token),
  }
}

export const buildWopiSrc = (fileId: string) =>
  `${COLLABORA_WOPI_HOST_URL}/wopi/files/${fileId}`

export const buildViewerUrl = ({
  accessToken,
  wopiSrc,
}: {
  accessToken: string
  wopiSrc: string
}) => {
  const viewerUrl = withScheme(COLLABORA_VIEWER_URL_RAW)
  return `${viewerUrl}?WOPISrc=${encodeURIComponent(wopiSrc)}&access_token=${encodeURIComponent(
    accessToken,
  )}&ui=compact&permission=edit`
}

export const downloadEditedDocument = async (
  fileId: string,
  fileType: string,
): Promise<Blob> => {
  const isPdf = String(fileType || '').toLowerCase() === 'pdf'
  const primaryPath = isPdf
    ? `/files/${fileId}/pdf`
    : `/wopi/files/${fileId}/contents`
  const fallbackPath = `/wopi/files/${fileId}/contents`

  // eslint-disable-next-line no-console
  console.log('[collabora-debug] GET', primaryPath, 'from collaboraAxios baseURL:', COLLABORA_API_URL)
  try {
    const { data } = await collaboraAxios.get(primaryPath, { responseType: 'blob' })
    // eslint-disable-next-line no-console
    console.log('[collabora-debug] GET', primaryPath, 'success, blob size:', data?.size)
    return data
  } catch (err) {
    if (primaryPath !== fallbackPath) {
      // eslint-disable-next-line no-console
      console.warn('[collabora-debug] GET', primaryPath, 'failed, trying fallback:', fallbackPath)
      const { data } = await collaboraAxios.get(fallbackPath, { responseType: 'blob' })
      // eslint-disable-next-line no-console
      console.log('[collabora-debug] GET fallback', fallbackPath, 'success, blob size:', data?.size)
      return data
    }
    throw err
  }
}
