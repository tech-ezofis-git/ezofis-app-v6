import axios from 'axios'

/**
 * Talks to the shared Collabora/WOPI host (a separate service from the V6
 * backend) — no bearer auth, no V6 base URL, no request/response encryption.
 */
const DEFAULT_COLLABORA_API_URL = 'https://collabora-2wf8.onrender.com'
const DEFAULT_COLLABORA_VIEWER_URL =
  'https://ez-officeviewer-app.graycoast-78e47e4a.southindia.azurecontainerapps.io/browser/dist/cool.html'

const COLLABORA_API_URL = (
  String(import.meta.env?.VITE_COLLABORA_API_URL || '').trim() ||
  DEFAULT_COLLABORA_API_URL
).replace(/\/$/, '')

/**
 * Host used to build WOPISrc — fetched by the Collabora Online server
 * itself, not the browser. In local dev, Collabora usually runs in Docker,
 * where "localhost" resolves to the container, not the host machine, so
 * this must point at host.docker.internal instead of VITE_COLLABORA_API_URL.
 * In production both are the same public URL, so this var is optional and
 * falls back to VITE_COLLABORA_API_URL.
 */
const COLLABORA_WOPI_HOST_URL = (
  String(import.meta.env?.VITE_COLLABORA_WOPI_HOST_URL || '').trim() ||
  COLLABORA_API_URL
).replace(/\/$/, '')

const COLLABORA_VIEWER_URL_RAW =
  String(import.meta.env?.VITE_COLLABORA_VIEWER_URL || '').trim() ||
  DEFAULT_COLLABORA_VIEWER_URL

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
  const lower = fileName.toLowerCase()
  const mimeType = lower.endsWith('.docx')
    ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    : lower.endsWith('.doc')
      ? 'application/msword'
      : lower.endsWith('.xlsx')
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : lower.endsWith('.xls')
          ? 'application/vnd.ms-excel'
          : lower.endsWith('.pptx')
            ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
            : lower.endsWith('.ppt')
              ? 'application/vnd.ms-powerpoint'
              : lower.endsWith('.csv')
                ? 'text/csv'
                : lower.endsWith('.rtf')
                  ? 'application/rtf'
                  : blob.type || 'application/octet-stream'

  const typedBlob =
    blob.type && blob.type === mimeType
      ? blob
      : new Blob([blob], { type: mimeType })
  const formData = new FormData()
  formData.append('document', typedBlob, fileName)

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
  permission = 'readonly',
  ui = 'compact',
  postMessageOrigin,
}: {
  accessToken?: string
  wopiSrc: string
  permission?: 'edit' | 'readonly'
  ui?: 'classic' | 'compact'
  postMessageOrigin?: string
}) => {
  const viewerUrl = withScheme(COLLABORA_VIEWER_URL_RAW)
  let url = `${viewerUrl}?WOPISrc=${encodeURIComponent(wopiSrc)}&ui=${ui}&permission=${permission}`
  if (accessToken) {
    url += `&access_token=${encodeURIComponent(accessToken)}`
  }
  const origin =
    postMessageOrigin ||
    (typeof window !== 'undefined' ? window.location.origin : '')
  if (origin) {
    url += `&PostMessageOrigin=${encodeURIComponent(origin)}`
  }
  return url
}

export const downloadEditedDocument = async (
  fileId: string,
  fileType: string,
): Promise<Blob> => {
  const isPdf = String(fileType || '').toLowerCase() === 'pdf'

  if (!isPdf) {
    const { data } = await collaboraAxios.get(
      `/wopi/files/${fileId}/contents`,
      {
        responseType: 'blob',
      },
    )
    return data
  }

  const { data } = await collaboraAxios.get(`/files/${fileId}/pdf`, {
    responseType: 'blob',
  })
  return data
}

export const fetchUpdatedPdfBlob = async (
  fileId: string,
  minVersion: number,
  attempts = 12,
): Promise<{ blob: Blob; version: number }> => {
  for (let i = 0; i < attempts; i++) {
    const { data } = await collaboraAxios.get(`/files/${fileId}/pdf-base64`)
    if (data.version > minVersion) {
      const bytes = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0))
      return {
        blob: new Blob([bytes], { type: 'application/pdf' }),
        version: data.version,
      }
    }
    await new Promise((r) => setTimeout(r, 1500))
  }
  throw new Error('Updated PDF did not appear in time')
}
